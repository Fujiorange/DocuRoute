import { Worker, Queue } from 'bullmq'
import { prismaAdmin } from '@docuroute/db'
import { getFileBuffer } from '@docuroute/core/src/r2'
import { extractTextFromPDF, isPDFExtractable } from '@docuroute/core/src/pdf-extraction'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const PDF_EXTRACTION_TIMEOUT = parseInt(process.env.PDF_EXTRACTION_TIMEOUT_SECONDS || '30', 10) * 1000

export const pdfExtractionQueue = new Queue('pdf-extraction', {
  connection: { url: REDIS_URL },
})

/**
 * PDF Text Extraction Worker
 *
 * Extracts text from PDFs for full-text search indexing.
 * Runs after document upload confirmation, before watermarking.
 *
 * Job data:
 * - documentId: string
 * - companyId: string
 * - fileKey: string
 * - mimeType: string
 * - revisionCode: string (e.g., "A", "B", "C")
 * - fileSize: number
 */
export const pdfExtractionWorker = new Worker(
  'pdf-extraction',
  async (job) => {
    const { documentId, companyId, fileKey, mimeType, revisionCode, fileSize } = job.data

    console.log(`[PDF Extraction] Starting extraction for document ${documentId}`)

    try {
      // Skip non-PDF files
      if (!isPDFExtractable(mimeType)) {
        console.log(`[PDF Extraction] Skipping non-PDF file: ${mimeType}`)
        return { success: true, skipped: true, reason: 'Not a PDF' }
      }

      // Download file from R2
      console.log(`[PDF Extraction] Downloading file from R2: ${fileKey}`)
      const fileBuffer = await getFileBuffer(fileKey)

      // Extract text with timeout protection
      console.log(`[PDF Extraction] Extracting text from PDF`)
      const extractionPromise = extractTextFromPDF(fileBuffer)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('EXTRACTION_TIMEOUT')), PDF_EXTRACTION_TIMEOUT)
      })

      const result = await Promise.race([extractionPromise, timeoutPromise])

      // Check if extraction failed
      if (result.error) {
        console.error(`[PDF Extraction] Extraction failed: ${result.error}`)
        // Don't throw - just skip indexing for this document
        return {
          success: false,
          error: result.error,
          documentId,
        }
      }

      // Store extracted text in DocumentContent table
      console.log(
        `[PDF Extraction] Storing ${result.extractedWords} words (${result.pageCount} pages)`
      )

      await prismaAdmin.documentContent.upsert({
        where: { documentId },
        create: {
          documentId,
          companyId,
          revisionCode,
          plainText: result.text,
          pageCount: result.pageCount,
          fileSize,
        },
        update: {
          revisionCode,
          plainText: result.text,
          pageCount: result.pageCount,
          fileSize,
          extractedAt: new Date(),
        },
      })

      // Update Document hasSearchableContent flag
      await prismaAdmin.document.update({
        where: { id: documentId },
        data: { hasSearchableContent: true },
      })

      console.log(`[PDF Extraction] Successfully indexed document ${documentId}`)

      return {
        success: true,
        documentId,
        pageCount: result.pageCount,
        extractedWords: result.extractedWords,
        truncated: result.truncated,
      }
    } catch (error: any) {
      console.error(`[PDF Extraction] Error processing document ${documentId}:`, error)

      // Handle timeout separately
      if (error.message === 'EXTRACTION_TIMEOUT') {
        console.error(`[PDF Extraction] Timeout after ${PDF_EXTRACTION_TIMEOUT / 1000}s`)
        // Don't retry timeouts - the PDF is too complex
        return {
          success: false,
          error: 'Extraction timeout - PDF too complex',
          documentId,
        }
      }

      throw error
    }
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 3, // Process up to 3 PDFs simultaneously
    limiter: {
      max: 20, // Max 20 extractions per minute
      duration: 60_000,
    },
    settings: {
      backoffStrategy: (attemptsMade) => {
        return Math.min(5000 * Math.pow(2, attemptsMade), 60000)
      },
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  }
)

pdfExtractionWorker.on('completed', (job) => {
  console.log(`[PDF Extraction] Job ${job.id} completed`)
})

pdfExtractionWorker.on('failed', async (job, err) => {
  console.error(`[PDF Extraction] Job ${job?.id} failed:`, err)

  // After all retries failed, log warning
  if (job && job.attemptsMade >= 3) {
    console.error(`[PDF Extraction] All retries exhausted for job ${job.id}`)
  }

  // Check failed queue size
  const failedCount = await pdfExtractionQueue.getFailedCount()
  if (failedCount > 20) {
    console.error(`[PDF Extraction] Failed queue has ${failedCount} jobs`)
  }
})
