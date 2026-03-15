import { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/auth'
import { prismaAdmin } from '@docuroute/db'
import { AuditAction, AuditVaultEventType } from '@docuroute/types'
import { notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { buildVerificationStatus } from '@docuroute/core/src/qr-verification'

/**
 * GET /api/documents/[id]/verify
 *
 * PUBLIC ROUTE  No auth required
 * QR code verification for field workers
 *
 * Fetches Document + current DocumentRevision + Project
 * Returns QRVerificationStatus via buildVerificationStatus()
 *
 * Logs:
 *   - AuditLog: DOCUMENT_DOWNLOADED (userId: null, ipAddress, permissionsUsed: [])
 *   - If isSafe === false: AuditVaultEntry: SUPERSEDED_DOC_ACKNOWLEDGED
 *
 * COMPLIANCE: Field workers scanning superseded drawings triggers vault entry
 */

export const GET = withApiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const documentId = params.id

  if (!documentId) {
    throw notFound('Document')
  }

  // Extract IP address for audit log
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  // Fetch document with related data
  // Uses prismaAdmin: public route, no companyId filter
  const document = await prismaAdmin.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      filename: true,
      status: true,
      discipline: true,
      issuePurpose: true,
      watermarkStatus: true,
      metadata: true,
      companyId: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!document) {
    throw notFound('Document')
  }

  // For Phase 1, we use the document itself as the "current revision"
  // Phase 2 will add proper DocumentRevision support
  const revisionCode = 'A' // Default for Phase 1
  const documentCode = document.filename.split('.')[0] || document.filename

  const verificationStatus = buildVerificationStatus(
    {
      id: document.id,
      documentCode,
      status: document.status as any,
      discipline: document.discipline as any,
    },
    {
      revisionCode,
      issuePurpose: document.issuePurpose as any,
      status: 'CURRENT',
    },
    {
      name: document.project?.name || 'Unknown Project',
    }
  )

  // Log audit event
  await logAuditEvent({
    userId: null, // Public access
    companyId: document.companyId,
    action: AuditAction.DOCUMENT_DOWNLOADED,
    resourceType: 'Document',
    resourceId: document.id,
    ipAddress,
    permissionsUsed: [],
    metadata: {
      scanType: 'QR_FIELD_VERIFICATION',
      documentId: document.id,
      revisionCode,
      isSafe: verificationStatus.isSafe,
    },
  })

  // If document is not safe for construction, write vault entry
  if (!verificationStatus.isSafe) {
    await writeVaultEntry({
      companyId: document.companyId,
      eventType: AuditVaultEventType.SUPERSEDED_DOC_ACKNOWLEDGED,
      userId: null,
      userEmail: 'field-worker@qr-scan',
      documentFingerprint: documentCode,
      metadata: {
        documentId: document.id,
        revisionCode,
        status: document.status,
        issuePurpose: document.issuePurpose,
        ipAddress,
        scannedAt: new Date().toISOString(),
      },
    })
  }

  return new Response(JSON.stringify(verificationStatus), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
