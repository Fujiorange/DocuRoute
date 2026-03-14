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

let pool: workerpool.WorkerPool | null = null

function getPool(): workerpool.WorkerPool {
  if (!pool) {
    const workerPath = path.join(__dirname, '../scripts/watermark-child.js')
    pool = workerpool.pool(workerPath, {
      maxWorkers: POOL_SIZE,
      workerType: 'process',
      forkOpts: {
        execArgv: [`--max-old-space-size=${MAX_WORKER_MEMORY_MB}`],
      },
      timeout: 60_000, // 60 seconds
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

    return Buffer.from(result.buffer, 'base64')
  } catch (error: any) {
    console.error('Watermark child process error:', error)
    throw error
  }
}

export async function getCachedWatermark(fileKey: string): Promise<Buffer | null> {
  // TODO: Implement R2 retrieval with key: watermarked/{fileKey}
  // For now, return null (cache miss)
  return null
}

export async function saveCachedWatermark(fileKey: string, buffer: Buffer): Promise<void> {
  // TODO: Implement R2 upload with key: watermarked/{fileKey}
  // For now, no-op
}

export async function terminatePool(): Promise<void> {
  if (pool) {
    await pool.terminate()
    pool = null
  }
}
