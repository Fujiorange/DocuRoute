import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { unauthorized, notFound } from '@docuroute/core/src/errors'

/**
 * POST /api/notifications/[id]/read
 *
 * Marks a notification as read. Verifies ownership (user can only mark their own notifications).
 *
 * Permission required: any authenticated user (must own the notification)
 *
 * Response:
 * {
 *   success: true
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw unauthorized()
    }

    const { id } = await params
    const prisma = getPrismaForCompany(session.user.companyId)

    // Verify ownership and mark as read
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
        companyId: session.user.companyId,
      },
    })

    if (!notification) {
      throw notFound('Notification not found')
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  })(req)
}
