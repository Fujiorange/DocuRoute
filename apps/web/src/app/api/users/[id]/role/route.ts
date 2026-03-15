import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requireLivePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction, AuditVaultEventType } from '@docuroute/types'
import { validationError, notFound, forbidden } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { changeUserRoleSchema } from '@/lib/validations/user'

/**
 * POST /api/users/[id]/role
 *
 * Changes a user's role assignment.
 *
 * Permission required: MANAGE_USERS (live check - role changes are sensitive)
 *
 * Body: { roleId: string }
 *
 * Validation:
 * - roleId must belong to this company
 * - Cannot assign PLATFORM_ADMIN system role via this endpoint
 * - COMPANY_ADMIN cannot assign COMPANY_OWNER role (ownership transfer territory)
 *
 * Uses Prisma transaction - companyId must be passed explicitly.
 *
 * Audit: USER_ROLE_CHANGED, permissionsUsed: [Permission.MANAGE_USERS]
 * Metadata: { fromRoleId, toRoleId, fromRoleName, toRoleName }
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Live permission check (mandatory for role changes)
  await requireLivePermission(
    {
      userId: session.user.userId,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_USERS],
    'change user role',
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  )

  // Parse URL to get user ID
  const url = new URL(req.url)
  const userId = url.pathname.split('/')[3] // /api/users/[id]/role

  if (!userId) {
    throw validationError('userId', 'User ID is required')
  }

  // Parse and validate body
  const body = await req.json()
  const parseResult = changeUserRoleSchema.safeParse(body)

  if (!parseResult.success) {
    throw validationError(
      'body',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    )
  }

  const { roleId } = parseResult.data

  const prisma = getPrismaForCompany(session.user.companyId)

  // Fetch user with current role
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) {
    throw notFound('user')
  }

  // Validate new roleId belongs to this company
  const newRole = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      name: true,
      isSystemRole: true,
      systemRoleKey: true,
    },
  })

  if (!newRole) {
    throw notFound('role')
  }

  // Cannot assign PLATFORM_ADMIN via this endpoint
  if (newRole.isSystemRole && newRole.systemRoleKey === 'PLATFORM_ADMIN') {
    throw forbidden('assign PLATFORM_ADMIN role via this endpoint')
  }

  // COMPANY_ADMIN cannot assign COMPANY_OWNER role
  if (
    newRole.isSystemRole &&
    newRole.systemRoleKey === 'COMPANY_OWNER' &&
    session.user.systemRoleKey !== 'COMPANY_OWNER'
  ) {
    throw forbidden('assign COMPANY_OWNER role. Only the current owner can transfer ownership.')
  }

  // If role hasn't changed, just return success
  if (user.roleId === roleId) {
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: newRole,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Update user role in transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // CRITICAL: Pass companyId explicitly - extension doesn't apply in transactions
    const updated = await tx.user.update({
      where: {
        id: userId,
        companyId: session.user.companyId,
      },
      data: {
        roleId,
        companyId: session.user.companyId, // Explicit companyId
      },
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

    // Log audit event within transaction
    await tx.auditLog.create({
      data: {
        companyId: session.user.companyId, // Explicit companyId
        userId: session.user.userId,
        action: AuditAction.USER_ROLE_CHANGED,
        resourceType: 'User',
        resourceId: userId,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        permissionsUsed: [Permission.MANAGE_USERS],
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email,
          fromRoleId: user.role.id,
          fromRoleName: user.role.name,
          toRoleId: newRole.id,
          toRoleName: newRole.name,
        },
      },
    })

    return updated
  })

  return new Response(
    JSON.stringify({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roleId: updatedUser.roleId,
        role: updatedUser.role,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
