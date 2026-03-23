/**
 * NextAuth configuration for DocuRoute.
 *
 * IMPORTANT — NextAuth version:
 *   next-auth must be stable v4 (4.24.x).
 *   Verify with: pnpm list --filter web next-auth
 *   Version must start with "4." and must NOT contain "beta".
 *   Do NOT migrate to v5 without a dedicated migration prompt.
 *
 * Strategy: JWT only (not database sessions).
 * For permission revocation to take immediate effect on sensitive operations,
 * requireLivePermission() re-fetches the current user from DB.
 *
 * Provider: Email magic link via Resend.
 *
 * ARCHITECTURE CHANGE (2026-03-23):
 * JWT no longer contains full permissions array (was ~902 bytes for 41 permissions).
 * Instead JWT contains permissionVersion number, and permissions are cached in Redis.
 *
 * JWT payload includes:
 *   userId, companyId, roleId, roleName, isSystemRole, systemRoleKey?,
 *   permissionVersion: number, mfaVerified: boolean
 *
 * Benefits:
 * - JWT size reduced from ~1,440 bytes to ~400 bytes (3.6x smaller)
 * - Can scale to 200+ permissions without cookie limit concerns
 * - Permission changes take effect immediately (Redis cache invalidation)
 * - No more stale permission problem
 */

import NextAuth, { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prismaAdmin } from '@docuroute/db'
import { resolvePermissions } from '@/lib/auth'
import { AuditAction } from '@docuroute/types'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { cachePermissions, getPermissionVersion } from '@docuroute/core/src/permission-cache'

export const authOptions: NextAuthOptions = {
  // Use Prisma adapter for email verification
  // Uses prismaAdmin: auth needs to look up any user by email across all companies
  adapter: PrismaAdapter(prismaAdmin) as any,

  // JWT strategy (not database sessions)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Email magic link provider
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],

  callbacks: {
    /**
     * signIn callback - Block if user is inactive
     * Uses prismaAdmin: auth needs to look up any user by email across all companies
     */
    async signIn({ user }) {
      if (!user?.email) {
        return false
      }

      // Fetch user to check if active
      const dbUser = await prismaAdmin.user.findUnique({
        where: { email: user.email },
        select: { isActive: true },
      })

      if (!dbUser || !dbUser.isActive) {
        return false
      }

      return true
    },

    /**
     * jwt callback - Attach user data to token on sign-in
     * Uses prismaAdmin: auth needs to look up any user by email across all companies
     *
     * ARCHITECTURE CHANGE:
     * Instead of storing permissions array in JWT, we:
     * 1. Resolve permissions from role
     * 2. Get current permission version for role
     * 3. Cache permissions in Redis with version key
     * 4. Store only version number in JWT
     */
    async jwt({ token, user, trigger }) {
      // On sign-in, fetch full user data
      if (user?.email) {
        // Uses prismaAdmin: auth needs to look up user by email across all companies
        const dbUser = await prismaAdmin.user.findUnique({
          where: { email: user.email },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystemRole: true,
                systemRoleKey: true,
              },
            },
          },
        })

        if (dbUser && dbUser.isActive) {
          // Resolve permissions from role
          const permissions = await resolvePermissions(dbUser.roleId)

          // Get current permission version for this role
          const permissionVersion = await getPermissionVersion(dbUser.companyId, dbUser.roleId)

          // Cache permissions in Redis with version key
          await cachePermissions(dbUser.companyId, dbUser.roleId, permissions, permissionVersion)

          // Attach to token (WITHOUT permissions array - only version!)
          token.userId = dbUser.id
          token.companyId = dbUser.companyId
          token.roleId = dbUser.roleId
          token.roleName = dbUser.role.name
          token.isSystemRole = dbUser.role.isSystemRole
          token.systemRoleKey = dbUser.role.systemRoleKey || undefined
          token.permissionVersion = permissionVersion // Store version, not array
          token.mfaVerified = false
          token.email = dbUser.email

          // Log session started
          await logAuditEvent({
            userId: dbUser.id,
            companyId: dbUser.companyId,
            action: AuditAction.SESSION_STARTED,
            metadata: {
              email: dbUser.email,
              roleName: dbUser.role.name,
              permissionVersion,
            },
          })
        }
      }

      return token
    },

    /**
     * session callback - Expose token data to client
     *
     * NOTE: Permissions are NOT included in the session object returned here.
     * Permissions will be resolved from Redis cache in middleware and added
     * to the request context before reaching API routes.
     */
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          userId: token.userId as string,
          companyId: token.companyId as string,
          roleId: token.roleId as string,
          roleName: token.roleName as string,
          isSystemRole: token.isSystemRole as boolean,
          systemRoleKey: token.systemRoleKey as string | undefined,
          permissions: [], // Empty array - will be populated by middleware from Redis
          permissionVersion: token.permissionVersion as number,
          mfaVerified: token.mfaVerified as boolean,
          email: token.email as string,
        }
      }

      return session
    },
  },

  pages: {
    signIn: '/login',
    verifyRequest: '/verify-request',
    error: '/auth/error',
  },

  events: {
    async signOut({ token }) {
      if (token?.userId && token?.companyId) {
        // Log session ended
        await logAuditEvent({
          userId: token.userId as string,
          companyId: token.companyId as string,
          action: AuditAction.SESSION_ENDED,
          metadata: {
            email: token.email as string,
          },
        })
      }
    },
  },

  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
