'use client'

import { ReactNode } from 'react'
import { Permission } from '@docuroute/types'
import { usePermissions } from '@/hooks/use-permissions'

/**
 * PermissionGate component
 *
 * Conditionally renders children based on user permissions.
 *
 * IMPORTANT: For UI display only. Server-side checks are mandatory and separate.
 * Never use this to hide sensitive data — only to hide UI elements.
 * All API endpoints must perform their own permission checks using requirePermission
 * or requireLivePermission.
 *
 * Props:
 * - requiredPermissions: Permission[] - Permissions to check
 * - children: ReactNode - Content to show if user has permission
 * - fallback?: ReactNode - Content to show if user lacks permission (optional)
 * - requireAll?: boolean - If true, user must have ALL listed permissions (AND logic)
 *                          If false, user needs at least ONE permission (OR logic)
 *                          Default: false (OR logic)
 *
 * Usage:
 * ```tsx
 * // Show button only if user has upload permission
 * <PermissionGate requiredPermissions={[Permission.UPLOAD_DOCUMENT]}>
 *   <Button>Upload Document</Button>
 * </PermissionGate>
 *
 * // Show button only if user has ALL listed permissions
 * <PermissionGate
 *   requiredPermissions={[Permission.DELETE_DOCUMENT, Permission.HARD_PURGE_DOCUMENT]}
 *   requireAll
 * >
 *   <Button>Hard Purge</Button>
 * </PermissionGate>
 *
 * // Show fallback if user lacks permission
 * <PermissionGate
 *   requiredPermissions={[Permission.VIEW_AUDIT_LOG]}
 *   fallback={<div>You need auditor access to view logs.</div>}
 * >
 *   <AuditLogTable />
 * </PermissionGate>
 * ```
 */
interface PermissionGateProps {
  requiredPermissions: Permission[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
}

export function PermissionGate({
  requiredPermissions,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGateProps) {
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions()

  // While loading, don't show anything (prevents flashing content)
  if (isLoading) {
    return null
  }

  // Check permissions based on requireAll flag
  const hasPermission = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions)

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
