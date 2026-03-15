import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requireLivePermission, requireFeature } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction, AuditVaultEventType } from '@docuroute/types'
import { validationError, notFound, forbidden } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { updatePermissionsSchema } from '@/lib/validations/role'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/roles/[id]/permissions
 *
 * Shortcut for updating only the permissions array of a custom role.
 * Same feature gate + validation as PATCH /api/roles/[id].
 *
 * Feature gate: REQUIRED (customRoles feature must be enabled)
 * Permission required: MANAGE_CUSTOM_ROLES (live check)
 *
 * Body: { permissions: Permission[] }
 *
 * Validation:
 * - role must belong to this companyId (otherwise 404)
 * - role.isSystemRole must be false (cannot edit system roles)
 * - permissions must not include PLATFORM_ADMIN_ACCESS or EMERGENCY_TRANSFER
 *
 * Audit:
 * - AuditLog: CUSTOM_ROLE_UPDATED
 * - AuditVaultEntry: CUSTOM_ROLE_PERMISSION_CHANGE (action: 'UPDATED')
 */
export const PATCH = withApiHandler(async (req: NextRequest, context: RouteContext) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Feature gate FIRST
  await requireFeature(session.user.companyId, 'customRoles')

  // Live permission check
  await requireLivePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_CUSTOM_ROLES],
    'update role permissions',
    req.headers.get('x-forwarded-for') || req.ip || undefined,
    req.headers.get('user-agent') || undefined
  )

  const { id } = await context.params

  const prisma = getPrismaForCompany(session.user.companyId)

  // Fetch the role
  const existingRole = await prisma.role.findFirst({
    where: {
      id,
      companyId: session.user.companyId,
    },
  })

  if (!existingRole) {
    // Cross-company resource request: return 404 not 403
    throw notFound('Role')
  }

  // Cannot edit system roles
  if (existingRole.isSystemRole) {
    throw forbidden('edit system role permissions')
  }

  // Parse and validate request body
  const body = await req.json()
  const validationResult = updatePermissionsSchema.safeParse(body)

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0]
    throw validationError(firstError.path.join('.'), firstError.message)
  }

  const { permissions } = validationResult.data

  // Store previous state for audit
  const previousPermissions = existingRole.permissions as Permission[]

  // Update the role
  const updatedRole = await prisma.role.update({
    where: { id },
    data: {
      permissions: permissions as string[],
    },
  })

  // Write AuditLog
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.CUSTOM_ROLE_UPDATED,
    resourceType: 'Role',
    resourceId: updatedRole.id,
    ipAddress: req.headers.get('x-forwarded-for') || req.ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.MANAGE_CUSTOM_ROLES],
    metadata: {
      roleName: updatedRole.name,
      changes: {
        permissions: { from: previousPermissions, to: permissions },
      },
    },
  })

  // Write AuditVaultEntry
  await writeVaultEntry({
    companyId: session.user.companyId,
    eventType: AuditVaultEventType.CUSTOM_ROLE_PERMISSION_CHANGE,
    userId: session.user.id,
    userEmail: session.user.email || 'unknown',
    ipAddress: req.headers.get('x-forwarded-for') || req.ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.MANAGE_CUSTOM_ROLES],
    metadata: {
      action: 'UPDATED',
      roleName: updatedRole.name,
      roleId: updatedRole.id,
      previousPermissions,
      newPermissions: permissions,
    },
  })

  return new Response(
    JSON.stringify({
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.permissions,
        updatedAt: updatedRole.updatedAt.toISOString(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
