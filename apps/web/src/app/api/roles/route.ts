import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission, requireLivePermission, requireFeature } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction, AuditVaultEventType } from '@docuroute/types'
import { validationError, notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { createRoleSchema } from '@/lib/validations/role'

/**
 * GET /api/roles
 *
 * Returns all roles for the company: system roles + custom roles.
 * For each role, includes:
 * - Basic info (isSystemRole, systemRoleKey, name, description)
 * - permissions (empty array for system roles in response)
 * - userCount (number of users currently assigned to this role)
 *
 * Permission required: MANAGE_CUSTOM_ROLES
 * Feature gate: NOT required for GET (listing is always allowed)
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Check permission (listing roles requires MANAGE_CUSTOM_ROLES)
  requirePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_CUSTOM_ROLES]
  )

  const prisma = getPrismaForCompany(session.user.companyId)

  // Fetch all roles with user count
  const roles = await prisma.role.findMany({
    where: {
      companyId: session.user.companyId,
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: [
      { isSystemRole: 'desc' }, // System roles first
      { name: 'asc' },
    ],
  })

  // Format response
  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystemRole: role.isSystemRole,
    systemRoleKey: role.systemRoleKey,
    // For system roles, return empty array (UI will show "Managed by system")
    // For custom roles, return the actual permissions
    permissions: role.isSystemRole ? [] : (role.permissions as Permission[]),
    userCount: role._count.users,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }))

  return new Response(JSON.stringify({ roles: formattedRoles }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

/**
 * POST /api/roles
 *
 * Creates a new custom role.
 *
 * Feature gate: REQUIRED (customRoles feature must be enabled)
 * Permission required: MANAGE_CUSTOM_ROLES (live check)
 *
 * Body: { name, description?, permissions: Permission[] }
 *
 * Validation:
 * - name: min 2, max 50 chars
 * - permissions: array of valid Permission enum values
 * - permissions must NOT include PLATFORM_ADMIN_ACCESS or EMERGENCY_TRANSFER
 * - name must be unique within company (@@unique([companyId, name]))
 *
 * Audit:
 * - AuditLog: CUSTOM_ROLE_CREATED
 * - AuditVaultEntry: CUSTOM_ROLE_PERMISSION_CHANGE (action: 'CREATED')
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Feature gate FIRST - before any other logic
  await requireFeature(session.user.companyId, 'customRoles')

  // Live permission check for sensitive operation
  await requireLivePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_CUSTOM_ROLES],
    'create custom role',
    req.headers.get('x-forwarded-for') || req.ip || undefined,
    req.headers.get('user-agent') || undefined
  )

  // Parse and validate request body
  const body = await req.json()
  const validationResult = createRoleSchema.safeParse(body)

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0]
    throw validationError(firstError.path.join('.'), firstError.message)
  }

  const { name, description, permissions } = validationResult.data

  const prisma = getPrismaForCompany(session.user.companyId)

  // Check if role name already exists for this company
  const existingRole = await prisma.role.findFirst({
    where: {
      companyId: session.user.companyId,
      name,
    },
  })

  if (existingRole) {
    throw validationError('name', 'A role with this name already exists')
  }

  // Create the role in a transaction (to ensure audit logging consistency)
  const newRole = await prisma.$transaction(async (tx) => {
    // TRANSACTION RULE: Pass companyId explicitly
    const role = await tx.role.create({
      data: {
        companyId: session.user.companyId,
        name,
        description: description || null,
        isSystemRole: false,
        systemRoleKey: null,
        permissions: permissions as string[],
      },
    })

    return role
  })

  // Write AuditLog (standard audit event)
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.CUSTOM_ROLE_CREATED,
    resourceType: 'Role',
    resourceId: newRole.id,
    ipAddress: req.headers.get('x-forwarded-for') || req.ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.MANAGE_CUSTOM_ROLES],
    metadata: {
      roleName: name,
      permissionsGranted: permissions,
    },
  })

  // Write AuditVaultEntry (compliance-critical event)
  await writeVaultEntry({
    companyId: session.user.companyId,
    eventType: AuditVaultEventType.CUSTOM_ROLE_PERMISSION_CHANGE,
    userId: session.user.id,
    userEmail: session.user.email || 'unknown',
    ipAddress: req.headers.get('x-forwarded-for') || req.ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.MANAGE_CUSTOM_ROLES],
    metadata: {
      action: 'CREATED',
      roleName: name,
      roleId: newRole.id,
      permissions,
    },
  })

  return new Response(
    JSON.stringify({
      role: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        isSystemRole: newRole.isSystemRole,
        systemRoleKey: newRole.systemRoleKey,
        permissions: newRole.permissions,
        createdAt: newRole.createdAt.toISOString(),
        updatedAt: newRole.updatedAt.toISOString(),
      },
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
