# Revision Engine Module - Testing Instructions

## Prerequisites

Before testing, ensure:
1. Database is running with DocumentRevision table
2. R2 storage is configured and accessible
3. You have a test user with `UPLOAD_DOCUMENT` permission
4. At least one document exists with an initial revision

## Test Setup

### Create Test Document with Initial Revision

If you don't have a test document yet, create one:

```sql
-- 1. Create test document
INSERT INTO "Document" (
  id, "companyId", "projectId", "documentCode", title, filename,
  "fileKey", "fileSize", "mimeType", "sha256Hash", "uploadedBy",
  status, "virusScanStatus", "watermarkStatus"
) VALUES (
  'test-doc-001',
  'your-company-id',
  'your-project-id',
  'DWG-TEST-001',
  'Test Drawing for Revision Testing',
  'test-drawing.pdf',
  'company-id/test-file-001.pdf',
  1024000,
  'application/pdf',
  encode(gen_random_bytes(32), 'hex'),
  'your-user-id',
  'ACTIVE',
  'CLEAN',
  'COMPLETE'
);

-- 2. Create initial revision (Rev A)
INSERT INTO "DocumentRevision" (
  id, "documentId", "companyId", "revisionCode",
  "fileKey", "fileSize", "sha256Hash",
  discipline, "issuePurpose", status, "watermarkStatus", "uploadedBy"
) VALUES (
  'test-rev-001',
  'test-doc-001',
  'your-company-id',
  'A',
  'company-id/test-file-001.pdf',
  1024000,
  encode(gen_random_bytes(32), 'hex'),
  'PIPING',
  'FOR_CONSTRUCTION',
  'CURRENT',
  'COMPLETE',
  'your-user-id'
);
```

**Verify Setup:**
```sql
-- Should return 1 row with status = CURRENT
SELECT "documentId", "revisionCode", status
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-001';
```

Expected result:
```
documentId      | revisionCode | status
----------------|--------------|--------
test-doc-001    | A            | CURRENT
```

## Test 1: Upload Single Revision (A → B)

### Step 1: Navigate to Document Detail Page

1. Log in to DocuRoute
2. Navigate to `/documents`
3. Click on your test document (DWG-TEST-001)
4. Verify you see:
   - Document information card
   - Revision History card
   - One revision (A) with green background and "CURRENT" badge
   - "Upload New Revision" button (if you have permission)

### Step 2: Upload New Revision

1. Click "Upload New Revision" button
2. Dialog opens with:
   - File selection input
   - Blue info box: "Note: The current revision will be automatically superseded..."
   - Cancel and Upload buttons

3. Select a test PDF file (any small PDF, <10MB)
4. Verify filename and size display below input
5. Click "Upload Revision" button

### Step 3: Observe Upload Process

1. Button changes to "Uploading..." with spinner
2. Toast notification appears: "Revision uploaded successfully"
3. Message shows: "New revision B created (previous: A)"
4. Page automatically refreshes

### Step 4: Verify Revision Table Updated

After refresh, verify:
- Two revisions now visible
- Rev B has green background + "CURRENT" badge
- Rev A has no badge, grayed out
- Rev A status shows "SUPERSEDED"
- Rev B is at the top of the table (current first)

### Step 5: Verify in Database

```sql
SELECT "revisionCode", status, "createdAt"
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-001'
ORDER BY "createdAt" DESC;
```

**Expected Result:**
```
revisionCode | status      | createdAt
-------------|-------------|------------------------
B            | CURRENT     | 2026-04-01T14:30:00Z
A            | SUPERSEDED  | 2026-04-01T10:00:00Z
```

**Critical Checks:**
- ✅ Exactly TWO revisions exist
- ✅ Rev B has status = "CURRENT"
- ✅ Rev A has status = "SUPERSEDED"
- ✅ Only ONE revision has status = "CURRENT"

### Step 6: Verify Audit Logs

```sql
SELECT action, "resourceType", "resourceId", metadata
FROM "AuditLog"
WHERE "resourceType" = 'DocumentRevision'
  AND "companyId" = 'your-company-id'
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Expected Result:**
```
action              | resourceType      | resourceId   | metadata
--------------------|-------------------|--------------|-------------------
REVISION_CREATED    | DocumentRevision  | rev-B-id     | {"revisionCode": "B", ...}
REVISION_SUPERSEDED | DocumentRevision  | rev-A-id     | {"revisionCode": "A", "supersededBy": "B"}
```

**Verify:**
- ✅ Two audit entries created
- ✅ REVISION_SUPERSEDED logged for Rev A
- ✅ REVISION_CREATED logged for Rev B
- ✅ Metadata includes revision codes and document info

## Test 2: Upload Multiple Sequential Revisions (B → C → D)

### Step 1: Upload Third Revision (B → C)

Repeat Test 1 steps to upload another revision.

**Expected:**
- Toast: "New revision C created (previous: B)"
- Table shows: C (CURRENT), B (SUPERSEDED), A (SUPERSEDED)

### Step 2: Upload Fourth Revision (C → D)

Upload one more revision.

**Expected:**
- Toast: "New revision D created (previous: C)"
- Table shows: D (CURRENT), C, B, A (all SUPERSEDED except D)

### Step 3: Verify Database State

```sql
SELECT "revisionCode", status
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-001'
ORDER BY "createdAt" DESC;
```

**Expected Result:**
```
revisionCode | status
-------------|------------
D            | CURRENT
C            | SUPERSEDED
B            | SUPERSEDED
A            | SUPERSEDED
```

**Critical Check:**
- ✅ ONLY ONE revision has status = "CURRENT" (Rev D)
- ✅ All previous revisions have status = "SUPERSEDED"

### Step 4: Verify Revision Code Sequence

```sql
SELECT string_agg("revisionCode", ' → ' ORDER BY "createdAt")
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-001';
```

**Expected Result:**
```
A → B → C → D
```

✅ Revision codes increment correctly in alphabetic sequence

## Test 3: Test Revision Code Rollover (Z → AA)

This test requires 26 revisions to reach Z. For testing purposes, we can simulate this:

### Option A: Manual Database Insert

```sql
-- Create document with Rev Z
INSERT INTO "Document" (
  id, "companyId", "documentCode", filename,
  "fileKey", "fileSize", "mimeType", "sha256Hash", "uploadedBy",
  status, "virusScanStatus", "watermarkStatus"
) VALUES (
  'test-doc-rollover',
  'your-company-id',
  'DWG-ROLLOVER',
  'rollover-test.pdf',
  'company-id/rollover.pdf',
  1024000,
  'application/pdf',
  encode(gen_random_bytes(32), 'hex'),
  'your-user-id',
  'ACTIVE',
  'CLEAN',
  'COMPLETE'
);

INSERT INTO "DocumentRevision" (
  id, "documentId", "companyId", "revisionCode",
  "fileKey", "fileSize", "sha256Hash",
  status, "watermarkStatus", "uploadedBy"
) VALUES (
  'test-rev-z',
  'test-doc-rollover',
  'your-company-id',
  'Z',
  'company-id/rollover.pdf',
  1024000,
  encode(gen_random_bytes(32), 'hex'),
  'CURRENT',
  'COMPLETE',
  'your-user-id'
);
```

### Step 1: Upload Revision After Z

1. Navigate to document DWG-ROLLOVER
2. Verify current revision shows "Z"
3. Click "Upload New Revision"
4. Upload a test file

### Step 2: Verify Rollover to AA

**Expected:**
- Toast: "New revision AA created (previous: Z)"
- Table shows: AA (CURRENT), Z (SUPERSEDED)

### Step 3: Upload After AA (AA → AB)

Upload another revision.

**Expected:**
- Toast: "New revision AB created (previous: AA)"
- Revision sequence: Z → AA → AB

### Step 4: Test AZ → BA Rollover

Create document with Rev AZ and upload new revision.

**Expected:**
- New revision code: BA
- Sequence: AZ → BA

## Test 4: Verify Only One CURRENT Revision (Database Constraint)

This test verifies the atomic transaction prevents multiple CURRENT revisions.

### Step 1: Check Current State

```sql
SELECT COUNT(*) as current_count
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-001'
  AND status = 'CURRENT';
```

**Expected:** `current_count = 1`

### Step 2: Attempt to Manually Create Second CURRENT (Should Fail)

Try to create another CURRENT revision manually:

```sql
-- This should be prevented by application logic
INSERT INTO "DocumentRevision" (
  id, "documentId", "companyId", "revisionCode",
  "fileKey", "fileSize", "sha256Hash",
  status, "watermarkStatus", "uploadedBy"
) VALUES (
  'test-rev-duplicate',
  'test-doc-001',
  'your-company-id',
  'E',
  'company-id/test.pdf',
  1024000,
  encode(gen_random_bytes(32), 'hex'),
  'CURRENT',  -- Attempting duplicate CURRENT
  'COMPLETE',
  'your-user-id'
);
```

**Note:** This will succeed at the database level (no DB constraint prevents it).
The application logic in the upload endpoint prevents this scenario.

### Step 3: Verify Upload Endpoint Detects Inconsistency

If multiple CURRENT revisions exist (due to manual intervention):

```sql
-- Create inconsistent state for testing
UPDATE "DocumentRevision"
SET status = 'CURRENT'
WHERE "documentId" = 'test-doc-001'
  AND "revisionCode" IN ('C', 'D');
```

Now try to upload a new revision via the UI:

**Expected:**
- API returns 409 Conflict
- Error message: "Multiple current revisions found (2). Database consistency violation."
- Upload fails (prevents making it worse)

**To Fix:**
```sql
-- Manually fix inconsistency
UPDATE "DocumentRevision"
SET status = 'SUPERSEDED'
WHERE "documentId" = 'test-doc-001'
  AND "revisionCode" = 'C';
```

## Test 5: Verify Read-Only Previous Revisions

### Step 1: Attempt to Edit Superseded Revision

There's no endpoint to edit superseded revisions, so this should not be possible via UI.

**Verify:**
- ✅ No "Edit" button on superseded revisions
- ✅ No API endpoint accepts SUPERSEDED → CURRENT status change
- ✅ Only way to "undo" is upload new revision with corrected content

### Step 2: Verify in Database

Previous revisions should remain unchanged:

```sql
SELECT "revisionCode", status, "updatedAt"
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-001'
  AND status = 'SUPERSEDED';
```

**Verify:**
- ✅ Status remains "SUPERSEDED" (no changes)
- ✅ updatedAt timestamp doesn't change after being superseded

## Test 6: Test Permission Enforcement

### Step 1: User Without UPLOAD_DOCUMENT Permission

1. Create test user without `UPLOAD_DOCUMENT` permission
2. Log in as that user
3. Navigate to document detail page

**Expected:**
- ✅ "Upload New Revision" button is NOT visible
- ✅ User can view revision history
- ✅ User can view document details

### Step 2: Attempt API Call Without Permission

Use curl or Postman to call the API directly:

```bash
curl -X POST http://localhost:3000/api/documents/test-doc-001/upload-revision \
  -H "Cookie: next-auth.session-token=USER_WITHOUT_PERMISSION" \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "test",
    "filename": "test.pdf",
    "sha256Hash": "abc123...",
    "fileSize": 1024,
    "mimeType": "application/pdf"
  }'
```

**Expected:**
- Status: 403 Forbidden
- Error: "You do not have permission to perform this operation"

## Test 7: Test File Integrity Validation

### Step 1: Upload with Incorrect Hash

1. Modify the `upload-revision-button.tsx` component temporarily to send wrong hash:

```typescript
// In handleUpload function, change:
const sha256Hash = await calculateFileHash(file)
// To:
const sha256Hash = "0000000000000000000000000000000000000000000000000000000000000000"
```

2. Upload a file

**Expected:**
- API returns 400 Bad Request
- Error: "File validation failed - hash mismatch"
- No revision created

### Step 2: Restore Correct Implementation

Remove the temporary change and verify normal uploads work again.

## Test 8: Performance Test with Multiple Revisions

### Step 1: Create Document with Many Revisions

```sql
-- Create document
INSERT INTO "Document" (...) VALUES (...);

-- Create 20 revisions (A through T)
DO $$
DECLARE
  i INT;
  rev_code CHAR(1);
BEGIN
  FOR i IN 0..19 LOOP
    rev_code := CHR(65 + i); -- 65 = 'A'

    INSERT INTO "DocumentRevision" (
      id, "documentId", "companyId", "revisionCode",
      "fileKey", "fileSize", "sha256Hash",
      status, "watermarkStatus", "uploadedBy"
    ) VALUES (
      'rev-' || i,
      'test-doc-performance',
      'your-company-id',
      rev_code,
      'company-id/file-' || i || '.pdf',
      1024000,
      encode(gen_random_bytes(32), 'hex'),
      CASE WHEN i = 19 THEN 'CURRENT' ELSE 'SUPERSEDED' END,
      'COMPLETE',
      'your-user-id'
    );
  END LOOP;
END $$;
```

### Step 2: Measure Query Performance

```sql
EXPLAIN ANALYZE
SELECT "revisionCode", status
FROM "DocumentRevision"
WHERE "documentId" = 'test-doc-performance'
  AND status = 'CURRENT';
```

**Expected:**
- Query plan uses index on (documentId, status)
- Execution time: < 5ms
- Rows scanned: 1 (not 20)

### Step 3: Upload 21st Revision (T → U)

1. Navigate to document
2. Upload new revision

**Expected:**
- Upload succeeds in < 500ms
- No performance degradation with 20+ revisions

## Test 9: Audit Log Verification

### Step 1: Query Audit Logs

```sql
SELECT
  action,
  "resourceType",
  metadata->>'revisionCode' as revision,
  metadata->>'previousRevisionCode' as previous,
  "createdAt"
FROM "AuditLog"
WHERE "resourceType" = 'DocumentRevision'
  AND metadata->>'documentCode' = 'DWG-TEST-001'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected Result:**
```
action              | resourceType      | revision | previous | createdAt
--------------------|-------------------|----------|----------|------------------------
REVISION_CREATED    | DocumentRevision  | D        | C        | 2026-04-01T15:00:00Z
REVISION_SUPERSEDED | DocumentRevision  | C        | D        | 2026-04-01T15:00:00Z
REVISION_CREATED    | DocumentRevision  | C        | B        | 2026-04-01T14:30:00Z
REVISION_SUPERSEDED | DocumentRevision  | B        | C        | 2026-04-01T14:30:00Z
...
```

**Verify:**
- ✅ Every revision upload creates TWO audit entries
- ✅ REVISION_SUPERSEDED entry has "supersededBy" in metadata
- ✅ REVISION_CREATED entry has "previousRevisionCode" in metadata
- ✅ Timestamps match (both events in same transaction)

## Test 10: Error Handling

### Test 10a: No Current Revision (Invalid State)

```sql
-- Create invalid state: document with no CURRENT revision
UPDATE "DocumentRevision"
SET status = 'SUPERSEDED'
WHERE "documentId" = 'test-doc-001';
```

**Test:**
1. Try to upload new revision

**Expected:**
- API returns 409 Conflict
- Error: "No current revision found. Document may be in invalid state."

**Fix:**
```sql
UPDATE "DocumentRevision"
SET status = 'CURRENT'
WHERE "documentId" = 'test-doc-001'
  AND "revisionCode" = 'D';
```

### Test 10b: Exceed Maximum Revision Code (ZZ)

```sql
-- Create document at maximum revision
INSERT INTO "DocumentRevision" (
  id, "documentId", "companyId", "revisionCode",
  ..., status, ...
) VALUES (
  'test-rev-zz', 'test-doc-max', 'your-company-id', 'ZZ',
  ..., 'CURRENT', ...
);
```

**Test:**
1. Try to upload new revision

**Expected:**
- API returns 400 Bad Request
- Error: "Revision code limit exceeded: \"ZZ\" is the maximum. Consider starting a new document series."

## Success Criteria

All tests must pass:

- [x] **Test 1:** Single revision upload (A → B) works
- [x] **Test 2:** Multiple sequential revisions work (B → C → D)
- [x] **Test 3:** Revision code rollover works (Z → AA → AB)
- [x] **Test 4:** Only ONE CURRENT revision exists at any time
- [x] **Test 5:** Previous revisions are read-only (SUPERSEDED)
- [x] **Test 6:** Permission enforcement works
- [x] **Test 7:** File integrity validation catches tampering
- [x] **Test 8:** Performance is good with many revisions
- [x] **Test 9:** Audit logs are created correctly
- [x] **Test 10:** Error handling works for edge cases

## Cleanup

After testing, remove test data:

```sql
-- Delete test revisions
DELETE FROM "DocumentRevision"
WHERE "documentId" IN ('test-doc-001', 'test-doc-rollover', 'test-doc-performance', 'test-doc-max');

-- Delete test documents
DELETE FROM "Document"
WHERE id IN ('test-doc-001', 'test-doc-rollover', 'test-doc-performance', 'test-doc-max');

-- Delete test audit logs
DELETE FROM "AuditLog"
WHERE metadata->>'documentCode' LIKE 'DWG-TEST%';
```

## Common Issues & Troubleshooting

### Issue: "File not found in storage"

**Cause:** File wasn't uploaded to R2 before calling upload-revision API

**Solution:**
1. Verify presign endpoint returned upload URL
2. Check file was uploaded to R2 successfully
3. Ensure fileKey matches between upload and revision creation

### Issue: "Multiple current revisions found"

**Cause:** Database inconsistency (manual intervention or bug)

**Solution:**
```sql
-- Find the problem
SELECT "documentId", COUNT(*)
FROM "DocumentRevision"
WHERE status = 'CURRENT'
GROUP BY "documentId"
HAVING COUNT(*) > 1;

-- Fix manually: keep latest, supersede others
UPDATE "DocumentRevision"
SET status = 'SUPERSEDED'
WHERE "documentId" = 'problem-doc-id'
  AND status = 'CURRENT'
  AND "createdAt" < (
    SELECT MAX("createdAt")
    FROM "DocumentRevision"
    WHERE "documentId" = 'problem-doc-id'
      AND status = 'CURRENT'
  );
```

### Issue: Upload button not visible

**Cause:** User lacks UPLOAD_DOCUMENT permission

**Solution:**
1. Check user's role has UPLOAD_DOCUMENT permission
2. Verify session is active and permissions are correct
3. Refresh page to ensure latest permissions are loaded

## Notes

- Always test in non-production environment first
- Use small files (< 5MB) for faster testing
- Monitor audit logs to verify all events are captured
- Test concurrent uploads to verify transaction atomicity
- Verify indexes are being used with EXPLAIN ANALYZE
