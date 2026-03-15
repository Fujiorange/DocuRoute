import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import {
  Permission,
  AuditAction,
  EngineeringDiscipline,
  IssuePurpose,
  DocumentStatus,
  VirusScanStatus,
  WatermarkStatus,
} from '@docuroute/types'
import { validationError, complianceViolation } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { checkFileExists } from '@docuroute/core/src/r2'

/**
 * POST /api/upload/confirm
 *
 * Confirms file upload completion and creates Document record.
 *
 * Permission: UPLOAD_DOCUMENT
 * Body: {
 *   fileKey, filename, sha256Hash, fileSize, mimeType,
 *   discipline?, issuePurpose?, acknowledgedWatermarkSkip?
 * }
 *
 * Validation:
 *   - File must exist in R2 (HEAD request)
 *   - discipline and issuePurpose required from day 1
 *
 * WATERMARK SIZE GATE (Case B):
 *   If issuePurpose === FOR_CONSTRUCTION AND fileSize > 200MB:
 *     - acknowledgedWatermarkSkip MUST be true, else 422
 *     - Set watermarkStatus = SKIPPED_TOO_LARGE
 *     - Store acknowledgment metadata
 *   Files not FOR_CONSTRUCTION and > 200MB:
 *     - Set watermarkStatus = SKIPPED_TOO_LARGE silently
 *
 * Creates Document with status PENDING
 * Triggers virus scan (async) - stubbed for now
 * Logs DOCUMENT_UPLOADED audit event
 * Updates CompanyOnboarding: FIRST_DOCUMENT_UPLOADED
 */

const MAX_WATERMARK_SIZE = 200 * 1024 * 1024 // 200MB

export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw validationError('session', 'Not authenticated')
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
    [Permission.UPLOAD_DOCUMENT]
  )

  const body = await req.json()
  const {
    fileKey,
    filename,
    sha256Hash,
    fileSize,
    mimeType,
    discipline,
    issuePurpose,
    acknowledgedWatermarkSkip,
  } = body

  // Validation
  if (!fileKey || typeof fileKey !== 'string') {
    throw validationError('fileKey', 'Required')
  }

  if (!filename || typeof filename !== 'string') {
    throw validationError('filename', 'Required')
  }

  if (!sha256Hash || typeof sha256Hash !== 'string') {
    throw validationError('sha256Hash', 'Required')
  }

  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw validationError('fileSize', 'Must be a positive number')
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw validationError('mimeType', 'Required')
  }

  // discipline and issuePurpose required from day 1
  if (!discipline || !Object.values(EngineeringDiscipline).includes(discipline)) {
    throw validationError('discipline', 'Required and must be a valid EngineeringDiscipline')
  }

  if (!issuePurpose || !Object.values(IssuePurpose).includes(issuePurpose)) {
    throw validationError('issuePurpose', 'Required and must be a valid IssuePurpose')
  }

  // Verify file exists in R2
  const fileExists = await checkFileExists(fileKey)
  if (!fileExists) {
    throw validationError('fileKey', 'File not found in storage')
  }

  // WATERMARK SIZE GATE (Case B)
  let watermarkStatus = WatermarkStatus.PENDING
  let metadata: any = {}

  if (fileSize > MAX_WATERMARK_SIZE) {
    if (issuePurpose === IssuePurpose.FOR_CONSTRUCTION) {
      // FOR_CONSTRUCTION files > 200MB require acknowledgment
      if (acknowledgedWatermarkSkip !== true) {
        throw validationError(
          'acknowledgedWatermarkSkip',
          'Acknowledgment required for oversized FOR_CONSTRUCTION files'
        )
      }

      watermarkStatus = WatermarkStatus.SKIPPED_TOO_LARGE

      metadata = {
        watermarkSkipped: true,
        reason: 'TOO_LARGE_FOR_CONSTRUCTION',
        acknowledgedByUserId: session.user.id,
        acknowledgedAt: new Date().toISOString(),
      }
    } else {
      // Non-FOR_CONSTRUCTION files > 200MB: silent skip (no QR needed)
      watermarkStatus = WatermarkStatus.SKIPPED_TOO_LARGE
      metadata = {
        watermarkSkipped: true,
        reason: 'TOO_LARGE_NON_CONSTRUCTION',
      }
    }
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  // Create Document with transaction
  const document = await prisma.$transaction(async (tx) => {
    // Create document
    const doc = await tx.document.create({
      data: {
        companyId: session.user.companyId, // CRITICAL: explicit companyId in transaction
        filename,
        fileKey,
        fileSize,
        mimeType,
        sha256Hash,
        uploadedBy: session.user.id,
        discipline,
        issuePurpose,
        status: DocumentStatus.PENDING,
        virusScanStatus: VirusScanStatus.PENDING,
        watermarkStatus,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      } as any,
    })

    // Update CompanyOnboarding: FIRST_DOCUMENT_UPLOADED
    // Uses prismaAdmin: onboarding is cross-company lookup
    const onboarding = await prismaAdmin.companyOnboarding.findUnique({
      where: { companyId: session.user.companyId },
      select: { milestonesCompleted: true },
    })

    if (onboarding) {
      const milestones = (onboarding.milestonesCompleted as string[]) || []
      if (!milestones.includes('FIRST_DOCUMENT_UPLOADED')) {
        await prismaAdmin.companyOnboarding.update({
          where: { companyId: session.user.companyId },
          data: {
            milestonesCompleted: [...milestones, 'FIRST_DOCUMENT_UPLOADED'],
          },
        })
      }
    }

    return doc
  })

  // Log audit event
  await logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.DOCUMENT_UPLOADED,
    resourceType: 'Document',
    resourceId: document.id,
    permissionsUsed: [Permission.UPLOAD_DOCUMENT],
    metadata: {
      fileKey,
      filename,
      fileSize,
      discipline,
      issuePurpose,
      watermarkSkipped: metadata.watermarkSkipped || false,
    },
  })

  // TODO: Trigger virus scan (async)
  // For now, virus scanning is stubbed as per pilot limitations

  return new Response(
    JSON.stringify({
      documentId: document.id,
      status: document.status,
      watermarkStatus: document.watermarkStatus,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
