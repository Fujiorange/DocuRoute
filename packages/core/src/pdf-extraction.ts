import pdfParse from 'pdf-parse'

/**
 * PDF Text Extraction Utility
 *
 * Extracts plain text from PDF files for full-text search indexing.
 * Uses pdf-parse library which handles various PDF formats.
 *
 * Performance considerations:
 * - For large PDFs (>50 pages), extraction can take several seconds
 * - Set timeout protection in worker (30 seconds max)
 * - For very large documents, truncate to first 1000 + last 500 words
 */

export interface PDFExtractionResult {
  text: string
  pageCount: number
  extractedWords: number
  truncated: boolean
  error?: string
}

/**
 * extractTextFromPDF
 *
 * Extracts text content from a PDF buffer.
 *
 * @param pdfBuffer - PDF file as Buffer
 * @param maxWords - Maximum words to extract (default: 1500 = ~1000 first + 500 last)
 * @returns Extraction result with text, page count, and metadata
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  maxWords: number = 1500
): Promise<PDFExtractionResult> {
  try {
    // Parse PDF
    const data = await pdfParse(pdfBuffer)

    // Clean text: remove excessive whitespace, normalize line breaks
    let cleanText = data.text
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\n+/g, '\n') // Collapse multiple newlines
      .trim()

    // Split into words for truncation if needed
    const words = cleanText.split(/\s+/)
    const totalWords = words.length
    let truncated = false

    // Truncate if too large (first 1000 + last 500 words)
    if (totalWords > maxWords) {
      const firstPart = words.slice(0, Math.floor(maxWords * 0.66)).join(' ')
      const lastPart = words.slice(-Math.floor(maxWords * 0.34)).join(' ')
      cleanText = `${firstPart}\n[... truncated ...]\n${lastPart}`
      truncated = true
    }

    return {
      text: cleanText,
      pageCount: data.numpages,
      extractedWords: truncated ? maxWords : totalWords,
      truncated,
    }
  } catch (error: any) {
    console.error('PDF text extraction error:', error)
    return {
      text: '',
      pageCount: 0,
      extractedWords: 0,
      truncated: false,
      error: error.message || 'Unknown extraction error',
    }
  }
}

/**
 * isPDFExtractable
 *
 * Quick check if a file is a PDF that can be extracted.
 * Checks MIME type only (lightweight check before queuing).
 *
 * @param mimeType - File MIME type
 * @returns true if file is extractable PDF
 */
export function isPDFExtractable(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
