import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { unauthorized } from '@docuroute/core/src/errors'

/**
 * POST /api/notifications/read-all
 *
 * Marks all notifications as read for the authenticated user.
 *
 * Permission required: any authenticated user
 *
 * Response:
 * {
 *   success: true,
 *   count: number
 * }
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      companyId: session.user.companyId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return new Response(
    JSON.stringify({ success: true, count: result.count }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
