/**
 * CommonJS module. Executed as a workerpool worker.
 * EXPORT PATTERN: module.exports = { watermarkPDF }
 * NOT process.on('message')  workerpool uses the task export pattern.
 *
 * CRITICAL  cross-package require at runtime:
 * This file is NOT compiled by tsc (it is CommonJS, copied as-is to dist/).
 * Do NOT require('../../../packages/core/src/qr-verification') 
 * that relative path resolves in source but breaks from dist/scripts/.
 *
 * Instead: inline the QR generation logic directly using require('qrcode').
 * This eliminates the cross-package path dependency entirely.
 *
 * Memory: pdf-lib requires the full file in memory (no streaming API).
 * Each pool slot is capped at --max-old-space-size=512 by watermark.ts.
 * OOM kills only this slot  workerpool restarts it. Main process unaffected.
 *
 * WATERMARK SIZE LIMIT: 200MB (MAX_WATERMARK_SIZE_BYTES in watermark.ts).
 * Upload limit is 500MB. Files 200500MB will be SKIPPED_TOO_LARGE.
 * Caller (upload confirm route) must warn the user at upload time if
 * issuePurpose === FOR_CONSTRUCTION and fileSize > 200MB.
 */

const qrcode = require('qrcode')
const { PDFDocument, rgb, degrees } = require('pdf-lib')

async function generateQRCodeInline(documentId, revisionId) {
  const baseUrl = process.env.QR_VERIFICATION_BASE_URL || 'https://docuroute.io'
  const url = `${baseUrl}/verify/${documentId}?rev=${revisionId}`
  return qrcode.toDataURL(url, { errorCorrectionLevel: 'H', width: 200 })
}

async function watermarkPDF({ inputBase64, latestRevisionCode, documentId, revisionId }) {
  try {
    // Load PDF from base64
    const pdfBytes = Buffer.from(inputBase64, 'base64')
    let pdfDoc

    try {
      pdfDoc = await PDFDocument.load(pdfBytes)
    } catch (loadError) {
      // PDF is encrypted or corrupted
      if (loadError.message && loadError.message.includes('encrypted')) {
        return { success: false, reason: 'ENCRYPTED' }
      }
      return { success: false, reason: 'PROCESSING_ERROR', error: loadError.message }
    }

    // Generate QR code
    const qrDataUrl = await generateQRCodeInline(documentId, revisionId)
    const qrImage = await pdfDoc.embedPng(qrDataUrl)

    // Get pages
    const pages = pdfDoc.getPages()

    // Watermark each page
    for (const page of pages) {
      const { width, height } = page.getSize()

      // Add "SUPERSEDED" watermark text (tiled, 45°, red, 48pt)
      const text = 'SUPERSEDED'
      const fontSize = 48
      const textWidth = fontSize * text.length * 0.6 // Approximate
      const spacing = 150

      page.pushOperators(
        // Save graphics state
        ...page.doc.context.save(),
        // Set text rendering mode to stroke (outline)
        ...page.doc.context.setTextRenderingMode(1),
        // Set stroke color to red
        ...page.doc.context.setStrokingColor(rgb(0.8, 0, 0)),
        // Set line width
        ...page.doc.context.setLineWidth(1)
      )

      for (let x = -width; x < width * 2; x += spacing) {
        for (let y = -height; y < height * 2; y += spacing) {
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            color: rgb(0.8, 0, 0),
            opacity: 0.2,
            rotate: degrees(45),
          })
        }
      }

      page.pushOperators(...page.doc.context.restore())

      // Add QR code bottom-right (140×140px)
      const qrSize = 140
      const qrX = width - qrSize - 20
      const qrY = 20

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      })

      // Add "Scan to verify" text below QR (8pt)
      page.drawText('Scan to verify', {
        x: qrX + 10,
        y: qrY - 15,
        size: 8,
        color: rgb(0.2, 0.2, 0.2),
      })
    }

    // Save PDF
    const watermarkedBytes = await pdfDoc.save()
    const resultBase64 = Buffer.from(watermarkedBytes).toString('base64')

    return { success: true, buffer: resultBase64 }
  } catch (error) {
    console.error('Watermark processing error:', error)
    return { success: false, reason: 'PROCESSING_ERROR', error: error.message }
  }
}

module.exports = { watermarkPDF }
