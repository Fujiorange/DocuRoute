'use client'

import { useSession } from 'next-auth/react'
import { Permission } from '@docuroute/types'

/**
 * usePermissions hook
 *
 * Client-side hook for checking user permissions based on session data.
 *
 * IMPORTANT: For UI display only. Server-side checks are mandatory and separate.
 * Never use this to hide sensitive data — only to hide UI elements.
 *
 * Returns:
 * - permissions: Permission[] - Array of user's permissions
 * - hasPermission(p: Permission): boolean - Check if user has ONE permission
 * - hasAllPermissions(ps: Permission[]): boolean - Check if user has ALL permissions
 * - isLoading: boolean - Whether session is still loading
 *
 * Usage:
 * ```tsx
 * const { hasPermission, hasAllPermissions } = usePermissions()
 *
 * if (hasPermission(Permission.UPLOAD_DOCUMENT)) {
 *   // Show upload button
 * }
 *
 * if (hasAllPermissions([Permission.DELETE_DOCUMENT, Permission.HARD_PURGE_DOCUMENT])) {
 *   // Show hard purge option
 * }
 * ```
 */
export function usePermissions() {
  const { data: session, status } = useSession()

  const permissions = session?.user?.permissions || []
  const isLoading = status === 'loading'

  /**
   * Check if user has at least ONE of the specified permissions (OR logic)
   */
  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission)
  }

  /**
   * Check if user has ALL of the specified permissions (AND logic)
   */
  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.every((p) => permissions.includes(p))
  }

  /**
   * Check if user has ANY of the specified permissions (OR logic)
   */
  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some((p) => permissions.includes(p))
  }

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoading,
  }
}
