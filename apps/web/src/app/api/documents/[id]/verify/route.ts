import { NextResponse } from 'next/server'
import { prismaAdmin } from '@docuroute/db'
import { buildVerificationStatus } from '@docuroute/core/src/qr-verification'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import { checkRateLimit } from '@docuroute/core/src/rate-limit'
import {
  AuditAction,
  AuditVaultEventType,
  DocumentStatus,
  EngineeringDiscipline,
  IssuePurpose,
} from '@docuroute/types'
import { notFound } from '@docuroute/core/src/errors'

/**
 * GET /api/documents/[id]/verify
 *
 * Public QR verification endpoint - no authentication required.
 * Returns document safety status for field workers.
 *
 * Rate limited to prevent abuse: 100 verifications per hour per IP
 *
 * Uses prismaAdmin for cross-company access (public endpoint).
 */

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const documentId = params.id

  // Rate limiting: 100 verifications per hour per IP (public endpoint protection)
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  await checkRateLimit({
    key: `verify:${documentId}:${clientIP}`,
    limit: 100,
    windowSeconds: 3600, // 1 hour
  })

  // Uses prismaAdmin: public endpoint needs cross-company access for field verification
  const document = await prismaAdmin.document.findUnique({
    where: { id: documentId },
    include: {
      project: true,
    },
  })

  if (!document) {
    throw notFound('Document not found')
  }

  // For Phase 1, we use the document fields directly since DocumentRevision is minimal
  // In Phase 2, this will query DocumentRevision with status: CURRENT
  const revision = {
    revisionCode: 'A', // Stub for Phase 1 - Phase 2 will use actual revision code
    issuePurpose: document.issuePurpose as IssuePurpose,
    status: 'CURRENT',
  }

  const project = document.project || { name: 'Unknown Project' }

  // Build verification status
  const status = buildVerificationStatus(
    {
      id: document.id,
      documentCode: document.filename, // Phase 1: use filename as document code
      status: document.status as DocumentStatus,
      discipline: (document.discipline as EngineeringDiscipline) || EngineeringDiscipline.GENERAL,
    },
    revision,
    project,
    undefined // latestRevisionCode - will be implemented in Phase 2
  )

  // Check if watermark was skipped
  const metadata = document.metadata as any
  if (metadata?.watermarkSkipped) {
    status.watermarkSkipped = true
  }

  // Extract IP and userAgent from request
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
  const userAgent = req.headers.get('user-agent') || undefined

  // Write AuditLog
  await logAuditEvent({
    userId: null,
    companyId: document.companyId,
    action: AuditAction.DOCUMENT_DOWNLOADED,
    resourceType: 'Document',
    resourceId: document.id,
    ipAddress,
    userAgent,
    permissionsUsed: [],
    metadata: {
      scanType: 'QR_FIELD_VERIFICATION',
      documentId: document.id,
      revisionId: null, // Phase 1: no revision tracking yet
      isSafe: status.isSafe,
    },
  })

  // If unsafe document scanned, write to AuditVault
  if (!status.isSafe) {
    await writeVaultEntry({
      companyId: document.companyId,
      eventType: AuditVaultEventType.SUPERSEDED_DOC_ACKNOWLEDGED,
      userId: null,
      userEmail: 'field-scan@unknown',
      ipAddress,
      userAgent,
      permissionsUsed: [],
      metadata: {
        documentId: document.id,
        revisionId: null,
        isSafe: false,
      },
      documentFingerprint: document.sha256Hash,
    })
  }

  return NextResponse.json(status)
}
