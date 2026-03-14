import { Worker, Queue } from 'bullmq'
import { getPrismaForCompany } from '@docuroute/db'
import { watermarkInChildProcess, saveCachedWatermark } from '@docuroute/core/src/watermark'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const watermarkQueue = new Queue('watermark', {
  connection: { url: REDIS_URL },
})

const watermarkWorker = new Worker(
  'watermark',
  async (job) => {
    const { documentRevisionId, companyId, latestRevisionCode, documentId, fileKey } = job.data

    try {
      // Fetch file from R2 (stub for now - implement R2 fetching in packages/core/src/r2.ts)
      // const fileBuffer = await fetchFromR2(fileKey)
      const fileBuffer = Buffer.from('') // Placeholder

      // Watermark in child process
      const watermarkedBuffer = await watermarkInChildProcess(
        fileBuffer,
        latestRevisionCode,
        documentId,
        documentRevisionId
      )

      // Save to R2 cache
      const watermarkFileKey = `watermarked/${fileKey}`
      await saveCachedWatermark(watermarkFileKey, watermarkedBuffer)

      // Update database
      const prisma = getPrismaForCompany(companyId)
      await prisma.documentRevision.update({
        where: { id: documentRevisionId },
        data: {
          watermarkStatus: 'COMPLETE',
          watermarkFileKey,
        },
      })

      return { success: true, watermarkFileKey }
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
      const prisma = getPrismaForCompany(companyId)
      await prisma.documentRevision.update({
        where: { id: documentRevisionId },
        data: { watermarkStatus },
      })

      throw error
    }
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60_000, // 10 jobs per 60 seconds
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
