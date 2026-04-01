import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction } from '@docuroute/types'
import { unauthorized } from '@docuroute/core/src/errors'
import { parsePaginationParams, executePaginatedQuery } from '@/lib/pagination'
import { logAuditEvent } from '@docuroute/core/src/audit'

/**
 * GET /api/documents
 *
 * Document Register API - Fast, searchable document table with current revisions
 *
 * Permission required: VIEW_DOCUMENT
 *
 * Query parameters:
 * - search?: string - Search in documentCode and title
 * - status?: string - Filter by document status
 * - discipline?: string - Filter by engineering discipline
 * - projectId?: string - Filter by project
 * - page?: number - Page number (default: 1)
 * - limit?: number - Results per page (default: 50, max: 100)
 *
 * Response:
 * {
 *   data: Array<{
 *     id: string
 *     documentCode: string
 *     title: string
 *     revisionCode: string (from current revision)
 *     status: string
 *     discipline: string
 *     updatedAt: string
 *   }>
 *   pagination: {
 *     page: number
 *     limit: number
 *     total: number
 *     pages: number
 *     hasMore: boolean
 *   }
 * }
 *
 * Performance:
 * - Uses indexed queries for <1s response with 1000+ records
 * - Joins with current DocumentRevision (status = "CURRENT")
 * - Pagination prevents full-table scans
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
    [Permission.VIEW_DOCUMENT]
  )

  const prisma = getPrismaForCompany(session.user.companyId)

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get('search')
  const status = searchParams.get('status')
  const discipline = searchParams.get('discipline')
  const projectId = searchParams.get('projectId')
  const { page, limit, skip } = parsePaginationParams(searchParams, {
    page: 1,
    limit: 50,
    maxLimit: 100,
  })

  // Build where clause
  const where: any = {
    companyId: session.user.companyId,
  }

  if (search) {
    where.OR = [
      { documentCode: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (discipline) {
    where.discipline = discipline
  }

  if (projectId) {
    where.projectId = projectId
  }

  // Execute paginated query
  // PERFORMANCE: This query joins Document with current DocumentRevision
  // Strategy: For each document, find the ONE revision where status = "CURRENT"
  // This is efficient because DocumentRevision has index on [documentId, status]
  const result = await executePaginatedQuery(
    async () => {
      const documents = await prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          documentCode: true,
          title: true,
          status: true,
          discipline: true,
          updatedAt: true,
          filename: true,
        },
      })

      // Fetch current revisions for all documents in one query
      // PERFORMANCE: Single query using IN clause instead of N+1 queries
      const documentIds = documents.map((d) => d.id)
      const currentRevisions = await prisma.$queryRaw<
        Array<{ documentId: string; revisionCode: string }>
      >`
        SELECT "documentId", "revisionCode"
        FROM "DocumentRevision"
        WHERE "documentId" = ANY(${documentIds}::text[])
          AND status = 'CURRENT'
          AND "companyId" = ${session.user.companyId}
      `

      // Build revision map for O(1) lookup
      const revisionMap = new Map(
        currentRevisions.map((r) => [r.documentId, r.revisionCode])
      )

      // Combine document data with revision codes
      return documents.map((doc) => ({
        id: doc.id,
        documentCode: doc.documentCode || doc.filename,
        title: doc.title || doc.filename,
        revisionCode: revisionMap.get(doc.id) || '-',
        status: doc.status,
        discipline: doc.discipline || '-',
        updatedAt: doc.updatedAt.toISOString(),
      }))
    },
    () => prisma.document.count({ where }),
    page,
    limit
  )

  // Log audit event (non-blocking)
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.DOCUMENT_DOWNLOADED,
    resourceType: 'DocumentList',
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.VIEW_DOCUMENT],
    metadata: {
      filters: { search, status, discipline, projectId },
      resultCount: result.data.length,
    },
  })

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
