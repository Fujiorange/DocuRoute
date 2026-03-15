import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { Permission, IssuePurpose } from '@docuroute/types'
import { validationError } from '@docuroute/core/src/errors'
import { generateFileKey, generatePresignedUploadUrl } from '@docuroute/core/src/r2'

/**
 * POST /api/upload/presign
 *
 * Generates presigned upload URL for direct browser ’ R2 upload.
 *
 * Permission: UPLOAD_DOCUMENT
 * Body: { filename, mimeType, fileSize, discipline?, issuePurpose? }
 *
 * File type allowlist: PDF, DWG, DXF, XLSX, DOCX, PNG, JPG
 * Max fileSize: 500MB
 *
 * WATERMARK SIZE GATE (Case A):
 *   If fileSize > 200MB AND issuePurpose === FOR_CONSTRUCTION:
 *     Return warning payload with requiresAcknowledgment: true
 *     Frontend MUST show confirmation modal before upload
 *
 * Returns: { uploadUrl, fileKey, expiresAt, warning? }
 *
 * SECURITY:
 *   - fileKey generated SERVER-SIDE (path traversal prevention)
 *   - Client cannot supply custom fileKey
 */

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/vnd.dwg',
  'image/vnd.dxf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
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
  const { filename, mimeType, fileSize, discipline, issuePurpose } = body

  // Validation
  if (!filename || typeof filename !== 'string') {
    throw validationError('filename', 'Required')
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw validationError('mimeType', 'Required')
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw validationError('mimeType', `File type not allowed. Allowed types: PDF, DWG, DXF, XLSX, DOCX, PNG, JPG`)
  }

  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw validationError('fileSize', 'Must be a positive number')
  }

  if (fileSize > MAX_FILE_SIZE) {
    throw validationError('fileSize', `File size exceeds maximum of 500MB`)
  }

  // WATERMARK SIZE GATE (Case A)
  // If FOR_CONSTRUCTION and > 200MB, return warning requiring acknowledgment
  let warning: any = undefined

  if (
    issuePurpose === IssuePurpose.FOR_CONSTRUCTION &&
    fileSize > MAX_WATERMARK_SIZE
  ) {
    warning = {
      proceedAllowed: true,
      warning: 'WATERMARK_SKIPPED_TOO_LARGE',
      requiresAcknowledgment: true,
      message:
        'This file exceeds 200MB. QR status verification cannot be embedded. ' +
        'Field workers will not have a QR code to scan on this drawing. ' +
        'Consider splitting the file or using an alternate issue purpose.',
    }
  }

  // Generate fileKey (SERVER-SIDE)
  const fileKey = generateFileKey(session.user.companyId, filename)

  // Generate presigned URL (15 min expiry)
  const uploadUrl = await generatePresignedUploadUrl(fileKey, mimeType)

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  return new Response(
    JSON.stringify({
      uploadUrl,
      fileKey,
      expiresAt,
      ...(warning && { warning }),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
