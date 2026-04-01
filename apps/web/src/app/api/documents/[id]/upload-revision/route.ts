import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction, WatermarkStatus } from '@docuroute/types'
import { unauthorized, notFound, validationError, conflict } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { incrementRevisionCode } from '@docuroute/core/src/revision'
import { getSignedUploadUrl, headObject } from '@docuroute/core/src/r2'
import { validateUploadedFile } from '@/lib/file-validation'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

/**
 * POST /api/documents/[id]/upload-revision
 *
 * Upload a new revision for an existing document.
 *
 * STRICT REVISION ENGINE RULES:
 * 1. Get current revision (status = "CURRENT")
 * 2. Mark current revision as SUPERSEDED (atomic transaction)
 * 3. Calculate next revision code (A → B → C → ... → Z → AA)
 * 4. Upload file to R2 storage
 * 5. Create new DocumentRevision with status = "CURRENT"
 * 6. Only ONE current revision allowed per document
 *
 * Permission required: UPLOAD_DOCUMENT
 *
 * Request body:
 * {
 *   fileKey: string,        // File key from presigned upload
 *   filename: string,       // Original filename
 *   sha256Hash: string,     // Client-calculated hash
 *   fileSize: number,       // File size in bytes
 *   mimeType: string,       // MIME type
 *   discipline?: string,    // Optional: Engineering discipline
 *   issuePurpose?: string   // Optional: Issue purpose
 * }
 *
 * Response:
 * {
 *   revision: {
 *     id: string,
 *     documentId: string,
 *     revisionCode: string,
 *     status: "CURRENT",
 *     ...
 *   },
 *   previousRevisionCode: string
 * }
 */

const uploadRevisionSchema = z.object({
  fileKey: z.string().min(1),
  filename: z.string().min(1).max(255),
  sha256Hash: z.string().length(64),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  discipline: z.string().optional(),
  issuePurpose: z.string().optional(),
})

export const POST = withApiHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw unauthorized()
    }

    // Permission check
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

    const documentId = params.id

    // Parse request body
    const body = await req.json()
    const validation = uploadRevisionSchema.safeParse(body)

    if (!validation.success) {
      throw validationError('Invalid request body', validation.error.errors)
    }

    const { fileKey, filename, sha256Hash, fileSize, mimeType, discipline, issuePurpose } =
      validation.data

    const prisma = getPrismaForCompany(session.user.companyId)

    // Verify document exists and user has access
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
      },
    })

    if (!document) {
      throw notFound('Document not found')
    }

    // Verify file exists in R2
    const r2Object = await headObject(fileKey)
    if (!r2Object) {
      throw notFound('File not found in storage. Upload may have failed.')
    }

    // Download file from R2 and validate hash + detect actual file type
    const accountId = process.env.R2_ACCOUNT_ID
    const bucketName = process.env.R2_BUCKET_NAME
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    const r2Response = await r2Client.send(getObjectCommand)
    const stream = r2Response.Body as Readable

    // Validate file integrity
    const validationResult = await validateUploadedFile(stream, sha256Hash, fileSize)

    if (!validationResult.valid) {
      throw validationError('File validation failed', {
        reason: validationResult.reason,
        detectedHash: validationResult.actualHash,
        detectedSize: validationResult.actualSize,
      })
    }

    // ATOMIC TRANSACTION: Supersede current revision and create new one
    // This ensures only ONE current revision exists at any time
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current revision
      const currentRevisions = await tx.documentRevision.findMany({
        where: {
          documentId: documentId,
          companyId: session.user.companyId,
          status: 'CURRENT',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Enforce: ONLY ONE current revision
      if (currentRevisions.length === 0) {
        throw conflict('No current revision found. Document may be in invalid state.')
      }

      if (currentRevisions.length > 1) {
        throw conflict(
          `Multiple current revisions found (${currentRevisions.length}). Database consistency violation.`
        )
      }

      const currentRevision = currentRevisions[0]

      // 2. Calculate next revision code
      let nextRevisionCode: string
      try {
        nextRevisionCode = incrementRevisionCode(currentRevision.revisionCode)
      } catch (error) {
        throw validationError(
          `Cannot increment revision code "${currentRevision.revisionCode}": ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }

      // 3. Mark current revision as SUPERSEDED
      await tx.documentRevision.update({
        where: {
          id: currentRevision.id,
        },
        data: {
          status: 'SUPERSEDED',
        },
      })

      // Log superseded event
      await logAuditEvent({
        userId: session.user.id,
        companyId: session.user.companyId,
        action: AuditAction.REVISION_SUPERSEDED,
        resourceType: 'DocumentRevision',
        resourceId: currentRevision.id,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        permissionsUsed: [Permission.UPLOAD_DOCUMENT],
        metadata: {
          documentId: documentId,
          documentCode: document.documentCode,
          revisionCode: currentRevision.revisionCode,
          supersededBy: nextRevisionCode,
        },
      })

      // 4. Create new revision with status = CURRENT
      const newRevision = await tx.documentRevision.create({
        data: {
          documentId: documentId,
          companyId: session.user.companyId,
          revisionCode: nextRevisionCode,
          fileKey: fileKey,
          fileSize: fileSize,
          sha256Hash: sha256Hash,
          discipline: discipline || currentRevision.discipline,
          issuePurpose: issuePurpose || currentRevision.issuePurpose,
          status: 'CURRENT',
          watermarkStatus: WatermarkStatus.PENDING,
          uploadedBy: session.user.id,
        },
      })

      // Log revision created event
      await logAuditEvent({
        userId: session.user.id,
        companyId: session.user.companyId,
        action: AuditAction.REVISION_CREATED,
        resourceType: 'DocumentRevision',
        resourceId: newRevision.id,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        permissionsUsed: [Permission.UPLOAD_DOCUMENT],
        metadata: {
          documentId: documentId,
          documentCode: document.documentCode,
          revisionCode: nextRevisionCode,
          previousRevisionCode: currentRevision.revisionCode,
          filename: filename,
          fileSize: fileSize,
          mimeType: mimeType,
          discipline: discipline,
          issuePurpose: issuePurpose,
        },
      })

      return {
        revision: newRevision,
        previousRevisionCode: currentRevision.revisionCode,
      }
    })

    return new Response(
      JSON.stringify({
        revision: result.revision,
        previousRevisionCode: result.previousRevisionCode,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
)
