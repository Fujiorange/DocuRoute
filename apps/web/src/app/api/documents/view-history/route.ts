import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, ViewType } from '@docuroute/types'
import { unauthorized } from '@docuroute/core/src/errors'

/**
 * GET /api/documents/view-history
 *
 * View History API - Get document view logs for compliance auditing
 *
 * Permission required: VIEW_AUDIT_LOG
 *
 * Query Parameters:
 * - documentId (optional): Filter by specific document ID
 * - viewType (optional): Filter by view type (DETAIL_PAGE, PREVIEW, DOWNLOAD, QR_SCAN)
 * - userId (optional): Filter by specific user ID
 * - startDate (optional): Filter by start date (ISO 8601)
 * - endDate (optional): Filter by end date (ISO 8601)
 * - limit (optional): Number of results to return (default: 100, max: 1000)
 *
 * Response:
 * {
 *   views: Array<DocumentViewEntry>
 * }
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  // Check permission
  requirePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.VIEW_AUDIT_LOG]
  )

  const prisma = getPrismaForCompany(session.user.companyId)

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams
  const documentId = searchParams.get('documentId') || undefined
  const viewType = searchParams.get('viewType') as ViewType | undefined
  const userId = searchParams.get('userId') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)

  // Build where clause
  const where: any = {
    companyId: session.user.companyId,
  }

  if (documentId) {
    where.documentId = documentId
  }

  if (viewType) {
    where.viewType = viewType
  }

  if (userId) {
    where.userId = userId
  }

  if (startDate || endDate) {
    where.viewedAt = {}
    if (startDate) {
      where.viewedAt.gte = new Date(startDate)
    }
    if (endDate) {
      where.viewedAt.lte = new Date(endDate)
    }
  }

  // Fetch view history
  const views = await prisma.documentView.findMany({
    where,
    orderBy: {
      viewedAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      documentId: true,
      userId: true,
      viewType: true,
      ipAddress: true,
      userAgent: true,
      viewedAt: true,
      sessionId: true,
    },
  })

  return new Response(
    JSON.stringify({
      views,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
