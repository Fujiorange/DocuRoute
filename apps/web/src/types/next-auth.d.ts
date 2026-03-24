/**
 * Type declarations for NextAuth v4.
 *
 * Extends the default NextAuth types to include DocuRoute-specific fields
 * in the JWT token and session object.
 *
 * ARCHITECTURE CHANGE (2026-03-23):
 * JWT no longer stores full permissions array (was ~902 bytes for 41 permissions).
 * Instead stores permissionVersion number and looks up permissions from Redis cache.
 *
 * JWT payload includes:
 *   userId, companyId, roleId, roleName, isSystemRole, systemRoleKey?,
 *   permissionVersion: number, mfaVerified: boolean
 *
 * Benefits:
 * - JWT size reduced from ~1,440 bytes to ~400 bytes
 * - Can scale to 200+ permissions without cookie limit concerns
 * - Permission revocation takes effect immediately (no stale JWT)
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
      permissions: Permission[] // Resolved from Redis cache in middleware
      permissionVersion: number // Cache version for invalidation
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
    permissionVersion?: number // Permission cache version (not the full array!)
    mfaVerified?: boolean
    email?: string
  }
}
