import { Worker, Queue } from 'bullmq'
import { getPrismaForCompany } from '@docuroute/db'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const PDF_WORKER_URL = process.env.PDF_WORKER_URL || 'http://localhost:8080'

const watermarkQueue = new Queue('watermark', {
  connection: { url: REDIS_URL },
})

const watermarkWorker = new Worker(
  'watermark',
  async (job) => {
    const { documentRevisionId, companyId, latestRevisionCode, documentId, fileKey } = job.data

    try {
      // Call Go microservice for watermarking
      const response = await fetch(`${PDF_WORKER_URL}/watermark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          documentId,
          revisionId: documentRevisionId,
          revisionCode: latestRevisionCode,
          issuePurpose: job.data.issuePurpose || 'UNKNOWN',
          companyId,
        }),
        // Timeout for large files (5 minutes)
        signal: AbortSignal.timeout(300000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`PDF worker failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Watermarking failed')
      }

      // Update database with watermarked file key
      const prisma = getPrismaForCompany(companyId) as any
      await prisma.documentRevision.update({
        where: { id: documentRevisionId },
        data: {
          watermarkStatus: 'COMPLETE',
          watermarkFileKey: result.watermarkedKey,
        },
      })

      return { success: true, watermarkFileKey: result.watermarkedKey }
    } catch (error: any) {
      console.error('Watermark worker error:', error)

      // Determine failure reason
      let watermarkStatus = 'FAILED'
      if (error.message === 'FILE_TOO_LARGE') {
        watermarkStatus = 'SKIPPED_TOO_LARGE'
      } else if (error.message === 'ENCRYPTED') {
        watermarkStatus = 'SKIPPED_ENCRYPTED'
      }

      // Update database with failure status
      const prisma = getPrismaForCompany(companyId) as any
      await prisma.documentRevision.update({
        where: { id: documentRevisionId },
        data: { watermarkStatus },
      })

      throw error
    }
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 4, // Increased from 2 - Go service can handle more concurrency
    limiter: {
      max: 20, // Increased from 10 - better throughput with Go
      duration: 60_000, // 20 jobs per 60 seconds
    },
    settings: {
      backoffStrategy: (attemptsMade) => {
        return Math.min(1000 * Math.pow(2, attemptsMade), 30000)
      },
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  }
)

watermarkWorker.on('completed', (job) => {
  console.log(`Watermark job ${job.id} completed`)
})

watermarkWorker.on('failed', async (job, err) => {
  console.error(`Watermark job ${job?.id} failed:`, err)

  // After all retries failed, email DOCUMENT_CONTROLLER
  if (job && job.attemptsMade >= 3) {
    // TODO: Send email notification
    console.error(`All retries exhausted for watermark job ${job.id}`)
  }

  // Check failed queue size
  const failedCount = await watermarkQueue.getFailedCount()
  if (failedCount > 10) {
    // TODO: Alert PLATFORM_ADMIN_EMAIL
    console.error(`Failed watermark queue has ${failedCount} jobs`)
  }
})

export { watermarkWorker, watermarkQueue }
