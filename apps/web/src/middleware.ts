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
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

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
    return NextResponse.next()
  }

  // All other routes - allow
  return NextResponse.next()
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
