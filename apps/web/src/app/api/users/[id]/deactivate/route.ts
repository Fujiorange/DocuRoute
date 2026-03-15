import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requireLivePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction } from '@docuroute/types'
import { validationError, notFound, forbidden } from '@docuroute/core/src/errors'

/**
 * POST /api/users/[id]/deactivate
 *
 * Deactivates a user account.
 *
 * Permission required: DEACTIVATE_USERS (live check)
 *
 * Validation:
 * - Cannot deactivate yourself
 * - Cannot deactivate the only user with COMPANY_OWNER system role
 *
 * Uses Prisma transaction - companyId must be passed explicitly.
 *
 * Audit: USER_DEACTIVATED, permissionsUsed: [Permission.DEACTIVATE_USERS]
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Live permission check (mandatory for deactivation)
  await requireLivePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.DEACTIVATE_USERS],
    'deactivate user',
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  )

  // Parse URL to get user ID
  const url = new URL(req.url)
  const userId = url.pathname.split('/')[3] // /api/users/[id]/deactivate

  if (!userId) {
    throw validationError('userId', 'User ID is required')
  }

  // Cannot deactivate yourself
  if (userId === session.user.id) {
    throw forbidden('deactivate your own account')
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  // Fetch user with role
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

  // Check if user is already deactivated
  if (!user.isActive) {
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isActive: false,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Cannot deactivate the only COMPANY_OWNER
  if (user.role.isSystemRole && user.role.systemRoleKey === 'COMPANY_OWNER') {
    // Check if there are other active COMPANY_OWNER users
    const ownerCount = await prisma.user.count({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        role: {
          isSystemRole: true,
          systemRoleKey: 'COMPANY_OWNER',
        },
      },
    })

    if (ownerCount <= 1) {
      throw forbidden(
        'deactivate the only Company Owner. Transfer ownership first or assign another Company Owner.'
      )
    }
  }

  // Deactivate user in transaction
  const deactivatedUser = await prisma.$transaction(async (tx) => {
    // CRITICAL: Pass companyId explicitly - extension doesn't apply in transactions
    const updated = await tx.user.update({
      where: {
        id: userId,
        companyId: session.user.companyId,
      },
      data: {
        isActive: false,
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
        userId: session.user.id,
        action: AuditAction.USER_DEACTIVATED,
        resourceType: 'User',
        resourceId: userId,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        permissionsUsed: [Permission.DEACTIVATE_USERS],
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email,
          targetUserName: user.name,
          roleId: user.role.id,
          roleName: user.role.name,
        },
      },
    })

    return updated
  })

  return new Response(
    JSON.stringify({
      user: {
        id: deactivatedUser.id,
        email: deactivatedUser.email,
        name: deactivatedUser.name,
        isActive: deactivatedUser.isActive,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
