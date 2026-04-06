import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction, ViewType } from '@docuroute/types'
import { unauthorized, notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { logDocumentView, extractRequestMetadata } from '@docuroute/core/src/document-view-audit'
import { getSignedDownloadUrl } from '@docuroute/core/src/r2'

/**
 * GET /api/documents/[id]/preview
 *
 * Document Preview API - Generate presigned URL for in-browser PDF preview
 *
 * Permission required: VIEW_DOCUMENT
 *
 * Response:
 * {
 *   previewUrl: string (presigned R2 URL, expires in 1 hour)
 *   filename: string
 *   mimeType: string
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

  // Fetch document
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      documentCode: true,
      filename: true,
      fileKey: true,
      mimeType: true,
    },
  })

  if (!document) {
    throw notFound()
  }

  // Generate presigned preview URL (expires in 1 hour)
  const previewUrl = await getSignedDownloadUrl(document.fileKey, 3600)

  // Log preview action for audit trail
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.DOCUMENT_VIEWED,
    resourceType: 'Document',
    resourceId: documentId,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.VIEW_DOCUMENT],
    metadata: {
      documentCode: document.documentCode,
      filename: document.filename,
      viewType: 'PREVIEW',
    },
  })

  // Log document view for compliance tracking (fire-and-forget)
  const { ipAddress, userAgent } = extractRequestMetadata(req)
  logDocumentView({
    documentId: documentId,
    userId: session.user.id,
    companyId: session.user.companyId,
    viewType: ViewType.PREVIEW,
    ipAddress,
    userAgent,
  })

  return new Response(
    JSON.stringify({
      previewUrl,
      filename: document.filename,
      mimeType: document.mimeType,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
