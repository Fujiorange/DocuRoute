import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { unauthorized } from '@docuroute/core/src/errors'
import { parsePaginationParams, executePaginatedQuery } from '@/lib/pagination'

/**
 * GET /api/notifications?page=1&limit=50
 *
 * Returns paginated notifications for the authenticated user, unread first.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 *
 * Permission required: any authenticated user
 *
 * Response:
 * {
 *   data: Notification[],
 *   pagination: { page, limit, total, pages, hasMore }
 * }
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  const prisma = getPrismaForCompany(session.user.companyId)
  const { page, limit, skip } = parsePaginationParams(
    req.nextUrl.searchParams,
    { page: 1, limit: 50, maxLimit: 100 }
  )

  const where = {
    userId: session.user.id,
    companyId: session.user.companyId,
  }

  const result = await executePaginatedQuery(
    () => prisma.notification.findMany({
      where,
      orderBy: [
        { isRead: 'asc' }, // Unread first
        { createdAt: 'desc' }, // Then by newest
      ],
      skip,
      take: limit,
    }),
    () => prisma.notification.count({ where }),
    page,
    limit
  )

  return new Response(
    JSON.stringify(result),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
