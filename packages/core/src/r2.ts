import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/**
 * Cloudflare R2 integration for DocuRoute file storage.
 *
 * R2 is S3-compatible, so we use AWS SDK v3.
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 */

let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (\!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (\!accountId || \!accessKeyId || \!secretAccessKey) {
      throw new Error("R2 credentials not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY environment variables.")
    }

    r2Client = new S3Client({
      region: "auto",
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
 * getSignedUploadUrl
 *
 * Generates a presigned URL for direct client-to-R2 upload.
 * Expires in 15 minutes by default.
 *
 * @param fileKey - The R2 object key (e.g., "companyId/timestamp-uuid-filename.pdf")
 * @param contentType - MIME type for the file
 * @param expiresIn - Expiry time in seconds (default: 900 = 15 minutes)
 * @returns Object with uploadUrl and expiresAt timestamp
 */
export async function getSignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn: number = 900
): Promise<{ uploadUrl: string; expiresAt: string }> {
  const bucketName = process.env.R2_BUCKET_NAME

  if (\!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable not configured")
  }

  const client = getR2Client()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn })

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  return {
    uploadUrl,
    expiresAt,
  }
}

/**
 * headObject
 *
 * Checks if an object exists in R2 and returns its metadata.
 * Used to verify that a file was successfully uploaded before creating DB record.
 *
 * @param fileKey - The R2 object key
 * @returns Object metadata (ContentLength, ContentType, etc.) or null if not found
 */
export async function headObject(fileKey: string): Promise<{
  ContentLength?: number
  ContentType?: string
  ETag?: string
} | null> {
  const bucketName = process.env.R2_BUCKET_NAME

  if (\!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable not configured")
  }

  const client = getR2Client()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    const response = await client.send(command)

    return {
      ContentLength: response.ContentLength,
      ContentType: response.ContentType,
      ETag: response.ETag,
    }
  } catch (error: any) {
    // 404 - object not found
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * getSignedDownloadUrl
 *
 * Generates a presigned URL for downloading a file from R2.
 * Expires in 1 hour by default.
 *
 * @param fileKey - The R2 object key
 * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
 * @returns Presigned download URL
 */
export async function getSignedDownloadUrl(
  fileKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME

  if (\!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable not configured")
  }

  const client = getR2Client()

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  })

  return await getSignedUrl(client, command, { expiresIn })
}

