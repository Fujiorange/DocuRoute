/**
 * BIM Equipment Import
 *
 * Handles automated import of BIM equipment data from CSV files in watch folders.
 * Supports conflict detection and batch processing.
 */

import { getPrismaForCompany } from '@docuroute/db'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface BIMEquipmentRow {
  tag: string
  description?: string
  discipline?: string
  area?: string
  type?: string
  bimModelId?: string
  [key: string]: string | undefined
}

export interface ImportConflict {
  row: number
  tag: string
  issue: string
  severity: 'error' | 'warning'
}

export interface ImportResult {
  imported: number
  conflicts: ImportConflict[]
  processedFiles: string[]
}

/**
 * List CSV files in a folder
 */
export async function listFilesInFolder(folderPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    return entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
      .map(entry => path.join(folderPath, entry.name))
  } catch (error) {
    console.error(`Failed to list files in ${folderPath}:`, error)
    return []
  }
}

/**
 * Parse CSV file into BIM equipment rows
 * Simple implementation - production should use csv-parse library
 */
export async function parseCSVFile(filePath: string): Promise<BIMEquipmentRow[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return []
    }

    // First line is header
    const headers = lines[0].split(',').map(h => h.trim())
    const rows: BIMEquipmentRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: BIMEquipmentRow = { tag: '' }

      for (let j = 0; j < headers.length && j < values.length; j++) {
        row[headers[j]] = values[j]
      }

      if (row.tag) {
        rows.push(row)
      }
    }

    return rows
  } catch (error) {
    console.error(`Failed to parse CSV file ${filePath}:`, error)
    return []
  }
}

/**
 * Move file to archive folder after processing
 */
export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destinationPath), { recursive: true })
    await fs.rename(sourcePath, destinationPath)
  } catch (error) {
    console.error(`Failed to move file ${sourcePath} to ${destinationPath}:`, error)
    // If rename fails (cross-device), try copy + delete
    try {
      await fs.copyFile(sourcePath, destinationPath)
      await fs.unlink(sourcePath)
    } catch (fallbackError) {
      console.error('Failed to move file using copy+delete fallback:', fallbackError)
    }
  }
}

/**
 * Import BIM equipment from CSV files in a watch folder
 */
export async function watchFolder(
  folderPath: string,
  projectId: string,
  companyId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    conflicts: [],
    processedFiles: [],
  }

  try {
    // List CSV files in folder
    const files = await listFilesInFolder(folderPath)

    if (files.length === 0) {
      return result
    }

    const prisma = getPrismaForCompany(companyId) as any

    // Process each CSV file
    for (const file of files) {
      try {
        const rows = await parseCSVFile(file)

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]

          // Validate required fields
          if (!row.tag) {
            result.conflicts.push({
              row: i + 2, // +2 because: +1 for 1-based indexing, +1 for header row
              tag: row.tag || '(missing)',
              issue: 'Missing required field: tag',
              severity: 'error',
            })
            continue
          }

          try {
            // Check if equipment already exists
            // Note: This is a placeholder - Equipment model doesn't exist yet
            // In Phase 2, this would create Equipment records

            // For now, just track that we would import it
            result.imported++
          } catch (error: any) {
            result.conflicts.push({
              row: i + 2,
              tag: row.tag,
              issue: error.message || 'Import failed',
              severity: 'error',
            })
          }
        }

        // Move processed file to archive
        const archivePath = path.join(folderPath, 'processed', path.basename(file))
        await moveFile(file, archivePath)
        result.processedFiles.push(file)
      } catch (fileError: any) {
        console.error(`Error processing file ${file}:`, fileError)
        result.conflicts.push({
          row: 0,
          tag: path.basename(file),
          issue: `File processing error: ${fileError.message}`,
          severity: 'error',
        })
      }
    }

    return result
  } catch (error: any) {
    console.error(`Watch folder error for ${folderPath}:`, error)
    throw error
  }
}

/**
 * Import BIM equipment data (called by API or cron job)
 *
 * @param params Import parameters
 * @returns Import result with counts and conflicts
 */
export async function importBIMEquipment(params: {
  projectId: string
  companyId: string
  source: 'CSV_WATCH' | 'MANUAL_UPLOAD' | 'API'
  fileKey?: string
  updateExisting?: boolean
  createPlaceholderDocuments?: boolean
}): Promise<ImportResult> {
  const { projectId, companyId, source, updateExisting = true } = params

  // Placeholder implementation
  // Full implementation would:
  // 1. Download file from R2 (if fileKey provided)
  // 2. Parse CSV/Excel
  // 3. Validate tags against naming mask
  // 4. Create/update Equipment records
  // 5. Link to BIM models
  // 6. Create placeholder documents if requested
  // 7. Track import batch for audit trail

  return {
    imported: 0,
    conflicts: [],
    processedFiles: [],
  }
}
