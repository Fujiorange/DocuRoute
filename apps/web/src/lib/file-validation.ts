import { createHash } from 'crypto'
import { Readable } from 'stream'

/**
 * File validation utilities for upload security
 *
 * CRITICAL FIX: Post-upload hash and file type validation
 * - Verifies uploaded file matches claimed SHA256 hash
 * - Detects actual file type using magic bytes (not just MIME type)
 * - Prevents file substitution attacks and malicious file uploads
 */

export interface FileValidationResult {
  isValid: boolean
  actualHash: string
  detectedMimeType: string
  detectedExtension: string
  error?: string
}

/**
 * Magic bytes for common engineering file types
 * Key = magic byte signature, Value = { mime, ext }
 */
const MAGIC_BYTES = new Map<string, { mime: string; ext: string }>([
  ['%PDF', { mime: 'application/pdf', ext: 'pdf' }],
  ['PK\x03\x04', { mime: 'application/zip', ext: 'zip' }], // ZIP, DOCX, XLSX, etc.
  ['‰PNG', { mime: 'image/png', ext: 'png' }],
  ['ÿØÿ', { mime: 'image/jpeg', ext: 'jpg' }],
  ['GIF87a', { mime: 'image/gif', ext: 'gif' }],
  ['GIF89a', { mime: 'image/gif', ext: 'gif' }],
  ['RIFF', { mime: 'image/webp', ext: 'webp' }], // Check for WEBP after RIFF
  ['II*\x00', { mime: 'image/tiff', ext: 'tif' }], // TIFF little-endian
  ['MM\x00*', { mime: 'image/tiff', ext: 'tif' }], // TIFF big-endian
  ['<?xml', { mime: 'application/xml', ext: 'xml' }],
  ['Rar!', { mime: 'application/x-rar-compressed', ext: 'rar' }],
  ['7z¼¯\x27\x1c', { mime: 'application/x-7z-compressed', ext: '7z' }],
  // AutoCAD DWG files
  ['AC1', { mime: 'application/acad', ext: 'dwg' }],
])

/**
 * Validate uploaded file from R2
 *
 * Downloads file stream, validates hash and size, detects file type from magic bytes
 *
 * @param stream - Readable stream from R2
 * @param expectedHash - SHA256 hash submitted by client
 * @param expectedSize - File size in bytes submitted by client
 * @returns FileValidationResult with validation details
 */
export async function validateUploadedFile(
  stream: Readable,
  expectedHash: string,
  expectedSize: number
): Promise<FileValidationResult> {
  const chunks: Buffer[] = []
  let actualSize = 0
  const hash = createHash('sha256')

  try {
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
      actualSize += chunk.length
      hash.update(chunk)

      // Early exit if size exceeds expected (prevent memory exhaustion)
      if (actualSize > expectedSize + 1024) {
        return {
          isValid: false,
          actualHash: '',
          detectedMimeType: '',
          detectedExtension: '',
          error: 'FILE_SIZE_MISMATCH',
        }
      }
    }

    const actualHash = hash.digest('hex')
    const buffer = Buffer.concat(chunks)

    // Check size
    if (actualSize !== expectedSize) {
      return {
        isValid: false,
        actualHash,
        detectedMimeType: '',
        detectedExtension: '',
        error: 'FILE_SIZE_MISMATCH',
      }
    }

    // Check hash
    if (actualHash !== expectedHash) {
      return {
        isValid: false,
        actualHash,
        detectedMimeType: '',
        detectedExtension: '',
        error: 'FILE_HASH_MISMATCH',
      }
    }

    // Detect file type from magic bytes
    const detected = detectFileType(buffer)

    return {
      isValid: true,
      actualHash,
      detectedMimeType: detected.mime,
      detectedExtension: detected.ext,
    }
  } catch (error) {
    console.error('File validation error:', error)
    return {
      isValid: false,
      actualHash: '',
      detectedMimeType: '',
      detectedExtension: '',
      error: 'VALIDATION_ERROR',
    }
  }
}

/**
 * Detect file type from magic bytes
 *
 * @param buffer - File buffer (first 1024 bytes sufficient)
 * @returns Object with mime type and extension
 */
function detectFileType(buffer: Buffer): { mime: string; ext: string } {
  // Check magic bytes
  const header = buffer.slice(0, 1024)

  for (const [magic, info] of MAGIC_BYTES) {
    // Convert magic string to buffer for comparison
    const magicBuffer = Buffer.from(magic, 'binary')
    if (header.slice(0, magicBuffer.length).equals(magicBuffer)) {
      // Special case: ZIP files could be DOCX, XLSX, etc.
      if (magic === 'PK\x03\x04') {
        return detectZipBasedFormat(buffer) || info
      }
      // Special case: RIFF files could be WEBP or other formats
      if (magic === 'RIFF' && header.includes(Buffer.from('WEBP', 'binary'))) {
        return { mime: 'image/webp', ext: 'webp' }
      }
      return info
    }
  }

  // No magic bytes matched
  return { mime: 'application/octet-stream', ext: '' }
}

/**
 * Detect ZIP-based formats (DOCX, XLSX, etc.)
 *
 * @param buffer - File buffer
 * @returns Detected format or null
 */
function detectZipBasedFormat(buffer: Buffer): { mime: string; ext: string } | null {
  const content = buffer.toString('binary')

  // Check for Office Open XML formats
  if (content.includes('word/')) {
    return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' }
  }
  if (content.includes('xl/')) {
    return { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' }
  }
  if (content.includes('ppt/')) {
    return { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' }
  }

  return null
}
