import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { prismaAdmin } from '@docuroute/db'
import { Permission } from '@docuroute/types'
import { unauthorized, validationError } from '@docuroute/core/src/errors'

/**
 * GET /api/documents/search
 *
 * Full-text search for documents using pg_trgm similarity search.
 *
 * Permission required: VIEW_DOCUMENT
 *
 * Query parameters:
 * - q: string (required) - Search query
 * - projectId?: string - Filter by project
 * - discipline?: string - Filter by discipline
 * - status?: string - Filter by status
 * - page?: number - Page number (default: 1)
 * - limit?: number - Results per page (default: 20, max: 100)
 *
 * Response:
 * {
 *   documents: Document[]
 *   pagination: {
 *     page: number
 *     limit: number
 *     total: number
 *     pages: number
 *   }
 * }
 *
 * IMPORTANT: Requires pg_trgm extension in PostgreSQL.
 * Run in Supabase SQL Editor: CREATE EXTENSION IF NOT EXISTS pg_trgm;
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

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')
  const projectId = searchParams.get('projectId')
  const discipline = searchParams.get('discipline')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

  if (!query || query.trim().length === 0) {
    throw validationError('Search query is required')
  }

  const skip = (page - 1) * limit

  // Build where clause
  const where: any = {
    companyId: session.user.companyId,
  }

  if (projectId) {
    where.projectId = projectId
  }

  if (discipline) {
    where.discipline = discipline
  }

  if (status) {
    where.status = status
  }

  // Use raw SQL for pg_trgm similarity search
  // This searches in filename field using trigram similarity
  const searchQuery = `
    SELECT id, "companyId", "projectId", filename, "fileKey", "fileSize", "mimeType",
           "sha256Hash", "uploadedBy", discipline, "issuePurpose", status,
           "virusScanStatus", "virusScanCompletedAt", "watermarkStatus", metadata,
           "createdAt", "updatedAt",
           similarity(filename, $1) AS sml
    FROM "Document"
    WHERE "companyId" = $2
      AND filename % $3
      ${projectId ? `AND "projectId" = $${4}` : ''}
      ${discipline ? `AND discipline = $${projectId ? 5 : 4}` : ''}
      ${status ? `AND status = $${projectId && discipline ? 6 : projectId || discipline ? 5 : 4}` : ''}
    ORDER BY sml DESC, "createdAt" DESC
    LIMIT $${projectId && discipline && status ? 7 : projectId && discipline || projectId && status || discipline && status ? 6 : projectId || discipline || status ? 5 : 4}
    OFFSET $${projectId && discipline && status ? 8 : projectId && discipline || projectId && status || discipline && status ? 7 : projectId || discipline || status ? 6 : 5}
  `

  const params: any[] = [query, session.user.companyId, query]
  if (projectId) params.push(projectId)
  if (discipline) params.push(discipline)
  if (status) params.push(status)
  params.push(limit, skip)

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(*) as count
    FROM "Document"
    WHERE "companyId" = $1
      AND filename % $2
      ${projectId ? `AND "projectId" = $3` : ''}
      ${discipline ? `AND discipline = $${projectId ? 4 : 3}` : ''}
      ${status ? `AND status = $${projectId && discipline ? 5 : projectId || discipline ? 4 : 3}` : ''}
  `

  const countParams: any[] = [session.user.companyId, query]
  if (projectId) countParams.push(projectId)
  if (discipline) countParams.push(discipline)
  if (status) countParams.push(status)

  // Execute queries
  const [documents, countResult] = await Promise.all([
    prismaAdmin.$queryRawUnsafe(searchQuery, ...params),
    prismaAdmin.$queryRawUnsafe(countQuery, ...countParams),
  ])

  const total = Number((countResult as any[])[0]?.count || 0)
  const pages = Math.ceil(total / limit)

  return new Response(
    JSON.stringify({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
