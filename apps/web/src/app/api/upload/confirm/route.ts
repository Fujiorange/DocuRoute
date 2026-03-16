import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { requirePermission, withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { headObject } from '@docuroute/core/src/r2'
import { logAuditEvent } from '@docuroute/core/src/audit'
import {
  Permission,
  EngineeringDiscipline,
  IssuePurpose,
  DocumentStatus,
  WatermarkStatus,
  AuditAction,
  MAX_WATERMARK_SIZE_BYTES,
} from '@docuroute/types'
import { validationError, notFound } from '@docuroute/core/src/errors'
import { authOptions } from '../../auth/[...nextauth]/route'

/**
 * POST /api/upload/confirm
 *
 * Confirms file upload and creates Document record.
 * Implements watermark size gate Case B (post-upload acknowledgment enforcement).
 *
 * Permission: UPLOAD_DOCUMENT
 */

const confirmSchema = z.object({
  fileKey: z.string().min(1),
  filename: z.string().min(1).max(255),
  sha256Hash: z.string().length(64),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  discipline: z.nativeEnum(EngineeringDiscipline).optional(),
  issuePurpose: z.nativeEnum(IssuePurpose).optional(),
  acknowledgedWatermarkSkip: z.boolean().optional(),
})

export const POST = withApiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  // Permission check
  requirePermission(session.user, [Permission.UPLOAD_DOCUMENT])

  const body = await req.json()
  const validation = confirmSchema.safeParse(body)

  if (!validation.success) {
    throw validationError('Invalid request body', validation.error.errors)
  }

  const {
    fileKey,
    filename,
    sha256Hash,
    fileSize,
    mimeType,
    discipline,
    issuePurpose,
    acknowledgedWatermarkSkip,
  } = validation.data

  // Verify file exists in R2
  const r2Object = await headObject(fileKey)
  if (!r2Object) {
    throw notFound('File not found in storage. Upload may have failed.')
  }

  // SERVER-SIDE METADATA VALIDATION (stub for now, full implementation in Phase 2)
  // TODO Phase 2: Re-run filename parser server-side
  // TODO Phase 2: Compare server-parsed fields vs client-submitted fields
  // TODO Phase 2: If divergence: throw validationError with code METADATA_TAMPERED
  //               and write AuditLog with PERMISSION_DENIED

  // WATERMARK SIZE GATE - Case B
  let watermarkStatus = WatermarkStatus.PENDING
  let metadata: any = undefined
  let warning: string | undefined = undefined

  if (fileSize > MAX_WATERMARK_SIZE_BYTES) {
    if (issuePurpose === IssuePurpose.FOR_CONSTRUCTION) {
      // FOR_CONSTRUCTION files >200MB require acknowledgment
      if (acknowledgedWatermarkSkip !== true) {
        return NextResponse.json(
          {
            error: {
              code: 'ACKNOWLEDGMENT_REQUIRED',
              message: 'Acknowledgment required for oversized FOR_CONSTRUCTION files',
            },
          },
          { status: 422 }
        )
      }

      // User acknowledged - set metadata
      watermarkStatus = WatermarkStatus.SKIPPED_TOO_LARGE
      metadata = {
        watermarkSkipped: true,
        reason: 'TOO_LARGE_FOR_CONSTRUCTION',
        acknowledgedByUserId: session.user.userId,
        acknowledgedAt: new Date().toISOString(),
      }
      warning = 'QR verification unavailable for this file (size exceeds 200MB)'
    } else {
      // Non-construction files >200MB skip silently
      watermarkStatus = WatermarkStatus.SKIPPED_TOO_LARGE
      metadata = {
        watermarkSkipped: true,
        reason: 'TOO_LARGE_NON_CONSTRUCTION',
      }
    }
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  // Check if this is the first upload for onboarding
  const existingDocumentsCount = await prisma.document.count()

  // Create Document
  const document = await prisma.document.create({
    data: {
      companyId: session.user.companyId,
      filename,
      fileKey,
      fileSize,
      mimeType,
      sha256Hash,
      uploadedBy: session.user.userId,
      discipline,
      issuePurpose,
      status: DocumentStatus.PENDING,
      watermarkStatus,
      metadata,
    },
  })

  // Update CompanyOnboarding if this is the first upload
  if (existingDocumentsCount === 0) {
    await prisma.companyOnboarding.upsert({
      where: { companyId: session.user.companyId },
      create: {
        companyId: session.user.companyId,
        completedSteps: ['FIRST_DOCUMENT_UPLOADED'],
      },
      update: {
        completedSteps: {
          push: 'FIRST_DOCUMENT_UPLOADED',
        },
      },
    })
  }

  // Extract IP and userAgent from request
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
  const userAgent = req.headers.get('user-agent') || undefined

  // Trigger async virus scan (stub for now - just log that it would happen)
  console.log(`[STUB] Would trigger virus scan for document ${document.id}`)

  // Write AuditLog
  await logAuditEvent({
    userId: session.user.userId,
    companyId: session.user.companyId,
    action: AuditAction.DOCUMENT_UPLOADED,
    resourceType: 'Document',
    resourceId: document.id,
    ipAddress,
    userAgent,
    permissionsUsed: [Permission.UPLOAD_DOCUMENT],
    metadata: {
      fileKey,
      filename,
      fileSize,
      discipline,
      issuePurpose,
      watermarkSkipped: metadata?.watermarkSkipped || false,
    },
  })

  return NextResponse.json({
    documentId: document.id,
    status: document.status,
    watermarkStatus: document.watermarkStatus,
    ...(warning && { warning }),
  })
})
