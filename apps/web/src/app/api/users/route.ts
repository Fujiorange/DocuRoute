import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission } from '@docuroute/types'
import { parsePaginationParams, executePaginatedQuery } from '@/lib/pagination'

/**
 * GET /api/users?page=1&limit=50
 *
 * Returns paginated users for the company with their role information.
 * Never returns users from other companies (companyId extension handles isolation).
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 *
 * Permission required: MANAGE_USERS or INVITE_USERS (OR logic)
 *
 * Response includes:
 * - Basic user info (id, email, name, isActive)
 * - Role info (roleId, role.name, role.isSystemRole, role.systemRoleKey, role.permissions)
 * - Activity timestamps (createdAt, updatedAt)
 * - Pagination metadata
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Check permission - user needs MANAGE_USERS or INVITE_USERS
  requirePermission(
    {
      userId: session.user.userId,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_USERS, Permission.INVITE_USERS]
  )

  const prisma = getPrismaForCompany(session.user.companyId)
  const { page, limit, skip } = parsePaginationParams(
    req.nextUrl.searchParams,
    { page: 1, limit: 50, maxLimit: 100 }
  )

  const where = {
    companyId: session.user.companyId,
  }

  const include = {
    role: {
      select: {
        id: true,
        name: true,
        isSystemRole: true,
        systemRoleKey: true,
        permissions: true,
      },
    },
  }

  const result = await executePaginatedQuery(
    () => prisma.user.findMany({
      where,
      include,
      orderBy: [
        { isActive: 'desc' }, // Active users first
        { createdAt: 'desc' }, // Most recent first
      ],
      skip,
      take: limit,
    }),
    () => prisma.user.count({ where }),
    page,
    limit
  )

  // Format response
  const formattedUsers = result.data.map((user) => ({
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

  return new Response(
    JSON.stringify({
      data: formattedUsers,
      pagination: result.pagination,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
