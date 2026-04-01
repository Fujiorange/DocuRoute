import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction } from '@docuroute/types'
import { unauthorized, notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'

/**
 * GET /api/documents/[id]
 *
 * Document Detail API - Get full document info with revisions and audit history
 *
 * Permission required: VIEW_DOCUMENT
 *
 * Response:
 * {
 *   document: {
 *     id, documentCode, title, filename, fileKey, fileSize, mimeType,
 *     status, discipline, issuePurpose, watermarkStatus,
 *     uploadedBy, createdAt, updatedAt,
 *     revisions: Array<DocumentRevision>
 *   },
 *   auditLog: Array<AuditLog> (last 50 entries)
 * }
 */
export const GET = withApiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
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
  const documentId = params.id

  // Fetch document with all revisions
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      documentCode: true,
      title: true,
      filename: true,
      fileKey: true,
      fileSize: true,
      mimeType: true,
      status: true,
      discipline: true,
      issuePurpose: true,
      watermarkStatus: true,
      uploadedBy: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!document) {
    throw notFound()
  }

  // Fetch all revisions for this document
  // ORDER BY: CURRENT first, then by createdAt DESC
  const revisions = await prisma.documentRevision.findMany({
    where: {
      documentId: documentId,
      companyId: session.user.companyId,
    },
    orderBy: [
      { status: 'desc' }, // CURRENT sorts before SUPERSEDED alphabetically
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      revisionCode: true,
      status: true,
      discipline: true,
      issuePurpose: true,
      watermarkStatus: true,
      uploadedBy: true,
      createdAt: true,
    },
  })

  // Fetch recent audit log entries for this document
  const auditLog = await prisma.auditLog.findMany({
    where: {
      companyId: session.user.companyId,
      resourceType: 'Document',
      resourceId: documentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
    select: {
      id: true,
      action: true,
      userId: true,
      createdAt: true,
      metadata: true,
    },
  })

  // Log this document view
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.DOCUMENT_DOWNLOADED,
    resourceType: 'Document',
    resourceId: documentId,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.VIEW_DOCUMENT],
    metadata: {
      documentCode: document.documentCode,
      filename: document.filename,
    },
  })

  return new Response(
    JSON.stringify({
      document: {
        ...document,
        revisions,
      },
      auditLog,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
