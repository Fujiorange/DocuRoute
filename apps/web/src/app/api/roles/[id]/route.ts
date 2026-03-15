import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requireLivePermission, requireFeature } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction, AuditVaultEventType } from '@docuroute/types'
import { validationError, notFound, forbidden } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { updateRoleSchema } from '@/lib/validations/role'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/roles/[id]
 *
 * Updates an existing custom role (name, description, and/or permissions).
 *
 * Feature gate: REQUIRED (customRoles feature must be enabled)
 * Permission required: MANAGE_CUSTOM_ROLES (live check)
 *
 * Validation:
 * - role must belong to this companyId (otherwise 404)
 * - role.isSystemRole must be false (cannot edit system roles)
 * - permissions must not include PLATFORM_ADMIN_ACCESS or EMERGENCY_TRANSFER
 * - if changing name, new name must be unique within company
 *
 * Audit:
 * - AuditLog: CUSTOM_ROLE_UPDATED
 * - AuditVaultEntry: CUSTOM_ROLE_PERMISSION_CHANGE (action: 'UPDATED')
 *
 * Note: Users with this roleId see updated permissions at their NEXT login.
 * requireLivePermission handles immediate enforcement for sensitive operations.
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
    'update custom role',
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
    throw forbidden('edit system roles')
  }

  // Parse and validate request body
  const body = await req.json()
  const validationResult = updateRoleSchema.safeParse(body)

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0]
    throw validationError(firstError.path.join('.'), firstError.message)
  }

  const { name, description, permissions } = validationResult.data

  // If changing name, check uniqueness
  if (name && name !== existingRole.name) {
    const duplicateRole = await prisma.role.findFirst({
      where: {
        companyId: session.user.companyId,
        name,
        id: { not: id },
      },
    })

    if (duplicateRole) {
      throw validationError('name', 'A role with this name already exists')
    }
  }

  // Store previous state for audit
  const previousPermissions = existingRole.permissions as Permission[]

  // Update the role
  const updatedRole = await prisma.role.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(permissions !== undefined && { permissions: permissions as string[] }),
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
        ...(name !== undefined && { name: { from: existingRole.name, to: name } }),
        ...(description !== undefined && {
          description: { from: existingRole.description, to: description },
        }),
        ...(permissions !== undefined && {
          permissions: { from: previousPermissions, to: permissions },
        }),
      },
    },
  })

  // Write AuditVaultEntry (if permissions changed)
  if (permissions !== undefined) {
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
  }

  return new Response(
    JSON.stringify({
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        isSystemRole: updatedRole.isSystemRole,
        systemRoleKey: updatedRole.systemRoleKey,
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

/**
 * DELETE /api/roles/[id]
 *
 * Deletes a custom role.
 *
 * Feature gate: REQUIRED (customRoles feature must be enabled)
 * Permission required: MANAGE_CUSTOM_ROLES (live check)
 *
 * Validation:
 * - role.isSystemRole must be false (cannot delete system roles)
 * - no users currently assigned to this roleId
 *
 * If any users are assigned:
 * - throw validationError with usersCount and suggestReassignTo
 *
 * Audit:
 * - AuditLog: CUSTOM_ROLE_DELETED
 * - AuditVaultEntry: CUSTOM_ROLE_PERMISSION_CHANGE (action: 'DELETED')
 */
export const DELETE = withApiHandler(async (req: NextRequest, context: RouteContext) => {
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
    'delete custom role',
    req.headers.get('x-forwarded-for') || req.ip || undefined,
    req.headers.get('user-agent') || undefined
  )

  const { id } = await context.params

  const prisma = getPrismaForCompany(session.user.companyId)

  // Fetch the role with user count
  const existingRole = await prisma.role.findFirst({
    where: {
      id,
      companyId: session.user.companyId,
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  })

  if (!existingRole) {
    // Cross-company resource request: return 404 not 403
    throw notFound('Role')
  }

  // Cannot delete system roles
  if (existingRole.isSystemRole) {
    throw forbidden('delete system roles')
  }

  // Check if any users are assigned to this role
  if (existingRole._count.users > 0) {
    // Find a default role to suggest
    const defaultRole = await prisma.role.findFirst({
      where: {
        companyId: session.user.companyId,
        isSystemRole: true,
        systemRoleKey: 'COMPANY_ADMIN',
      },
    })

    const error = new Error('Cannot delete a role with active users.')
    Object.assign(error, {
      usersCount: existingRole._count.users,
      suggestReassignTo: defaultRole?.id,
    })
    throw validationError('role', 'Cannot delete a role with active users.')
  }

  // Store role data for audit before deletion
  const roleData = {
    id: existingRole.id,
    name: existingRole.name,
    permissions: existingRole.permissions as Permission[],
  }

  // Delete the role
  await prisma.role.delete({
    where: { id },
  })

  // Write AuditLog
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.CUSTOM_ROLE_DELETED,
    resourceType: 'Role',
    resourceId: roleData.id,
    ipAddress: req.headers.get('x-forwarded-for') || req.ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.MANAGE_CUSTOM_ROLES],
    metadata: {
      roleName: roleData.name,
      hadPermissions: roleData.permissions,
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
      action: 'DELETED',
      roleName: roleData.name,
      roleId: roleData.id,
      hadPermissions: roleData.permissions,
    },
  })

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Role deleted successfully',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
