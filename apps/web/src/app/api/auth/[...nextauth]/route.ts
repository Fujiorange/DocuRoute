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
 * JWT payload includes:
 *   userId, companyId, roleId, roleName, isSystemRole, systemRoleKey?,
 *   permissions: Permission[], mfaVerified: boolean
 *
 * CRITICAL: permissions in JWT may become stale if a role is updated since login.
 * For read operations (view, list): JWT permissions are acceptable.
 * For mutations: requireLivePermission re-fetches and re-checks current state.
 */

import NextAuth, { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prismaAdmin } from '@docuroute/db'
import { resolvePermissions } from '@/lib/auth'
import { AuditAction } from '@docuroute/types'
import { logAuditEvent } from '@docuroute/core/src/audit'

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
          // Resolve permissions
          const permissions = await resolvePermissions(dbUser.roleId)

          // Attach to token
          token.userId = dbUser.id
          token.companyId = dbUser.companyId
          token.roleId = dbUser.roleId
          token.roleName = dbUser.role.name
          token.isSystemRole = dbUser.role.isSystemRole
          token.systemRoleKey = dbUser.role.systemRoleKey || undefined
          token.permissions = permissions
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
            },
          })
        }
      }

      return token
    },

    /**
     * session callback - Expose token data to client
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
          permissions: token.permissions as string[],
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
