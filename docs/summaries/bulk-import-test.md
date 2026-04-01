# Bulk Import Module - Testing Instructions

## Prerequisites

1. **Database Setup:**
   - Apply the migration: `npx prisma migrate dev`
   - Verify migration was applied: Check for `documentCode` and `title` columns in `Document` table

2. **User Permissions:**
   - Test user must have both:
     - `BULK_OPERATION` permission
     - `IMPORT_MDR` permission
   - System roles with these permissions:
     - COMPANY_ADMIN
     - DOCUMENT_CONTROLLER

3. **Project Setup:**
   - Create or identify a test project
   - Note the Project ID (you'll need this for import)

## Sample Excel File Structure

Create a test Excel file (.xlsx) with the following structure:

### Minimal Valid Example

| documentCode | title              | discipline   |
|--------------|-------------------|--------------|
| DWG-001      | General Layout    | STRUCTURAL   |
| SPEC-A-001   | Material Spec     | PIPING       |
| CALC-001     | Load Calculation  | CIVIL        |

### File with Errors (for testing validation)

| documentCode | title              | discipline   |
|--------------|-------------------|--------------|
| DWG-002      | Valid Document    | ELECTRICAL   |
|              | Missing Code      | PIPING       |
| DWG-003      |                   | MECHANICAL   |
| DWG-004      | Invalid Discipline| INVALID_VAL  |
| DWG-002      | Duplicate in File | STRUCTURAL   |

### Valid Engineering Disciplines

Use these exact values (case-sensitive):
- PIPING
- STRUCTURAL
- ELECTRICAL
- HVAC
- MECHANICAL
- INSTRUMENTATION
- CIVIL
- ARCHITECTURAL
- PROCESS
- SAFETY
- MARINE
- GENERAL

## Step-by-Step Testing

### Test 1: Successful Bulk Import

**Objective:** Verify basic import functionality works correctly

1. **Prepare Excel File:**
   - Create `test-import-valid.xlsx` with 5-10 valid documents
   - Use structure from "Minimal Valid Example" above
   - Include a mix of disciplines

2. **Navigate to Import Page:**
   ```
   URL: http://localhost:3000/documents/import
   ```

3. **Enter Project ID:**
   - Input your test project ID in the "Project ID" field
   - Example: `clx1abc2def3ghi4jkl5`

4. **Upload File:**
   - Click "Choose File" or "Browse"
   - Select `test-import-valid.xlsx`
   - Verify file name and size appear below input

5. **Click Import:**
   - Click "Import Documents" button
   - Button should show "Importing..." during process

6. **Verify Results:**
   - Check results card appears
   - Verify "Imported" count matches number of rows (minus header)
   - Verify "Skipped" count is 0
   - Verify "Errors" count is 0
   - Click "View Documents" button

7. **Verify Database:**
   ```sql
   -- Check documents were created
   SELECT id, "documentCode", title, discipline, status
   FROM "Document"
   WHERE "projectId" = 'YOUR_PROJECT_ID'
   AND "documentCode" IN ('DWG-001', 'SPEC-A-001', 'CALC-001');

   -- Expected results:
   -- - All documents have status = 'PENDING_METADATA'
   -- - All have the correct documentCode and title
   -- - discipline matches Excel values
   ```

8. **Verify Revisions:**
   ```sql
   -- Check revisions were created
   SELECT dr.id, dr."revisionCode", dr.status, d."documentCode"
   FROM "DocumentRevision" dr
   JOIN "Document" d ON dr."documentId" = d.id
   WHERE d."projectId" = 'YOUR_PROJECT_ID'
   AND d."documentCode" IN ('DWG-001', 'SPEC-A-001', 'CALC-001');

   -- Expected results:
   -- - Each document has exactly 1 revision
   -- - All revisions have revisionCode = 'A'
   -- - All revisions have status = 'CURRENT'
   ```

9. **Verify Audit Logs:**
   ```sql
   -- Check audit log
   SELECT action, "resourceType", metadata
   FROM "AuditLog"
   WHERE action = 'BULK_OPERATION'
   ORDER BY "createdAt" DESC
   LIMIT 1;

   -- Expected metadata:
   -- {
   --   "operation": "bulk-import",
   --   "projectId": "...",
   --   "totalRows": 5,
   --   "imported": 5,
   --   "skipped": 0,
   --   "errors": 0
   -- }
   ```

10. **Verify Audit Vault:**
    ```sql
    -- Check immutable audit vault
    SELECT "eventType", metadata
    FROM "AuditVaultEntry"
    WHERE "eventType" = 'BULK_OPERATION'
    ORDER BY "createdAt" DESC
    LIMIT 1;

    -- Should contain aggregated import results
    ```

### Test 2: Duplicate Detection

**Objective:** Verify duplicate documentCode handling

1. **First Import:**
   - Import `test-import-valid.xlsx` (from Test 1)
   - Verify successful import

2. **Second Import (Same File):**
   - Import the same file again with same project ID
   - Expected results:
     - Imported: 0
     - Skipped: 5 (or however many rows)
     - Errors: 5 messages like "Document with this code already exists in project (skipped)"

3. **Verify Database:**
   ```sql
   -- Check no duplicate documents
   SELECT "documentCode", COUNT(*) as count
   FROM "Document"
   WHERE "projectId" = 'YOUR_PROJECT_ID'
   GROUP BY "documentCode"
   HAVING COUNT(*) > 1;

   -- Expected: No rows (no duplicates)
   ```

### Test 3: Validation Errors

**Objective:** Verify validation catches common errors

1. **Prepare Error File:**
   - Create `test-import-errors.xlsx` with intentional errors:
     - Row with empty documentCode
     - Row with empty title
     - Row with invalid discipline
     - Row with duplicate documentCode within file

2. **Upload and Import:**
   - Upload file and click Import
   - Expected results:
     - Imported: (number of valid rows)
     - Errors: (number of invalid rows)

3. **Verify Error Messages:**
   - Check error table displays
   - Verify each error shows:
     - Row number
     - Document code
     - Clear error message
   - Example error messages:
     - "documentCode is required"
     - "title is required"
     - "Invalid discipline. Must be one of: ..."
     - "Duplicate documentCode within Excel file"

4. **Verify Valid Rows Imported:**
   - Only valid rows should be created in database
   - Invalid rows should not create any records

### Test 4: Project Validation

**Objective:** Verify project ownership and existence checks

1. **Test with Invalid Project ID:**
   - Enter a non-existent project ID: `invalid-project-123`
   - Upload valid Excel file
   - Click Import
   - Expected: Error message "Project not found"

2. **Test with Empty Project ID:**
   - Leave project ID field empty
   - Upload valid Excel file
   - Click Import
   - Expected: Error message or disabled button

3. **Test with Another Company's Project:**
   - If you have access to multiple companies:
     - Switch to Company A
     - Note a project ID from Company A
     - Switch to Company B
     - Try to import to Company A's project
   - Expected: "Project not found" (due to RLS)

### Test 5: Permission Checks

**Objective:** Verify permission enforcement

1. **Test with Insufficient Permissions:**
   - Create or use a user with custom role
   - Remove `BULK_OPERATION` or `IMPORT_MDR` permission
   - Try to access `/documents/import`
   - Expected: 403 Forbidden or redirect

2. **Test API Directly:**
   ```bash
   # Get auth token from browser DevTools (Application > Cookies > next-auth.session-token)

   curl -X POST http://localhost:3000/api/documents/bulk-import \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
     -F "projectId=YOUR_PROJECT_ID" \
     -F "file=@test-import-valid.xlsx"

   # Expected: 403 Forbidden if no permissions
   ```

### Test 6: File Type Validation

**Objective:** Verify only Excel files are accepted

1. **Test with PDF File:**
   - Try to upload a PDF file
   - Expected: File input might not accept it (due to accept=".xlsx")
   - Or: Error message "Invalid file type"

2. **Test with CSV File:**
   - Try to upload .csv file
   - Expected: Error message "Invalid file type"

3. **Test with .xls (Legacy Excel):**
   - Upload legacy .xls format
   - Expected: May work if MIME type is correct, or error

### Test 7: Large File Handling

**Objective:** Verify handling of many rows

1. **Prepare Large File:**
   - Create Excel file with 100-1000 rows
   - Use script or Excel fill-down to generate:
     ```
     DWG-0001, Drawing 1, STRUCTURAL
     DWG-0002, Drawing 2, PIPING
     ...
     DWG-1000, Drawing 1000, ELECTRICAL
     ```

2. **Import Large File:**
   - Upload and import
   - Note import time (should complete in < 30 seconds for 1000 rows)
   - Verify all valid rows imported

3. **Check Performance:**
   - Monitor browser console for any timeouts
   - Check server logs for any errors
   - Verify database records created correctly

## Expected Database State After Tests

After all tests complete, your database should contain:

**Documents Table:**
```sql
SELECT
  "documentCode",
  title,
  discipline,
  status,
  "virusScanStatus",
  "watermarkStatus"
FROM "Document"
WHERE "projectId" = 'YOUR_TEST_PROJECT_ID'
ORDER BY "documentCode";
```

Expected columns:
- `documentCode`: Unique values from Excel
- `title`: Titles from Excel
- `discipline`: Valid enum values or NULL
- `status`: All = 'PENDING_METADATA'
- `virusScanStatus`: All = 'SKIPPED'
- `watermarkStatus`: All = 'SKIPPED_TOO_LARGE'

**DocumentRevision Table:**
```sql
SELECT
  d."documentCode",
  dr."revisionCode",
  dr.status,
  dr."uploadedBy"
FROM "DocumentRevision" dr
JOIN "Document" d ON dr."documentId" = d.id
WHERE d."projectId" = 'YOUR_TEST_PROJECT_ID'
ORDER BY d."documentCode";
```

Expected:
- Each document has exactly 1 revision
- All `revisionCode` = 'A'
- All `status` = 'CURRENT'
- `uploadedBy` = test user's ID

## Troubleshooting

### Import Button Disabled
- Check Project ID is filled
- Check file is selected
- Check file is .xlsx format

### "Project not found" Error
- Verify project ID is correct
- Verify project belongs to your company
- Check database: `SELECT id FROM "Project" WHERE id = 'YOUR_ID'`

### No Documents Created
- Check browser console for errors
- Check server logs for errors
- Verify permissions are correct
- Check Excel file format matches expected structure

### Partial Import Success
- Review error table in results
- Check which rows failed and why
- Verify valid rows were imported to database

### Database Migration Issues
- Run: `npx prisma migrate reset` (WARNING: deletes all data)
- Or: Run migration manually in SQL editor
- Verify columns exist: `\d "Document"` in psql

## Clean Up After Testing

```sql
-- Delete test documents
DELETE FROM "DocumentRevision"
WHERE "documentId" IN (
  SELECT id FROM "Document"
  WHERE "projectId" = 'YOUR_TEST_PROJECT_ID'
  AND "documentCode" LIKE 'DWG-%'
);

DELETE FROM "Document"
WHERE "projectId" = 'YOUR_TEST_PROJECT_ID'
AND "documentCode" LIKE 'DWG-%';

-- Or delete test project entirely
DELETE FROM "Project" WHERE id = 'YOUR_TEST_PROJECT_ID';
```

## Success Criteria

The bulk import feature is working correctly if:

1. ✅ Valid Excel files import successfully
2. ✅ Documents and Revisions are created atomically
3. ✅ Duplicate documentCodes are detected and skipped
4. ✅ Validation errors are caught and reported clearly
5. ✅ Permission checks prevent unauthorized access
6. ✅ Audit logs are created for all imports
7. ✅ Multi-tenancy is enforced (RLS working)
8. ✅ UI displays results clearly with error details
9. ✅ Database constraints are respected
10. ✅ Large imports (100+ rows) complete successfully
