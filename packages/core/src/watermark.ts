import workerpool from 'workerpool'
import path from 'path'

/**
 * POOL_SIZE = 2, MAX_WORKER_MEMORY_MB = 512
 * MAX_WATERMARK_SIZE_BYTES = 200MB (not 500MB  matches memory budget)
 *
 * Files > MAX_WATERMARK_SIZE_BYTES: return { watermarkApplied: false, reason: 'FILE_TOO_LARGE' }
 * The upload/confirm route MUST check this limit and warn the user when
 * issuePurpose === FOR_CONSTRUCTION  a FOR_CONSTRUCTION drawing without
 * a QR code is a field safety gap.
 *
 * Pool is a module-level singleton  created once, reused across all requests.
 * Terminated gracefully in process crash handlers (index.ts).
 */

const POOL_SIZE = 2
const MAX_WORKER_MEMORY_MB = 512
const MAX_WATERMARK_SIZE_BYTES = 200 * 1024 * 1024 // 200MB

type WorkerPool = ReturnType<typeof workerpool.pool>

let pool: WorkerPool | null = null

function getPool(): WorkerPool {
  if (!pool) {
    const workerPath = path.join(__dirname, '../scripts/watermark-child.js')
    pool = workerpool.pool(workerPath, {
      maxWorkers: POOL_SIZE,
      workerType: 'process',
      forkOpts: {
        execArgv: [`--max-old-space-size=${MAX_WORKER_MEMORY_MB}`],
      },
    })
  }
  return pool
}

export async function watermarkInChildProcess(
  inputBuffer: Buffer,
  latestRevisionCode: string,
  documentId: string,
  revisionId: string
): Promise<Buffer> {
  const fileSize = inputBuffer.length

  if (fileSize > MAX_WATERMARK_SIZE_BYTES) {
    throw new Error('FILE_TOO_LARGE')
  }

  try {
    const workerPool = getPool()

    // PERFORMANCE: Converting to base64 creates 33% memory overhead (200MB → 267MB)
    // TODO: Use temporary files instead for better memory efficiency
    // See docs/PERFORMANCE_ANALYSIS.md section 1.2 for implementation details
    const inputBase64 = inputBuffer.toString('base64')

    interface WatermarkResult {
      success: boolean
      buffer?: string
      reason?: string
    }

    const result = await workerPool.exec('watermarkPDF', [
      {
        inputBase64,
        latestRevisionCode,
        documentId,
        revisionId,
      },
    ]) as WatermarkResult

    if (!result.success) {
      throw new Error(result.reason || 'PROCESSING_ERROR')
    }

    // PERFORMANCE: Converting back from base64 allocates another buffer
    return Buffer.from(result.buffer!, 'base64')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Watermark child process error:', errorMessage)
    throw error
  }
}

export async function getCachedWatermark(fileKey: string): Promise<Buffer | null> {
  // PERFORMANCE: This is critical for avoiding duplicate watermark processing
  // Expected cache hit rate: 60-80% (same documents downloaded multiple times)
  try {
    const bucketName = process.env.R2_BUCKET_NAME

    if (!bucketName) {
      console.warn('R2_BUCKET_NAME not configured, watermark caching disabled')
      return null
    }

    // Import S3Client dynamically to avoid circular dependencies
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    const cacheKey = `watermarked/${fileKey}`
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cacheKey,
    })

    const response = await client.send(command)

    // Stream to buffer
    const chunks: Uint8Array[] = []
    const stream = response.Body as any
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  } catch (error: any) {
    // NoSuchKey means cache miss (not an error)
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    // Log other errors but don't fail - just return null (cache miss)
    console.warn('Watermark cache retrieval error:', error.message)
    return null
  }
}

export async function saveCachedWatermark(fileKey: string, buffer: Buffer): Promise<void> {
  // Cache strategy:
  //   - Key format: watermarked/{originalFileKey}
  //   - TTL: 7 days (revisions rarely change after approval)
  //   - Note: R2 doesn't support automatic expiration
  //     In Phase 2, implement cleanup job to delete cached files older than 7 days
  try {
    const bucketName = process.env.R2_BUCKET_NAME

    if (!bucketName) {
      console.warn('R2_BUCKET_NAME not configured, watermark caching disabled')
      return
    }

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    const cacheKey = `watermarked/${fileKey}`
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cacheKey,
      Body: buffer,
      ContentType: 'application/pdf',
    })

    await client.send(command)
  } catch (error: any) {
    // Don't fail watermark operation if cache save fails - just log warning
    console.warn('Watermark cache save error:', error.message)
  }
}

export async function terminatePool(): Promise<void> {
  if (pool) {
    await pool.terminate()
    pool = null
  }
}
