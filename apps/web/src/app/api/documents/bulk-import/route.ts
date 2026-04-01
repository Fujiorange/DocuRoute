import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { requirePermission, withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { writeVaultEntry } from '@docuroute/core/src/audit-vault'
import ExcelJS from 'exceljs'
import {
  Permission,
  EngineeringDiscipline,
  IssuePurpose,
  DocumentStatus,
  WatermarkStatus,
  AuditAction,
  AuditVaultEventType,
} from '@docuroute/types'
import { validationError, notFound } from '@docuroute/core/src/errors'
import { authOptions } from '../../auth/[...nextauth]/route'

/**
 * POST /api/documents/bulk-import
 *
 * Accepts Excel (.xlsx) file and bulk creates Documents + initial Revisions.
 *
 * Permission: BULK_OPERATION + IMPORT_MDR
 *
 * Requirements:
 * - documentCode must be unique per project
 * - Required fields: documentCode, title
 * - Optional: discipline
 * - If document doesn't exist → create Document
 * - Always create Revision (initial revisionCode = "A")
 * - Set isCurrent = true (only 1 current revision per document)
 *
 * Excel structure expected:
 * - Column A: documentCode (required)
 * - Column B: title (required)
 * - Column C: discipline (optional, must be valid EngineeringDiscipline)
 *
 * Response:
 * {
 *   success: true,
 *   imported: number,
 *   skipped: number,
 *   errors: Array<{ row: number, documentCode: string, error: string }>
 * }
 */

// Validation schema for the request
const bulkImportSchema = z.object({
  projectId: z.string().min(1),
  file: z.instanceof(Blob).optional(), // File uploaded via FormData
})

interface ImportRow {
  row: number
  documentCode: string
  title: string
  discipline?: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{
    row: number
    documentCode: string
    error: string
  }>
}

/**
 * Parse Excel file and extract document rows
 */
async function parseExcelFile(buffer: Buffer): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw validationError('Excel file', 'No worksheet found in Excel file')
  }

  const rows: ImportRow[] = []
  let rowNumber = 0

  worksheet.eachRow((row, index) => {
    rowNumber = index

    // Skip header row
    if (index === 1) {
      return
    }

    const documentCode = row.getCell(1).value?.toString().trim()
    const title = row.getCell(2).value?.toString().trim()
    const discipline = row.getCell(3).value?.toString().trim()

    // Skip empty rows
    if (!documentCode && !title) {
      return
    }

    rows.push({
      row: rowNumber,
      documentCode: documentCode || '',
      title: title || '',
      discipline: discipline || undefined,
    })
  })

  return rows
}

/**
 * Validate a single import row
 */
function validateRow(row: ImportRow): string | null {
  if (!row.documentCode) {
    return 'documentCode is required'
  }

  if (!row.title) {
    return 'title is required'
  }

  // Validate discipline if provided
  if (row.discipline) {
    const validDisciplines = Object.values(EngineeringDiscipline)
    if (!validDisciplines.includes(row.discipline as EngineeringDiscipline)) {
      return `Invalid discipline. Must be one of: ${validDisciplines.join(', ')}`
    }
  }

  return null
}

export const POST = withApiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  // Permission checks - require both BULK_OPERATION and IMPORT_MDR
  requirePermission(session.user, [Permission.BULK_OPERATION])
  requirePermission(session.user, [Permission.IMPORT_MDR])

  // Parse FormData (multipart/form-data)
  const formData = await req.formData()
  const projectId = formData.get('projectId')?.toString()
  const file = formData.get('file') as File | null

  if (!projectId) {
    throw validationError('projectId', 'Project ID is required')
  }

  if (!file) {
    throw validationError('file', 'Excel file is required')
  }

  // Validate file type
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls (legacy)
  ]

  if (!allowedMimeTypes.includes(file.type)) {
    throw validationError(
      'file',
      'Invalid file type. Only Excel files (.xlsx) are supported.'
    )
  }

  // Get tenant-scoped Prisma client
  const prisma = getPrismaForCompany(session.user.companyId)

  // Verify project exists and belongs to company
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw notFound('Project not found')
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Parse Excel file
  const rows = await parseExcelFile(buffer)

  if (rows.length === 0) {
    throw validationError('file', 'No valid rows found in Excel file')
  }

  // Validate all rows first
  const errors: ImportResult['errors'] = []
  const validRows: ImportRow[] = []

  for (const row of rows) {
    const error = validateRow(row)
    if (error) {
      errors.push({
        row: row.row,
        documentCode: row.documentCode || '(empty)',
        error,
      })
    } else {
      validRows.push(row)
    }
  }

  // Check for duplicate documentCodes within the Excel file
  const documentCodes = new Set<string>()
  for (const row of validRows) {
    if (documentCodes.has(row.documentCode)) {
      errors.push({
        row: row.row,
        documentCode: row.documentCode,
        error: 'Duplicate documentCode within Excel file',
      })
    } else {
      documentCodes.add(row.documentCode)
    }
  }

  // Remove duplicates from validRows
  const validRowsFiltered = validRows.filter((row) =>
    !errors.some((e) => e.row === row.row)
  )

  // Check for existing documentCodes in the project
  const existingDocuments = await prisma.document.findMany({
    where: {
      projectId,
      documentCode: {
        in: Array.from(documentCodes),
      },
    },
    select: {
      documentCode: true,
    },
  })

  const existingCodes = new Set(
    existingDocuments.map((d) => d.documentCode).filter(Boolean)
  )

  // Filter out existing documents (skip them)
  let imported = 0
  let skipped = 0

  for (const row of validRowsFiltered) {
    if (existingCodes.has(row.documentCode)) {
      errors.push({
        row: row.row,
        documentCode: row.documentCode,
        error: 'Document with this code already exists in project (skipped)',
      })
      skipped++
      continue
    }

    try {
      // Create Document and initial Revision in a transaction
      await prisma.$transaction(async (tx) => {
        // Create Document
        // Note: Since we're creating documents without actual files,
        // we use placeholder values for fileKey, sha256Hash, etc.
        // In a real implementation, this would be handled differently
        const document = await tx.document.create({
          data: {
            companyId: session.user.companyId,
            projectId,
            documentCode: row.documentCode,
            title: row.title,
            filename: `${row.documentCode}.pdf`, // Placeholder
            fileKey: `placeholder/${row.documentCode}`, // Placeholder
            fileSize: 0, // Placeholder
            mimeType: 'application/pdf', // Placeholder
            sha256Hash: '0'.repeat(64), // Placeholder
            uploadedBy: session.user.userId,
            discipline: row.discipline as EngineeringDiscipline | undefined,
            status: DocumentStatus.PENDING_METADATA,
            virusScanStatus: 'SKIPPED',
            watermarkStatus: WatermarkStatus.SKIPPED_TOO_LARGE,
          },
        })

        // Create initial Revision (revisionCode = "A")
        await tx.documentRevision.create({
          data: {
            companyId: session.user.companyId,
            documentId: document.id,
            revisionCode: 'A',
            fileKey: `placeholder/${row.documentCode}`, // Placeholder
            fileSize: 0, // Placeholder
            sha256Hash: '0'.repeat(64), // Placeholder
            discipline: row.discipline as EngineeringDiscipline | undefined,
            uploadedBy: session.user.userId,
            status: 'CURRENT',
            watermarkStatus: WatermarkStatus.SKIPPED_TOO_LARGE,
          },
        })
      })

      imported++
    } catch (error) {
      console.error(`Failed to import row ${row.row}:`, error)
      errors.push({
        row: row.row,
        documentCode: row.documentCode,
        error: 'Database error during import',
      })
    }
  }

  // Log audit event
  await logAuditEvent({
    userId: session.user.userId,
    companyId: session.user.companyId,
    action: AuditAction.BULK_OPERATION,
    resourceType: 'Document',
    metadata: {
      operation: 'bulk-import',
      projectId,
      totalRows: rows.length,
      imported,
      skipped,
      errors: errors.length,
    },
    permissionsUsed: [Permission.BULK_OPERATION, Permission.IMPORT_MDR],
  })

  // Write to audit vault for compliance
  await writeVaultEntry({
    companyId: session.user.companyId,
    eventType: AuditVaultEventType.BULK_OPERATION,
    userId: session.user.userId,
    userEmail: session.user.email || 'unknown',
    metadata: {
      operation: 'bulk-import',
      projectId,
      imported,
      skipped,
      errorsCount: errors.length,
    },
  })

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    errors,
  })
})
