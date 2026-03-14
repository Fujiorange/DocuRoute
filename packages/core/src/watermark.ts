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

let pool: any = null

function getPool(): any {
  if (!pool) {
    const workerPath = path.join(__dirname, '../scripts/watermark-child.js')
    pool = workerpool.pool(workerPath, {
      maxWorkers: POOL_SIZE,
      workerType: 'process',
      forkOpts: {
        execArgv: [`--max-old-space-size=${MAX_WORKER_MEMORY_MB}`],
      },
    } as any)
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

    const result: any = await workerPool.exec('watermarkPDF', [
      {
        inputBase64,
        latestRevisionCode,
        documentId,
        revisionId,
      },
    ])

    if (!result.success) {
      throw new Error(result.reason || 'PROCESSING_ERROR')
    }

    // PERFORMANCE: Converting back from base64 allocates another buffer
    return Buffer.from(result.buffer, 'base64')
  } catch (error: any) {
    console.error('Watermark child process error:', error)
    throw error
  }
}

export async function getCachedWatermark(fileKey: string): Promise<Buffer | null> {
  // TODO: Implement R2 retrieval with key: watermarked/{fileKey}
  // PERFORMANCE: This is critical for avoiding duplicate watermark processing
  // Expected cache hit rate: 60-80% (same documents downloaded multiple times)
  // See docs/PERFORMANCE_ANALYSIS.md section 1.3 for implementation example
  return null
}

export async function saveCachedWatermark(fileKey: string, buffer: Buffer): Promise<void> {
  // TODO: Implement R2 upload with key: watermarked/{fileKey}
  // Cache strategy:
  //   - Key format: watermarked/{originalFileKey}-{latestRevisionCode}
  //   - TTL: 7 days (revisions rarely change after approval)
  // See docs/PERFORMANCE_ANALYSIS.md section 1.3 for implementation example
}

export async function terminatePool(): Promise<void> {
  if (pool) {
    await pool.terminate()
    pool = null
  }
}
