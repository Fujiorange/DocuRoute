import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { requirePermission, withApiHandler } from '@/lib/auth'
import { getSignedUploadUrl } from '@docuroute/core/src/r2'
import {
  Permission,
  EngineeringDiscipline,
  IssuePurpose,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_WATERMARK_SIZE_BYTES,
} from '@docuroute/types'
import { validationError } from '@docuroute/core/src/errors'
import { authOptions } from '../../auth/[...nextauth]/route'
import crypto from 'crypto'

/**
 * POST /api/upload/presign
 *
 * Generates a presigned URL for direct client-to-R2 upload.
 * Implements watermark size gate Case A (pre-upload warning).
 *
 * Permission: UPLOAD_DOCUMENT
 */

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
  discipline: z.nativeEnum(EngineeringDiscipline).optional(),
  issuePurpose: z.nativeEnum(IssuePurpose).optional(),
})

// Server-side file type allowlist
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/vnd.dwg',
  'image/vnd.dxf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'image/png',
  'image/jpeg',
]

const ALLOWED_EXTENSIONS = [
  '.pdf', '.dwg', '.dxf', '.xlsx', '.docx', '.png', '.jpg', '.jpeg',
]

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
  const validation = presignSchema.safeParse(body)

  if (!validation.success) {
    throw validationError('Invalid request body', validation.error.errors)
  }

  const { filename, mimeType, fileSize, discipline, issuePurpose } = validation.data

  // Server-side file type validation
  const fileExtension = filename.substring(filename.lastIndexOf('.')).toLowerCase()

  const allowedExtensionsStr = ALLOWED_EXTENSIONS.join(', ')
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    throw validationError(
      `File type not allowed. Allowed types: ${allowedExtensionsStr}`,
      { allowedTypes: ALLOWED_EXTENSIONS }
    )
  }

  // MIME type validation (defense in depth)
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw validationError(
      'MIME type not allowed',
      { allowedMimeTypes: ALLOWED_MIME_TYPES }
    )
  }

  // Generate server-side fileKey - never accept client key
  const timestamp = Date.now()
  const randomId = crypto.randomUUID()
  const fileKey = `${session.user.companyId}/${timestamp}-${randomId}-${filename}`

  // WATERMARK SIZE GATE - Case A (pre-upload warning)
  let warning: any = undefined

  if (
    fileSize > MAX_WATERMARK_SIZE_BYTES &&
    issuePurpose === IssuePurpose.FOR_CONSTRUCTION
  ) {
    warning = {
      proceedAllowed: true,
      warning: 'WATERMARK_SKIPPED_TOO_LARGE',
      requiresAcknowledgment: true,
      message:
        'This file exceeds 200MB. QR status verification cannot be embedded. Field workers will not have a QR code to scan on this drawing. Consider splitting the file or using an alternate issue purpose.',
    }
  }

  // Get presigned URL from R2 (15 min expiry)
  const { uploadUrl, expiresAt } = await getSignedUploadUrl(fileKey, mimeType, 900)

  return NextResponse.json({
    uploadUrl,
    fileKey,
    expiresAt,
    ...(warning && { warning }),
  })
})
