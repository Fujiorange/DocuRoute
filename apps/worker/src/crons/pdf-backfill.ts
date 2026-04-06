import { CronJob } from 'cron'
import { prismaAdmin } from '@docuroute/db'
import { pdfExtractionQueue } from '../workers/pdf-extraction.worker'

/**
 * PDF Content Backfill Cron
 *
 * Processes existing PDF documents in batches to extract text for full-text search.
 * Runs once per day (or can be triggered manually).
 *
 * Processing strategy:
 * - Find documents without DocumentContent entries
 * - Filter to PDFs only (application/pdf)
 * - Process in batches of 50 to avoid overwhelming the queue
 * - Skip if more than 100 PDFs already queued
 */

const BATCH_SIZE = 50
const MAX_QUEUE_SIZE = 100

export const pdfBackfillCron = new CronJob(
  '0 3 * * *', // Daily at 3:00 AM UTC (after view log retention cleanup)
  async () => {
    console.log('[PDF Backfill] Starting backfill job...')

    try {
      // Check current queue size
      const queueSize = await pdfExtractionQueue.count()
      if (queueSize > MAX_QUEUE_SIZE) {
        console.log(
          `[PDF Backfill] Queue has ${queueSize} jobs, skipping backfill to avoid overload`
        )
        return
      }

      // Find documents without content that are PDFs
      const unindexedDocuments = await prismaAdmin.document.findMany({
        where: {
          mimeType: 'application/pdf',
          hasSearchableContent: false,
          content: null,
        },
        select: {
          id: true,
          companyId: true,
          fileKey: true,
          mimeType: true,
          fileSize: true,
        },
        take: BATCH_SIZE,
        orderBy: {
          createdAt: 'desc', // Process newer documents first
        },
      })

      console.log(`[PDF Backfill] Found ${unindexedDocuments.length} unindexed PDFs`)

      if (unindexedDocuments.length === 0) {
        console.log('[PDF Backfill] No documents to process')
        return
      }

      // Queue extraction jobs
      let queued = 0
      for (const doc of unindexedDocuments) {
        try {
          await pdfExtractionQueue.add(
            'backfill',
            {
              documentId: doc.id,
              companyId: doc.companyId,
              fileKey: doc.fileKey,
              mimeType: doc.mimeType,
              revisionCode: 'A', // Assume revision A for backfill (Phase 1 limitation)
              fileSize: doc.fileSize,
            },
            {
              priority: 10, // Lower priority than new uploads (priority 1)
              attempts: 2, // Fewer retries for backfill
              backoff: {
                type: 'exponential',
                delay: 10000,
              },
            }
          )
          queued++
        } catch (error) {
          console.error(`[PDF Backfill] Failed to queue document ${doc.id}:`, error)
        }
      }

      console.log(`[PDF Backfill] Queued ${queued}/${unindexedDocuments.length} documents`)
    } catch (error) {
      console.error('[PDF Backfill] Fatal error during backfill:', error)
    }
  },
  null, // onComplete callback
  false, // start immediately (set to true to start automatically)
  'UTC' // timezone
)

/**
 * Start the backfill cron job
 */
export function startPDFBackfill() {
  pdfBackfillCron.start()
  console.log('[PDF Backfill] Cron job started (runs daily at 3:00 AM UTC)')
}

/**
 * Manual backfill trigger
 * Can be called via API endpoint for one-time backfill
 */
export async function triggerManualBackfill(batchSize: number = BATCH_SIZE): Promise<number> {
  console.log('[PDF Backfill] Manual trigger started...')

  const unindexedDocuments = await prismaAdmin.document.findMany({
    where: {
      mimeType: 'application/pdf',
      hasSearchableContent: false,
      content: null,
    },
    select: {
      id: true,
      companyId: true,
      fileKey: true,
      mimeType: true,
      fileSize: true,
    },
    take: batchSize,
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log(`[PDF Backfill] Manual trigger found ${unindexedDocuments.length} documents`)

  let queued = 0
  for (const doc of unindexedDocuments) {
    try {
      await pdfExtractionQueue.add(
        'backfill-manual',
        {
          documentId: doc.id,
          companyId: doc.companyId,
          fileKey: doc.fileKey,
          mimeType: doc.mimeType,
          revisionCode: 'A',
          fileSize: doc.fileSize,
        },
        {
          priority: 5, // Medium priority
          attempts: 2,
        }
      )
      queued++
    } catch (error) {
      console.error(`[PDF Backfill] Failed to queue document ${doc.id}:`, error)
    }
  }

  console.log(`[PDF Backfill] Manual trigger queued ${queued} documents`)
  return queued
}
