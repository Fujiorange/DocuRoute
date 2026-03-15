/**
 * Type declarations for NextAuth v4.
 *
 * Extends the default NextAuth types to include DocuRoute-specific fields
 * in the JWT token and session object.
 *
 * JWT payload includes:
 *   userId, companyId, roleId, roleName, isSystemRole, systemRoleKey?,
 *   permissions: Permission[], mfaVerified: boolean
 */

import { Permission } from '@docuroute/types'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extend the built-in session types with DocuRoute fields
   */
  interface Session {
    user: {
      userId: string
      companyId: string
      roleId: string
      roleName: string
      isSystemRole: boolean
      systemRoleKey?: string
      permissions: Permission[]
      mfaVerified: boolean
      email: string
      name?: string | null
      image?: string | null
    }
  }

  /**
   * Extend the built-in user types (used during sign-in)
   */
  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the default JWT token with DocuRoute fields
   */
  interface JWT {
    userId?: string
    companyId?: string
    roleId?: string
    roleName?: string
    isSystemRole?: boolean
    systemRoleKey?: string
    permissions?: Permission[]
    mfaVerified?: boolean
    email?: string
  }
}
