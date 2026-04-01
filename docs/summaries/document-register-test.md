# Document Register Module - Testing Instructions

## Pre-Requisites

Before testing, ensure:
1. Database is running (PostgreSQL)
2. Redis is running (for session management)
3. You have a test company with at least one user account
4. The migration has been applied: `20260401_add_documentcode_title`

## Step 1: Apply Database Migration

### Run Prisma Migration

```bash
cd packages/db
pnpm exec prisma migrate deploy
```

**Verify migration applied:**
```sql
-- Run in Supabase SQL Editor or psql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Document'
  AND column_name IN ('documentCode', 'title');
```

**Expected result:**
```
column_name  | data_type | is_nullable
-------------|-----------|------------
documentCode | text      | YES
title        | text      | YES
```

### Verify Unique Constraint

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'Document'
  AND constraint_name LIKE '%documentCode%';
```

**Expected result:**
```
Document_projectId_documentCode_key | UNIQUE
```

## Step 2: Seed Test Data

### Option A: Manual SQL Insert

Run this in Supabase SQL Editor or psql:

```sql
-- Replace with your actual companyId, projectId, and userId
DO $$
DECLARE
  test_company_id TEXT := 'your-company-id-here';
  test_project_id TEXT := 'your-project-id-here';
  test_user_id TEXT := 'your-user-id-here';
  doc_id TEXT;
  i INT;
BEGIN
  -- Create 10 test documents with documentCode and title
  FOR i IN 1..10 LOOP
    doc_id := gen_random_uuid()::TEXT;

    -- Insert Document
    INSERT INTO "Document" (
      id, "companyId", "projectId", "documentCode", title, filename,
      "fileKey", "fileSize", "mimeType", "sha256Hash", "uploadedBy",
      discipline, "issuePurpose", status, "virusScanStatus", "watermarkStatus"
    ) VALUES (
      doc_id,
      test_company_id,
      test_project_id,
      'DWG-' || LPAD(i::TEXT, 3, '0'), -- DWG-001, DWG-002, etc.
      'Test Drawing ' || i,
      'test-drawing-' || i || '.pdf',
      'documents/' || test_company_id || '/' || doc_id || '.pdf',
      1024000 + (i * 100000), -- Varying file sizes
      'application/pdf',
      encode(gen_random_bytes(32), 'hex'), -- Random SHA256
      test_user_id,
      CASE (i % 4)
        WHEN 0 THEN 'PIPING'
        WHEN 1 THEN 'STRUCTURAL'
        WHEN 2 THEN 'ELECTRICAL'
        ELSE 'MECHANICAL'
      END,
      'FOR_CONSTRUCTION',
      CASE (i % 3)
        WHEN 0 THEN 'ACTIVE'
        WHEN 1 THEN 'PENDING'
        ELSE 'SUPERSEDED'
      END,
      'CLEAN',
      'COMPLETE'
    );

    -- Insert current revision
    INSERT INTO "DocumentRevision" (
      id, "documentId", "companyId", "revisionCode",
      "fileKey", "fileSize", "sha256Hash",
      discipline, "issuePurpose", status, "watermarkStatus", "uploadedBy"
    ) VALUES (
      gen_random_uuid()::TEXT,
      doc_id,
      test_company_id,
      CHR(64 + (i % 26 + 1)), -- A, B, C, etc.
      'documents/' || test_company_id || '/' || doc_id || '.pdf',
      1024000 + (i * 100000),
      encode(gen_random_bytes(32), 'hex'),
      CASE (i % 4)
        WHEN 0 THEN 'PIPING'
        WHEN 1 THEN 'STRUCTURAL'
        WHEN 2 THEN 'ELECTRICAL'
        ELSE 'MECHANICAL'
      END,
      'FOR_CONSTRUCTION',
      'CURRENT',
      'COMPLETE',
      test_user_id
    );
  END LOOP;

  RAISE NOTICE 'Created 10 test documents with revisions';
END $$;
```

### Option B: Node.js Seeding Script

Create `scripts/seed-document-register.ts`:

```typescript
import { prismaAdmin } from '@docuroute/db'
import { DocumentStatus, EngineeringDiscipline } from '@docuroute/types'

async function seed() {
  const companyId = process.env.TEST_COMPANY_ID
  const projectId = process.env.TEST_PROJECT_ID
  const userId = process.env.TEST_USER_ID

  if (!companyId || !projectId || !userId) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  for (let i = 1; i <= 10; i++) {
    const docId = `test-doc-${i}`
    const documentCode = `DWG-${String(i).padStart(3, '0')}`

    await prismaAdmin.document.create({
      data: {
        id: docId,
        companyId,
        projectId,
        documentCode,
        title: `Test Drawing ${i}`,
        filename: `test-drawing-${i}.pdf`,
        fileKey: `documents/${companyId}/${docId}.pdf`,
        fileSize: 1024000 + (i * 100000),
        mimeType: 'application/pdf',
        sha256Hash: Buffer.from('test').toString('hex'),
        uploadedBy: userId,
        discipline: [
          EngineeringDiscipline.PIPING,
          EngineeringDiscipline.STRUCTURAL,
          EngineeringDiscipline.ELECTRICAL,
          EngineeringDiscipline.MECHANICAL,
        ][i % 4],
        issuePurpose: 'FOR_CONSTRUCTION',
        status: [
          DocumentStatus.ACTIVE,
          DocumentStatus.PENDING,
          DocumentStatus.SUPERSEDED,
        ][i % 3],
        virusScanStatus: 'CLEAN',
        watermarkStatus: 'COMPLETE',
      },
    })

    await prismaAdmin.documentRevision.create({
      data: {
        documentId: docId,
        companyId,
        revisionCode: String.fromCharCode(64 + (i % 26) + 1),
        fileKey: `documents/${companyId}/${docId}.pdf`,
        fileSize: 1024000 + (i * 100000),
        sha256Hash: Buffer.from('test').toString('hex'),
        discipline: [
          EngineeringDiscipline.PIPING,
          EngineeringDiscipline.STRUCTURAL,
          EngineeringDiscipline.ELECTRICAL,
          EngineeringDiscipline.MECHANICAL,
        ][i % 4],
        issuePurpose: 'FOR_CONSTRUCTION',
        status: 'CURRENT',
        watermarkStatus: 'COMPLETE',
        uploadedBy: userId,
      },
    })
  }

  console.log('✅ Seeded 10 test documents with revisions')
}

seed()
```

Run with:
```bash
TEST_COMPANY_ID=xxx TEST_PROJECT_ID=xxx TEST_USER_ID=xxx tsx scripts/seed-document-register.ts
```

## Step 3: Test API Endpoints

### Test 1: List All Documents

**Request:**
```bash
curl http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "...",
      "documentCode": "DWG-001",
      "title": "Test Drawing 1",
      "revisionCode": "B",
      "status": "ACTIVE",
      "discipline": "PIPING",
      "updatedAt": "2026-04-01T..."
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "pages": 1,
    "hasMore": false
  }
}
```

**Verify:**
- ✅ Returns 10 documents
- ✅ Each has documentCode, title, revisionCode
- ✅ Pagination info is correct
- ✅ Response time < 1s

### Test 2: Search by Document Code

**Request:**
```bash
curl "http://localhost:3000/api/documents?search=DWG-001" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
- Returns only documents matching "DWG-001"
- Should find 1 document

**Verify:**
- ✅ Search works case-insensitive
- ✅ Finds documents by code
- ✅ Returns correct result

### Test 3: Search by Title

**Request:**
```bash
curl "http://localhost:3000/api/documents?search=Drawing%203" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
- Returns documents with "Drawing 3" in title
- Should find 1 document

**Verify:**
- ✅ Search works on title field
- ✅ Case-insensitive matching

### Test 4: Filter by Status

**Request:**
```bash
curl "http://localhost:3000/api/documents?status=ACTIVE" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
- Returns only ACTIVE documents
- Based on seed data, should return ~3-4 documents

**Verify:**
- ✅ Filter works correctly
- ✅ Only ACTIVE documents returned

### Test 5: Filter by Discipline

**Request:**
```bash
curl "http://localhost:3000/api/documents?discipline=PIPING" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
- Returns only PIPING documents
- Should return ~2-3 documents

**Verify:**
- ✅ Filter works correctly
- ✅ Only PIPING documents returned

### Test 6: Combined Filters

**Request:**
```bash
curl "http://localhost:3000/api/documents?status=ACTIVE&discipline=PIPING" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
- Returns documents that are BOTH ACTIVE AND PIPING
- Should return 0-1 documents

**Verify:**
- ✅ Multiple filters work together (AND logic)

### Test 7: Pagination

**Request:**
```bash
# Page 1
curl "http://localhost:3000/api/documents?limit=5&page=1" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Page 2
curl "http://localhost:3000/api/documents?limit=5&page=2" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
- Page 1: 5 documents, hasMore=true
- Page 2: 5 documents, hasMore=false

**Verify:**
- ✅ Pagination works correctly
- ✅ Different documents on each page
- ✅ hasMore flag is accurate

### Test 8: Document Detail

**Request:**
```bash
# Replace DOC_ID with actual document ID from list
curl "http://localhost:3000/api/documents/DOC_ID" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "document": {
    "id": "...",
    "documentCode": "DWG-001",
    "title": "Test Drawing 1",
    "filename": "test-drawing-1.pdf",
    "fileSize": 1124000,
    "status": "ACTIVE",
    "discipline": "PIPING",
    "revisions": [
      {
        "id": "...",
        "revisionCode": "B",
        "status": "CURRENT",
        ...
      }
    ]
  },
  "auditLog": [...]
}
```

**Verify:**
- ✅ Returns full document details
- ✅ Includes all revisions
- ✅ Current revision is present
- ✅ Audit log included

### Test 9: Verify Current Revision Display

**Setup:**
Create a document with multiple revisions:

```sql
-- Add superseded revision
INSERT INTO "DocumentRevision" (
  id, "documentId", "companyId", "revisionCode",
  "fileKey", "fileSize", "sha256Hash",
  discipline, "issuePurpose", status, "watermarkStatus", "uploadedBy"
)
SELECT
  gen_random_uuid()::TEXT,
  id,
  "companyId",
  'A', -- Earlier revision
  "fileKey",
  "fileSize",
  encode(gen_random_bytes(32), 'hex'),
  discipline,
  "issuePurpose",
  'SUPERSEDED',
  'COMPLETE',
  "uploadedBy"
FROM "Document"
WHERE "documentCode" = 'DWG-001';
```

**Test:**
```bash
curl "http://localhost:3000/api/documents?search=DWG-001" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Verify:**
- ✅ Returns current revision code (not superseded one)
- ✅ Detail page shows both revisions
- ✅ Current revision is highlighted

## Step 4: Test Frontend UI

### Test 1: Document Register Page

1. Log in to application
2. Navigate to `/documents`

**Verify:**
- ✅ Page loads in <1s
- ✅ Table displays with correct columns
- ✅ All 10 test documents visible
- ✅ Document codes and titles are displayed
- ✅ Revision codes are shown
- ✅ Status badges are color-coded correctly
- ✅ Discipline badges are color-coded correctly
- ✅ Timestamps are formatted properly

### Test 2: Search Functionality

1. Enter "DWG-001" in search box
2. Click "Search" button

**Verify:**
- ✅ Results filter to matching documents
- ✅ Results count updates
- ✅ Table updates immediately
- ✅ No page refresh

### Test 3: Status Filter

1. Select "Active" from Status dropdown

**Verify:**
- ✅ Results auto-filter (no submit needed)
- ✅ Only ACTIVE documents shown
- ✅ Results count updates
- ✅ Other filters still work

### Test 4: Discipline Filter

1. Select "Piping" from Discipline dropdown

**Verify:**
- ✅ Results auto-filter
- ✅ Only PIPING documents shown
- ✅ Can combine with status filter

### Test 5: Pagination

1. Change page with Next/Previous buttons

**Verify:**
- ✅ Previous button disabled on page 1
- ✅ Next button works
- ✅ Page number updates
- ✅ Different documents on each page
- ✅ Next button disabled on last page

### Test 6: Row Click Navigation

1. Click on any table row

**Verify:**
- ✅ Navigates to document detail page
- ✅ URL changes to `/documents/[id]`
- ✅ No page refresh (client-side navigation)
- ✅ Browser back button works

### Test 7: Document Detail Page

1. Click on a document to open detail page

**Verify:**
- ✅ Shows document code and title in header
- ✅ Document Information card displays all fields
- ✅ File size is formatted (KB/MB)
- ✅ Status and discipline badges are shown
- ✅ Timestamps are formatted

### Test 8: Revision History

**Verify:**
- ✅ All revisions are displayed
- ✅ Current revision has green background
- ✅ Current revision has "CURRENT" badge
- ✅ Revisions ordered correctly (CURRENT first)

### Test 9: Audit History

**Verify:**
- ✅ Audit entries are displayed
- ✅ Shows action type and timestamp
- ✅ Most recent entries first

### Test 10: Back Navigation

1. Click "Back" button on detail page

**Verify:**
- ✅ Returns to document register
- ✅ Preserves search/filter state (if applicable)
- ✅ Fast navigation (no full reload)

## Step 5: Verify Audit Logging

### Check Audit Logs Created

```sql
-- View recent document list views
SELECT
  "userId", action, "resourceType",
  metadata->>'resultCount' as result_count,
  "createdAt"
FROM "AuditLog"
WHERE action = 'DOCUMENT_DOWNLOADED'
  AND "resourceType" = 'DocumentList'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Verify:**
- ✅ Audit entries created for list views
- ✅ Includes result count in metadata
- ✅ Includes filters in metadata

```sql
-- View recent document detail views
SELECT
  "userId", action, "resourceType", "resourceId",
  metadata->>'documentCode' as doc_code,
  "createdAt"
FROM "AuditLog"
WHERE action = 'DOCUMENT_DOWNLOADED'
  AND "resourceType" = 'Document'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Verify:**
- ✅ Audit entries created for detail views
- ✅ Includes document ID
- ✅ Includes document code in metadata

## Step 6: Performance Testing

### Test Load Time with 1000 Documents

1. Seed 1000 documents (modify seed script)
2. Load `/documents` page
3. Measure response time

**Verify:**
- ✅ Page loads in <1s
- ✅ No performance degradation
- ✅ Pagination still works

### Test Query Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM "Document"
WHERE "companyId" = 'xxx'
  AND status = 'ACTIVE'
ORDER BY "updatedAt" DESC
LIMIT 50;
```

**Verify:**
- ✅ Uses index on (companyId, status)
- ✅ Query time < 100ms
- ✅ No sequential scans

## Step 7: Error Cases

### Test 1: No Permission

1. Remove VIEW_DOCUMENT permission from test user
2. Try to access `/documents`

**Verify:**
- ✅ Returns 403 Forbidden
- ✅ Error message shown

### Test 2: Invalid Document ID

```bash
curl "http://localhost:3000/api/documents/invalid-id" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Verify:**
- ✅ Returns 404 Not Found
- ✅ Error handled gracefully

### Test 3: Cross-Tenant Access

1. Try to access document from different company

**Verify:**
- ✅ Returns 404 (RLS prevents access)
- ✅ No data leak

## Success Criteria

All tests must pass:
- ✅ Migration applied successfully
- ✅ Test data seeded
- ✅ All API endpoints work correctly
- ✅ Search and filters work
- ✅ Pagination works
- ✅ Current revision displayed correctly
- ✅ Frontend UI loads in <1s
- ✅ Audit logs created
- ✅ No permission bypasses
- ✅ No cross-tenant data access

## Cleanup

To remove test data:

```sql
DELETE FROM "DocumentRevision"
WHERE "companyId" = 'your-company-id'
  AND "documentId" IN (
    SELECT id FROM "Document"
    WHERE "documentCode" LIKE 'DWG-%'
  );

DELETE FROM "Document"
WHERE "companyId" = 'your-company-id'
  AND "documentCode" LIKE 'DWG-%';
```
