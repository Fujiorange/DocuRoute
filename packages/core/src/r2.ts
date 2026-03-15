import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * R2 Storage Integration
 *
 * Cloudflare R2 is S3-compatible. Uses AWS SDK v3 with R2 endpoint.
 *
 * Configuration:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * SECURITY:
 *   - fileKey generation is SERVER-SIDE only (path traversal prevention)
 *   - Presigned URLs have 15-minute expiry
 *   - No client-supplied fileKeys accepted in API routes
 */

let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured')
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  return r2Client
}

/**
 * generateFileKey
 *
 * SERVER-SIDE file key generation. Never accept client-supplied fileKeys.
 * Format: {companyId}/{timestamp}-{randomId}/{filename}
 */
export function generateFileKey(companyId: string, filename: string): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  // Sanitize filename: remove path traversal attempts
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${companyId}/${timestamp}-${randomId}/${safeName}`
}

/**
 * generatePresignedUploadUrl
 *
 * Generates a presigned PUT URL for direct browser upload to R2.
 * Expiry: 15 minutes.
 */
export async function generatePresignedUploadUrl(
  fileKey: string,
  mimeType: string
): Promise<string> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME not configured')
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: mimeType,
  })

  const url = await getSignedUrl(client, command, { expiresIn: 15 * 60 })
  return url
}

/**
 * checkFileExists
 *
 * Verifies that a file exists in R2 (HEAD request).
 * Used in POST /api/upload/confirm to validate upload completion.
 */
export async function checkFileExists(fileKey: string): Promise<boolean> {
  try {
    const client = getR2Client()
    const bucketName = process.env.R2_BUCKET_NAME

    if (!bucketName) {
      throw new Error('R2_BUCKET_NAME not configured')
    }

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    await client.send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

/**
 * getFileFromR2
 *
 * Retrieves a file buffer from R2.
 * Used for watermarking pipeline and document downloads.
 */
export async function getFileFromR2(fileKey: string): Promise<Buffer> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME not configured')
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  })

  const response = await client.send(command)
  const stream = response.Body as any

  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

/**
 * uploadToR2
 *
 * Uploads a buffer to R2.
 * Used for watermarked file caching.
 */
export async function uploadToR2(
  fileKey: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME not configured')
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: buffer,
    ContentType: mimeType,
  })

  await client.send(command)
}
