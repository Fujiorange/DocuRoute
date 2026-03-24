/**
 * Middleware for route protection in DocuRoute.
 *
 * Protects:
 * - /dashboard/* → redirect to /login if no session
 * - /api/* → 401 if no session
 *
 * Exceptions (public routes):
 * - /api/auth/* (NextAuth endpoints)
 * - /api/health (Render health check)
 * - /api/documents/*/verify (public QR field scanning)
 * - /verify/* (public QR verification pages)
 * - /acknowledge/* (public transmittal acknowledgment)
 *
 * Authorization: Bearer dr_[key] requests are passed through to API key validation
 * (implemented in Phase 3).
 *
 * ARCHITECTURE CHANGE (2026-03-23):
 * Middleware now resolves permissions from Redis cache based on permissionVersion
 * in JWT. This solves:
 * 1. JWT cookie bloat (JWT reduced from ~1,440 bytes to ~400 bytes)
 * 2. Stale permission problem (permission changes take effect immediately)
 * 3. Scalability (can support 200+ permissions without cookie limit)
 *
 * Permission Resolution Flow:
 * 1. Extract permissionVersion from JWT token
 * 2. Look up cached permissions in Redis using companyId:roleId:version key
 * 3. If cache miss, fall back to database (re-resolve and re-cache)
 * 4. Attach permissions to request headers for API routes to consume
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getCachedPermissions, cachePermissions, getPermissionVersion } from '@docuroute/core/src/permission-cache'
import { resolvePermissions } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes - allow without authentication
  const publicPaths = [
    '/login',
    '/verify-request',
    '/auth/error',
    '/api/auth',
    '/api/health',
    '/verify',
    '/acknowledge',
  ]

  // Check if path starts with any public path
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Special case: /api/documents/*/verify is public (QR field scanning)
  if (pathname.match(/^\/api\/documents\/[^\/]+\/verify$/)) {
    return NextResponse.next()
  }

  // Check for API key authentication (Authorization: Bearer dr_[key])
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer dr_')) {
    // API key authentication - pass to API key validation in API routes
    // (API key validation is implemented in Phase 3)
    return NextResponse.next()
  }

  // Get JWT token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Protect /dashboard/* routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      // Redirect to login with callback
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Resolve permissions from Redis cache for dashboard routes
    // (needed for client-side permission checks)
    if (token.companyId && token.roleId && token.permissionVersion) {
      const permissions = await resolvePermissionsFromCache(
        token.companyId as string,
        token.roleId as string,
        token.permissionVersion as number
      )

      // Attach permissions to response headers for client-side consumption
      const response = NextResponse.next()
      response.headers.set('X-User-Permissions', JSON.stringify(permissions))
      return response
    }

    return NextResponse.next()
  }

  // Protect /api/* routes (except already handled public routes)
  if (pathname.startsWith('/api')) {
    if (!token) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to access this resource',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Resolve permissions from Redis cache for API routes
    if (token.companyId && token.roleId && token.permissionVersion) {
      const permissions = await resolvePermissionsFromCache(
        token.companyId as string,
        token.roleId as string,
        token.permissionVersion as number
      )

      // Attach permissions to request headers for API routes to consume
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('X-User-Permissions', JSON.stringify(permissions))

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    return NextResponse.next()
  }

  // All other routes - allow
  return NextResponse.next()
}

/**
 * Resolve permissions from Redis cache, with version-aware validation
 *
 * CRITICAL FIX: Compare JWT permissionVersion with current version in Redis
 * If mismatch detected, force refresh and log for audit
 *
 * @param companyId - Company ID
 * @param roleId - Role ID
 * @param permissionVersion - Permission version from JWT
 * @returns Array of permission strings
 */
async function resolvePermissionsFromCache(
  companyId: string,
  roleId: string,
  permissionVersion: number
): Promise<string[]> {
  try {
    // Get current version from Redis
    const currentVersion = await getPermissionVersion(companyId, roleId)

    // CRITICAL FIX: Check version mismatch
    if (permissionVersion !== currentVersion) {
      console.warn(
        `Permission version mismatch for role ${roleId}: JWT has v${permissionVersion}, current is v${currentVersion}. Forcing refresh.`
      )

      // Force refresh from database with current version
      const permissions = await resolvePermissions(roleId)

      // Cache with current version
      await cachePermissions(companyId, roleId, permissions, currentVersion)

      // TODO: Log to audit vault for compliance tracking
      // This indicates a user session with stale permissions attempted access

      return permissions
    }

    // Try to get from Redis cache (version matches)
    const cached = await getCachedPermissions(companyId, roleId, permissionVersion)

    if (cached) {
      return cached
    }

    // Cache miss - resolve from database
    console.log(`Permission cache miss for role ${roleId} version ${permissionVersion}, falling back to database`)

    const permissions = await resolvePermissions(roleId)

    // Cache with current version
    await cachePermissions(companyId, roleId, permissions, currentVersion)

    return permissions
  } catch (error) {
    console.error('Failed to resolve permissions from cache:', error)
    // On error, fall back to empty permissions array (fail-safe)
    // API routes will handle authorization checks and return appropriate errors
    return []
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
