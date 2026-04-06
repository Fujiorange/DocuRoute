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
 * Enhanced search for documents with multiple search modes:
 * - metadata: Search in document codes and titles using pg_trgm (default)
 * - fulltext: Search inside PDF content using PostgreSQL tsvector
 * - both: Search in both metadata and content
 *
 * Permission required: VIEW_DOCUMENT
 *
 * Query parameters:
 * - q: string (required) - Search query
 * - type: 'metadata' | 'fulltext' | 'both' - Search mode (default: 'metadata')
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
  const searchType = (searchParams.get('type') || 'metadata') as 'metadata' | 'fulltext' | 'both'
  const projectId = searchParams.get('projectId')
  const discipline = searchParams.get('discipline')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

  if (!query || query.trim().length === 0) {
    throw validationError('Search query is required')
  }

  const skip = (page - 1) * limit

  // Build WHERE clause conditions
  const whereConditions: string[] = [`d."companyId" = $1`]
  const params: any[] = [session.user.companyId]
  let paramIndex = 2

  if (projectId) {
    whereConditions.push(`d."projectId" = $${paramIndex}`)
    params.push(projectId)
    paramIndex++
  }

  if (discipline) {
    whereConditions.push(`d.discipline = $${paramIndex}`)
    params.push(discipline)
    paramIndex++
  }

  if (status) {
    whereConditions.push(`d.status = $${paramIndex}`)
    params.push(status)
    paramIndex++
  }

  // Execute search based on type
  let searchQuery: string
  let countQuery: string
  let searchParams_final: any[]
  let countParams_final: any[]

  if (searchType === 'metadata') {
    // Metadata search using pg_trgm (original implementation)
    searchQuery = `
      SELECT d.id, d."companyId", d."projectId", d.filename, d."fileKey", d."fileSize",
             d."mimeType", d."sha256Hash", d."uploadedBy", d.discipline, d."issuePurpose",
             d.status, d."virusScanStatus", d."virusScanCompletedAt", d."watermarkStatus",
             d.metadata, d."createdAt", d."updatedAt", d."documentCode", d.title,
             d."hasSearchableContent",
             similarity(d.filename, $${paramIndex}) AS rank
      FROM "Document" d
      WHERE ${whereConditions.join(' AND ')}
        AND d.filename % $${paramIndex}
      ORDER BY rank DESC, d."createdAt" DESC
      LIMIT $${paramIndex + 1}
      OFFSET $${paramIndex + 2}
    `

    countQuery = `
      SELECT COUNT(*) as count
      FROM "Document" d
      WHERE ${whereConditions.join(' AND ')}
        AND d.filename % $${paramIndex}
    `

    searchParams_final = [...params, query, limit, skip]
    countParams_final = [...params, query]
  } else if (searchType === 'fulltext') {
    // Full-text search using tsvector
    // Convert query to tsquery format (handle spaces and special chars)
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
      .filter((word) => word.length > 0)
      .join(' & ')

    searchQuery = `
      SELECT d.id, d."companyId", d."projectId", d.filename, d."fileKey", d."fileSize",
             d."mimeType", d."sha256Hash", d."uploadedBy", d.discipline, d."issuePurpose",
             d.status, d."virusScanStatus", d."virusScanCompletedAt", d."watermarkStatus",
             d.metadata, d."createdAt", d."updatedAt", d."documentCode", d.title,
             d."hasSearchableContent",
             ts_rank_cd(dc."searchVector", query) AS rank,
             ts_headline('english', dc."plainText", query, 'MaxWords=30, MinWords=15') AS snippet
      FROM "Document" d
      INNER JOIN "DocumentContent" dc ON d.id = dc."documentId"
      CROSS JOIN to_tsquery('english', $${paramIndex}) AS query
      WHERE ${whereConditions.join(' AND ')}
        AND dc."searchVector" @@ query
      ORDER BY rank DESC, d."createdAt" DESC
      LIMIT $${paramIndex + 1}
      OFFSET $${paramIndex + 2}
    `

    countQuery = `
      SELECT COUNT(*) as count
      FROM "Document" d
      INNER JOIN "DocumentContent" dc ON d.id = dc."documentId"
      WHERE ${whereConditions.join(' AND ')}
        AND dc."searchVector" @@ to_tsquery('english', $${paramIndex})
    `

    searchParams_final = [...params, tsQuery, limit, skip]
    countParams_final = [...params, tsQuery]
  } else {
    // Both: search in metadata OR content
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
      .filter((word) => word.length > 0)
      .join(' & ')

    searchQuery = `
      SELECT DISTINCT ON (d.id)
             d.id, d."companyId", d."projectId", d.filename, d."fileKey", d."fileSize",
             d."mimeType", d."sha256Hash", d."uploadedBy", d.discipline, d."issuePurpose",
             d.status, d."virusScanStatus", d."virusScanCompletedAt", d."watermarkStatus",
             d.metadata, d."createdAt", d."updatedAt", d."documentCode", d.title,
             d."hasSearchableContent",
             COALESCE(
               ts_rank_cd(dc."searchVector", query),
               similarity(d.filename, $${paramIndex})
             ) AS rank,
             ts_headline('english', COALESCE(dc."plainText", ''), query, 'MaxWords=30, MinWords=15') AS snippet
      FROM "Document" d
      LEFT JOIN "DocumentContent" dc ON d.id = dc."documentId"
      CROSS JOIN to_tsquery('english', $${paramIndex + 1}) AS query
      WHERE ${whereConditions.join(' AND ')}
        AND (
          d.filename % $${paramIndex}
          OR (dc."searchVector" IS NOT NULL AND dc."searchVector" @@ query)
        )
      ORDER BY d.id, rank DESC, d."createdAt" DESC
      LIMIT $${paramIndex + 2}
      OFFSET $${paramIndex + 3}
    `

    countQuery = `
      SELECT COUNT(DISTINCT d.id) as count
      FROM "Document" d
      LEFT JOIN "DocumentContent" dc ON d.id = dc."documentId"
      WHERE ${whereConditions.join(' AND ')}
        AND (
          d.filename % $${paramIndex}
          OR (dc."searchVector" IS NOT NULL AND dc."searchVector" @@ to_tsquery('english', $${paramIndex + 1}))
        )
    `

    searchParams_final = [...params, query, tsQuery, limit, skip]
    countParams_final = [...params, query, tsQuery]
  }

  // Execute queries
  const [documents, countResult] = await Promise.all([
    prismaAdmin.$queryRawUnsafe(searchQuery, ...searchParams_final),
    prismaAdmin.$queryRawUnsafe(countQuery, ...countParams_final),
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
      searchType,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
