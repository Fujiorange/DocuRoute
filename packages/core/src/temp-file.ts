import { writeFile, unlink, mkdtemp, readFile, rmdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * Temporary file utilities for file-based IPC
 *
 * CRITICAL FIX: Replaces base64 encoding for PDF watermarking
 * - Base64 encoding creates 33% memory overhead (200MB → 267MB)
 * - File-based IPC streams data without full buffer allocation
 * - Prevents OOM crashes for files >150MB
 */

/**
 * Create a temporary file with the given buffer content
 *
 * @param buffer - Buffer to write to temp file
 * @param prefix - Prefix for temp directory (default: 'docuroute-')
 * @returns Path to the created temporary file
 */
export async function createTempFile(
  buffer: Buffer,
  prefix: string = 'docuroute-'
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), prefix))
  const tempPath = join(tempDir, `${randomBytes(16).toString('hex')}.pdf`)
  await writeFile(tempPath, buffer)
  return tempPath
}

/**
 * Read and delete a temporary file
 *
 * @param filePath - Path to temporary file
 * @returns Buffer content of the file
 */
export async function readAndDeleteTempFile(filePath: string): Promise<Buffer> {
  const buffer = await readFile(filePath)
  await cleanupTempFile(filePath)
  return buffer
}

/**
 * Clean up a temporary file and its parent directory
 *
 * @param filePath - Path to temporary file
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath).catch(() => {})
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    await rmdir(dir).catch(() => {})
  } catch (error) {
    console.warn('Failed to cleanup temp file:', filePath, error)
  }
}
