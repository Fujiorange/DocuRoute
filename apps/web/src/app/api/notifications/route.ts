import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { unauthorized } from '@docuroute/core/src/errors'

/**
 * GET /api/notifications
 *
 * Returns the last 50 notifications for the authenticated user, unread first.
 *
 * Permission required: any authenticated user
 *
 * Response:
 * {
 *   notifications: Notification[]
 * }
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      companyId: session.user.companyId,
    },
    orderBy: [
      { isRead: 'asc' }, // Unread first
      { createdAt: 'desc' }, // Then by newest
    ],
    take: 50,
  })

  return new Response(
    JSON.stringify({ notifications }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
