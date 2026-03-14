import { prismaAdmin } from '@docuroute/db'
import { Permission, SystemRoleKey, SYSTEM_ROLE_PERMISSIONS } from '@docuroute/types'
import { forbidden, unauthorized, DocuRouteError } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { AuditAction, AuditVaultEventType } from '@docuroute/types'

/**
 * PBAC permission checks. All authorization uses Permission enum.
 * Never check role names directly  always check permissions.
 *
 * Resolution:
 *   role.isSystemRole ’ permissions from SYSTEM_ROLE_PERMISSIONS[role.systemRoleKey]
 *   !role.isSystemRole ’ permissions from role.permissions[] stored in DB
 *
 * TRANSACTION RULE  CRITICAL:
 *   requireLivePermission calls prismaAdmin directly (not via getPrismaForCompany).
 *   This is intentional  permission checks during sensitive operations must
 *   read the live, unfiltered user record.
 *   Comment every prismaAdmin usage in this file.
 *
 * AUTH LIBRARY VERSION:
 *   Uses next-auth stable v4. Never pin to a beta version.
 *   Verify: pnpm list --filter web next-auth ’ must NOT contain "beta".
 */

export type ResolvedUser = {
  userId: string
  companyId: string
  permissions: Permission[]
  systemRoleKey?: SystemRoleKey
  roleName: string
}

/**
 * resolvePermissions
 *
 * Resolves the effective permissions for a role.
 * Uses prismaAdmin: called during session creation, needs to look up Role by ID
 * without companyId filter.
 */
export async function resolvePermissions(roleId: string): Promise<Permission[]> {
  const role = await prismaAdmin.role.findUnique({
    where: { id: roleId },
    select: { isSystemRole: true, systemRoleKey: true, permissions: true },
  })

  if (!role) {
    return []
  }

  if (role.isSystemRole && role.systemRoleKey) {
    const systemKey = role.systemRoleKey as SystemRoleKey
    return SYSTEM_ROLE_PERMISSIONS[systemKey] || []
  }

  return (role.permissions as Permission[]) || []
}

/**
 * requirePermission
 *
 * Throws forbidden() if session does not have ANY of the allowed permissions.
 * Use this for "OR" logic: user needs at least one of the allowed permissions.
 */
export function requirePermission(session: ResolvedUser | null, allowed: Permission[]): void {
  if (!session) {
    throw unauthorized()
  }

  const hasPermission = allowed.some((p) => session.permissions.includes(p))
  if (!hasPermission) {
    throw forbidden(`perform this operation`)
  }
}

/**
 * requirePermissions
 *
 * Throws forbidden() if session is missing ANY of the required permissions.
 * Use this for "AND" logic: user needs all of the required permissions.
 */
export function requirePermissions(session: ResolvedUser | null, required: Permission[]): void {
  if (!session) {
    throw unauthorized()
  }

  const missingPermissions = required.filter((p) => !session.permissions.includes(p))
  if (missingPermissions.length > 0) {
    throw forbidden(`perform this operation`)
  }
}

/**
 * requireLivePermission
 *
 * Fetches live user record and role from DB, validates permissions.
 * Uses prismaAdmin: fetches live user record across all companies for sensitive operations.
 * This prevents JWT tampering and ensures up-to-date permission checks.
 *
 * Throws 401 if user inactive or companyId mismatch (JWT tampering detection).
 * Throws 403 if permission not in allowed set.
 * Logs PERMISSION_DENIED to AuditLog on 403.
 */
export async function requireLivePermission(
  session: ResolvedUser | null,
  allowed: Permission[],
  operation: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  if (!session) {
    throw unauthorized()
  }

  // Uses prismaAdmin: fetches live user record to verify current permissions
  const user = await prismaAdmin.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  })

  if (!user || !user.isActive) {
    throw unauthorized()
  }

  if (user.companyId !== session.companyId) {
    // JWT tampering detected
    throw unauthorized()
  }

  // Resolve live permissions
  const livePermissions = await resolvePermissions(user.roleId)

  // Check permission
  const hasPermission = allowed.some((p) => livePermissions.includes(p))

  if (!hasPermission) {
    // Log permission denial
    await logAuditEvent({
      userId: session.userId,
      companyId: session.companyId,
      action: AuditAction.PERMISSION_DENIED,
      ipAddress,
      userAgent,
      permissionsUsed: allowed,
      metadata: {
        operation,
        allowed,
        actual: livePermissions,
      },
    })

    throw forbidden(operation)
  }
}

/**
 * withApiHandler
 *
 * Wraps API route handlers with error handling.
 * - Catches DocuRouteError and returns appropriate status codes
 * - COMPLIANCE_VIOLATION errors trigger writeVaultEntry before returning
 * - Never exposes stack traces or DB details in response
 */
export function withApiHandler<T>(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error) {
      if (error instanceof DocuRouteError) {
        // If compliance violation, write to vault
        if (error.category === 'COMPLIANCE_VIOLATION') {
          // Extract user info from request (stub - implement session extraction)
          const userId = null // TODO: Extract from session
          const userEmail = 'unknown@example.com' // TODO: Extract from session
          const companyId = 'unknown' // TODO: Extract from session

          await writeVaultEntry({
            companyId,
            eventType: AuditVaultEventType.PERMISSION_DENIED as any,
            userId,
            userEmail,
            metadata: {
              error: error.code,
              message: error.message,
              ...error.metadata,
            },
          })
        }

        return new Response(
          JSON.stringify({
            error: {
              code: error.code,
              message: error.message,
              ...error.metadata,
            },
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Unknown error - log but don't expose
      console.error('Unhandled error in API route:', error)
      return new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
