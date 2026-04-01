# Bulk Import Module - Summary

## What Was Built

Implemented a complete bulk import system for DocuRoute that allows users to upload an Excel file and bulk create Documents with initial Revisions. This is a Phase 2 critical feature designed for pilot readiness.

## Components Implemented

### 1. Database Schema Changes

**File:** `packages/db/prisma/schema.prisma`

Added two new fields to the `Document` model:
- `documentCode` (String?, optional): Unique identifier within a project (e.g., "DWG-001", "SPEC-A-001")
- `title` (String?, optional): Human-readable title of the document

**Unique Constraint:**
- `@@unique([projectId, documentCode])` - Ensures documentCode is unique within each project
- `@@index([documentCode])` - Index for fast lookups

**Migration:** `packages/db/prisma/migrations/20260401_add_documentcode_title/migration.sql`
- Adds columns with proper constraints
- Creates partial unique index (WHERE clause) to allow NULL values
- Includes helpful comments on columns

### 2. Backend API Route

**File:** `apps/web/src/app/api/documents/bulk-import/route.ts`

**Endpoint:** `POST /api/documents/bulk-import`

**Permissions Required:**
- `BULK_OPERATION`
- `IMPORT_MDR`

**Request Format:**
- Content-Type: `multipart/form-data`
- Fields:
  - `projectId` (string): Target project ID
  - `file` (File): Excel file (.xlsx)

**Excel Structure Expected:**
- Column A: documentCode (required)
- Column B: title (required)
- Column C: discipline (optional, must be valid EngineeringDiscipline enum value)
- Row 1: Header row (automatically skipped)

**Response Format:**
```json
{
  "success": true,
  "imported": 15,
  "skipped": 3,
  "errors": [
    {
      "row": 5,
      "documentCode": "DWG-005",
      "error": "Duplicate documentCode within Excel file"
    }
  ]
}
```

### 3. Frontend Page

**File:** `apps/web/src/app/(dashboard)/documents/import/page.tsx`

**URL:** `/documents/import`

**Features:**
- Excel file upload with file size display
- Project ID input field
- Clear instructions on Excel format
- Import button with loading state
- Results display with statistics:
  - Imported count (green)
  - Skipped count (yellow)
  - Errors count (red)
- Detailed error table showing row number, document code, and error message
- Reset button to start over
- Link to view documents after successful import

**UI Components Used:**
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Button (primary and outline variants)
- Input, Label
- Table with header and body
- Badge for error display
- Alert for instructions
- Toast notifications for user feedback

## Design Decisions

### 1. Parsing Strategy

**Library Choice:** ExcelJS
- Already installed in the project (`exceljs@4.4.0`)
- Lightweight and production-ready
- Supports .xlsx format
- Easy-to-use API for row iteration

**Parsing Logic:**
- Stream-based parsing using `workbook.eachRow()`
- Skips header row (row 1) automatically
- Skips empty rows (no documentCode and no title)
- Extracts values from first 3 columns
- Row numbers tracked for error reporting

### 2. Validation Logic

**Two-Phase Validation:**

**Phase 1 - Row-Level Validation:**
- Required field checks (documentCode, title)
- Discipline enum validation (if provided)
- Collects all validation errors before processing

**Phase 2 - Database Validation:**
- Duplicate detection within Excel file
- Duplicate detection against existing documents in project
- Uses Prisma `findMany` with `IN` clause for efficient batch checking

**Duplicate Handling:**
- Duplicates within Excel file → flagged as error
- Existing documents in project → flagged as "skipped"
- Both prevent import of that specific row

### 3. Document Creation Strategy

**Placeholder Approach:**
Since bulk import creates document metadata without actual PDF files:
- `fileKey`: `placeholder/{documentCode}`
- `sha256Hash`: 64 zeros
- `fileSize`: 0
- `mimeType`: `application/pdf`
- `filename`: `{documentCode}.pdf`
- `status`: `PENDING_METADATA`
- `virusScanStatus`: `SKIPPED`
- `watermarkStatus`: `SKIPPED_TOO_LARGE`

**Why This Design:**
- Allows creation of document records before files exist
- Compatible with future file upload flow
- Clearly indicates placeholder status with `PENDING_METADATA`
- Avoids triggering virus scan or watermarking workflows

### 4. Revision Creation

**Initial Revision:**
- Always creates revision with `revisionCode = "A"`
- Sets `status = "CURRENT"` (only one current revision per document)
- Inherits discipline from parent document
- Uses same placeholder file values

**Transaction Safety:**
- Document and Revision created in a single Prisma transaction
- Ensures atomicity (both created or neither created)
- Prevents orphaned revisions

### 5. Multi-Tenancy Compliance

**RLS (Row Level Security):**
- Uses `getPrismaForCompany(session.user.companyId)` for tenant isolation
- All queries automatically filtered by `companyId`
- Prevents cross-tenant data access

**CompanyId in Transactions:**
- Explicitly passes `companyId` to all `create()` calls
- Follows critical rule from repository memories
- Prevents RLS bypass in transactions

### 6. Audit Logging

**Two-Tier System:**

**Standard Audit Log:**
- Records operation type, project, counts, errors
- Uses `AuditAction.BULK_OPERATION`
- Includes permissions used
- Stored in `AuditLog` table

**Immutable Audit Vault:**
- Compliance-critical record
- Uses `AuditVaultEventType.BULK_OPERATION`
- Cannot be modified or deleted (DB trigger enforced)
- Stores aggregated counts, not full data (privacy-preserving)

### 7. Error Handling

**Graceful Failure:**
- Individual row failures don't stop entire import
- Try-catch around each document creation
- Collects all errors for user review
- Returns partial success results

**User Feedback:**
- Inline validation errors with row numbers
- Clear error messages for common issues
- Toast notifications for immediate feedback
- Detailed error table for troubleshooting

## Why These Decisions

### Simplicity
- No async queue (requirement: "DO NOT build async queue")
- No multiple format support (requirement: only .xlsx)
- Direct Excel parsing without preview step (simpler flow)
- Minimal UI without over-engineering

### Production-Practical
- Uses existing library (ExcelJS) already in dependencies
- Follows existing patterns (multi-tenancy, audit logging, error handling)
- Compatible with ISO 9001 and DNV compliance requirements
- Handles common failure scenarios gracefully

### Speed of Delivery
- Reused existing UI components
- Followed established API patterns
- No new dependencies
- Minimal abstraction layers

## Security Considerations

1. **Permission Checks:** Requires both BULK_OPERATION and IMPORT_MDR permissions
2. **File Type Validation:** Only accepts Excel MIME types
3. **Project Ownership:** Verifies project exists and belongs to company
4. **Input Sanitization:** Zod validation on all inputs
5. **Tenant Isolation:** RLS enforcement via getPrismaForCompany
6. **Audit Trail:** Complete audit logging for compliance

## Known Limitations

1. **No Async Processing:** Import runs synchronously in API route
   - Acceptable for Phase 2 pilot (< 1000 rows typically)
   - May need queue for production scale (> 10,000 rows)

2. **No File Upload:** Creates placeholder documents without actual PDFs
   - Design decision for bulk registration
   - Files can be uploaded later via standard upload flow

3. **No Undo:** Once imported, cannot be batch-undone
   - Individual documents can be deleted via standard UI
   - Could add undo feature in future using BulkOperation tracking

4. **No Preview:** Parses entire file on submit
   - Simpler implementation
   - Fast enough for pilot scale

## Future Enhancements (Not Implemented)

These were explicitly excluded per requirements:

- Advanced validation rules (naming conventions, custom fields)
- Multiple file format support (CSV, JSON)
- Async job queue with progress tracking
- Bulk undo functionality
- File preview before import
- Advanced error recovery (retry, partial import)
- Template download functionality
