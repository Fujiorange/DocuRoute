import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission } from '@docuroute/types'

/**
 * GET /api/users
 *
 * Returns all users for the company with their role information.
 * Never returns users from other companies (companyId extension handles isolation).
 *
 * Permission required: MANAGE_USERS or INVITE_USERS (OR logic)
 *
 * Response includes:
 * - Basic user info (id, email, name, isActive)
 * - Role info (roleId, role.name, role.isSystemRole, role.systemRoleKey, role.permissions)
 * - Activity timestamps (createdAt, updatedAt)
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Check permission - user needs MANAGE_USERS or INVITE_USERS
  requirePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_USERS, Permission.INVITE_USERS]
  )

  const prisma = getPrismaForCompany(session.user.companyId)

  // Fetch all users with their roles
  const users = await prisma.user.findMany({
    where: {
      companyId: session.user.companyId,
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          isSystemRole: true,
          systemRoleKey: true,
          permissions: true,
        },
      },
    },
    orderBy: [
      { isActive: 'desc' }, // Active users first
      { createdAt: 'desc' }, // Most recent first
    ],
  })

  // Format response
  const formattedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    role: {
      id: user.role.id,
      name: user.role.name,
      isSystemRole: user.role.isSystemRole,
      systemRoleKey: user.role.systemRoleKey,
      permissions: user.role.permissions as Permission[],
    },
    isActive: user.isActive,
    mfaEnabled: user.mfaEnabled,
    scimDeprovisioned: user.scimDeprovisioned,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }))

  return new Response(JSON.stringify({ users: formattedUsers }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
