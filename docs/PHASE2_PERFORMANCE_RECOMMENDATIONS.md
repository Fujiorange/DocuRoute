# Phase 2 Performance & Efficiency Recommendations

**Date:** March 23, 2026
**Phase:** Phase 2 Planning Review
**Status:** Analysis Complete - Ready for Implementation
**Related:** See also [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) for Phase 0/1 issues

---

## Executive Summary

This document provides performance and efficiency recommendations for Phase 2 implementation of DocuRoute, based on review of the Phase 2 plan documentation (`doc/plan/P2P*.md`) and existing codebase patterns. These recommendations should be incorporated during Phase 2 development to avoid technical debt and performance bottlenecks.

**Key Focus Areas:**
- Database query optimization for new models
- Missing indexes for Phase 2 features
- Pagination requirements for new list endpoints
- Rate limiting for new mutation endpoints
- Transaction usage for multi-step operations
- Background job optimization strategies
- Memory-efficient file processing
- Caching strategies for Phase 2 features

---

## Table of Contents

1. [Critical Performance Concerns](#1-critical-performance-concerns)
2. [Database Schema & Index Recommendations](#2-database-schema--index-recommendations)
3. [API Endpoint Optimization](#3-api-endpoint-optimization)
4. [Background Job Efficiency](#4-background-job-efficiency)
5. [Memory Management](#5-memory-management)
6. [Caching Strategies](#6-caching-strategies)
7. [Phase-by-Phase Implementation Priorities](#7-phase-by-phase-implementation-priorities)

---

## 1. Critical Performance Concerns

### 1.1 Equipment Hierarchy Queries (P2P1)

**Issue:** N+1 Query Risk
**Location:** Future implementation in `packages/core/src/equipment.ts`

**Problem:**
Equipment hierarchy with parent-child relationships will likely create N+1 queries if not properly implemented:

```typescript
// ❌ BAD: N+1 queries
const equipment = await prisma.equipment.findMany({ where: { projectId } })
for (const eq of equipment) {
  const parent = await prisma.equipment.findUnique({ where: { id: eq.parentId } })
  const children = await prisma.equipment.findMany({ where: { parentId: eq.id } })
}
```

**Recommendation:**
```typescript
// ✅ GOOD: Single query with includes
const equipment = await prisma.equipment.findMany({
  where: { projectId },
  include: {
    parent: true,
    children: true,
    documentMappings: {
      include: { document: true }
    }
  },
  orderBy: [
    { level: 'asc' },
    { tagPrefix: 'asc' },
    { tagNumber: 'asc' }
  ]
})
```

**Required Indexes:**
```prisma
model Equipment {
  @@index([companyId, projectId])
  @@index([parentId])
  @@index([lifecycleStage])
  @@index([tagPrefix, tagType])
  @@index([level]) // CRITICAL for hierarchy queries
}
```

---

### 1.2 Document Search with pg_trgm (P1P7)

**Issue:** Missing Extension & Index
**Status:** Documented but NOT created
**Location:** `apps/web/src/app/api/documents/search/route.ts`

**Current State:**
The search API uses `pg_trgm` for fuzzy matching, but the extension and index creation are documented as manual steps in `DEPLOYMENT_CHECKLIST.md` - they may not be created.

**Required SQL:**
```sql
-- Must run BEFORE search API is used
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_document_filename_trgm
  ON "Document"
  USING GIN (filename gin_trgm_ops);

-- Optional but recommended for better search
CREATE INDEX idx_document_code_trgm
  ON "Document"
  USING GIN ("documentCode" gin_trgm_ops);
```

**Performance Impact:**
- Without index: Full table scan on every search query
- With index: <500ms search even with 100,000+ documents
- Expected: 50-100× performance improvement

**Recommendation:**
Add to Prisma migration file instead of manual SQL:
```sql
-- In packages/db/prisma/migrations/XXXXXX_add_search_indexes/migration.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_document_filename_trgm ON "Document" USING GIN (filename gin_trgm_ops);
CREATE INDEX idx_document_code_trgm ON "Document" USING GIN ("documentCode" gin_trgm_ops);
```

---

### 1.3 Vendor Submission Auto-Review Trigger (P2P4)

**Issue:** Potential Transaction Deadlock
**Location:** Future `packages/core/src/vendors.ts` - `onVendorSubmissionSubmitted()`

**Problem:**
The vendor submission workflow triggers automatic document review creation:
1. Create DocumentRevision for each document
2. Create DisciplineReviewStatus for each discipline
3. Create notifications for all reviewers
4. Update submission status

Without proper transaction handling and batch operations, this could:
- Create partial state on failure
- Generate hundreds of individual INSERT queries
- Risk deadlocks with concurrent submissions

**Recommendation:**
```typescript
async function onVendorSubmissionSubmitted(
  submissionId: string,
  tx?: PrismaClient
): Promise<{
  revisionsCreated: number;
  disciplineStatusesCreated: number;
  notificationsSent: number;
}> {
  return await prisma.$transaction(async (txClient) => {
    const submission = await txClient.vendorSubmission.findUnique({
      where: { id: submissionId },
      include: { documents: true }
    })

    // Batch operations
    const revisions = await txClient.documentRevision.createMany({
      data: submission.documents.map(doc => ({
        documentId: doc.id,
        reviewRound: 1,
        fileKey: doc.fileKey,
        // ... other fields
      }))
    })

    // Batch discipline status creation
    const disciplineStatuses = []
    for (const doc of submission.documents) {
      for (const discipline of submission.requiredDisciplines) {
        disciplineStatuses.push({
          documentId: doc.id,
          revisionId: /* revision ID */,
          discipline,
          status: 'PENDING'
        })
      }
    }

    await txClient.disciplineReviewStatus.createMany({
      data: disciplineStatuses
    })

    // Use existing bulk notification function
    await createNotificationsForPermission({
      companyId: submission.companyId,
      eventType: 'VENDOR_SUBMISSION_REVIEW_REQUIRED',
      targetPermission: Permission.DOCUMENT_REVIEW,
      metadata: { submissionId },
      tx: txClient
    })

    return {
      revisionsCreated: revisions.count,
      disciplineStatusesCreated: disciplineStatuses.length,
      notificationsSent: /* count */
    }
  }, {
    timeout: 30000, // 30 second timeout for large submissions
    isolationLevel: 'ReadCommitted' // Prevent deadlocks
  })
}
```

---

### 1.4 BIM Import Transaction Size (P2P5)

**Issue:** Large Transaction Risk
**Location:** Future `packages/core/src/bim-integration.ts` - `importBIMEquipment()`

**Problem:**
Importing 10,000+ equipment items in a single transaction:
- Locks large portions of database
- Risks timeout (default 5 seconds)
- All-or-nothing makes debugging hard
- Consumes excessive memory

**Recommendation:**
Use batch processing with smaller transactions:

```typescript
async function importBIMEquipment(
  projectId: string,
  source: BIMSystem,
  equipment: BIMImportEquipment[],
  options: ImportOptions,
  userId: string
): Promise<ImportResult> {
  const BATCH_SIZE = 100 // Process 100 equipment at a time
  let imported = 0, updated = 0, skipped = 0
  const conflicts: Conflict[] = []

  // Process in batches
  for (let i = 0; i < equipment.length; i += BATCH_SIZE) {
    const batch = equipment.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(async (tx) => {
      for (const item of batch) {
        try {
          // Normalize tag
          const normalizedTag = await normalizeEquipmentTag(
            item.tag,
            source,
            companyId
          )

          // Check if exists
          const existing = await tx.equipment.findUnique({
            where: {
              projectId_tag: { projectId, tag: normalizedTag }
            }
          })

          if (existing && !options.updateExisting) {
            conflicts.push({
              tag: item.tag,
              issue: 'Duplicate tag',
              action: 'SKIPPED'
            })
            skipped++
            continue
          }

          if (existing && options.updateExisting) {
            await tx.equipment.update({
              where: { id: existing.id },
              data: { /* updated fields */ }
            })
            updated++
          } else {
            await tx.equipment.create({
              data: { /* new equipment */ }
            })
            imported++
          }
        } catch (error) {
          // Log error but continue with batch
          conflicts.push({
            tag: item.tag,
            issue: error.message,
            action: 'FAILED'
          })
          skipped++
        }
      }
    }, {
      timeout: 15000 // 15 second timeout per batch
    })

    // Progress callback (optional)
    await onProgress?.({
      processed: Math.min(i + BATCH_SIZE, equipment.length),
      total: equipment.length
    })
  }

  // Create import log AFTER all batches
  await prisma.bIMImportLog.create({
    data: {
      companyId,
      projectId,
      importSource: source,
      fileName: /* filename */,
      fileChecksum: /* checksum */,
      recordsImported: imported,
      recordsUpdated: updated,
      recordsSkipped: skipped,
      status: conflicts.length > 0 ? 'PARTIAL' : 'SUCCESS',
      errorDetails: conflicts,
      importedBy: userId
    }
  })

  return {
    importLogId: /* log ID */,
    recordsImported: imported,
    recordsUpdated: updated,
    recordsSkipped: skipped,
    conflicts
  }
}
```

**Benefits:**
- Smaller transaction locks
- Partial success possible
- Better error reporting
- Progress tracking
- Can handle imports of 100,000+ items

---

## 2. Database Schema & Index Recommendations

### 2.1 Equipment Hierarchy (P2P1)

**Required Indexes:**
```prisma
model Equipment {
  @@unique([projectId, tag])
  @@index([companyId, projectId])
  @@index([parentId])  // CRITICAL for tree queries
  @@index([lifecycleStage])
  @@index([criticalityLevel])
  @@index([maintenanceType])
  @@index([tagPrefix, tagType])
  @@index([level])  // NEW: For level-based queries
  @@index([projectId, lifecycleStage])  // NEW: Composite for common filter
}

model EquipmentDocument {
  @@unique([equipmentId, documentId, relationship])
  @@index([documentId])
  @@index([revisionId])
  @@index([validFrom, validUntil])
  @@index([equipmentId, relationship])  // NEW: For fetching by type
}

model EquipmentChangeLog {
  @@index([equipmentId, changedAt])
  @@index([changeType])
  @@index([changedAt])
  @@index([changeType, changedAt])  // NEW: Composite for filtering
}
```

---

### 2.2 Project Templates (P2P3)

**Required Indexes:**
```prisma
model TemplateEquipment {
  @@unique([templateId, tag])
  @@index([templateId, parentTag])
  @@index([templateId, equipmentType])
  @@index([templateId, level])  // NEW: For hierarchy rendering
}

model TemplateFolder {
  @@index([templateId, parentId])
  @@index([templateId, level])  // NEW: For hierarchy rendering
}

model TemplateWorkflowStage {
  @@unique([templateId, stageOrder])
  @@index([templateId])
  @@index([templateId, stageOrder])  // Composite for ordering
}
```

**Performance Note:**
Template application can clone 1000+ equipment items. Use `createMany()` instead of individual `create()`:

```typescript
// ✅ GOOD: Batch operation
await tx.equipment.createMany({
  data: templateEquipment.map(te => ({
    projectId,
    tag: te.tag,
    name: te.name,
    equipmentType: te.equipmentType,
    // ... map all fields
  }))
})

// ❌ BAD: N queries
for (const te of templateEquipment) {
  await tx.equipment.create({
    data: { /* ... */ }
  })
}
```

---

### 2.3 Vendor Management (P2P4)

**Required Indexes:**
```prisma
model VendorCompany {
  @@unique([companyId, code])
  @@index([companyId])
  @@index([companyId, portalEnabled])  // NEW: For portal filtering
}

model VendorContact {
  @@unique([vendorCompanyId, email])
  @@index([email])  // For GDPR searches
  @@index([vendorCompanyId, isActive])  // NEW: Active contacts only
}

model VendorSubmission {
  @@unique([companyId, submissionCode])
  @@index([vendorCompanyId, status])
  @@index([projectId, status])
  @@index([equipmentId])
  @@index([companyId, status, submittedAt])  // NEW: For reporting
}
```

---

### 2.4 Field Execution (P2P6)

**Required Indexes:**
```prisma
model FieldInspection {
  @@index([equipmentId, timestamp])
  @@index([projectId, inspectionType])
  @@index([status])
  @@index([projectId, status, timestamp])  // NEW: For filtering/sorting
  @@index([equipmentId, inspectionType, timestamp])  // NEW: Equipment history
}

model CommissioningRecord {
  @@index([equipmentId, recordType])
  @@index([projectId, verdict])
  @@index([projectId, recordType, verdict])  // NEW: For reporting
  @@index([projectId, executedAt])  // NEW: Timeline queries
}

model PunchItem {
  @@unique([companyId, itemNumber])
  @@index([equipmentId, status])
  @@index([projectId, status, severity])
  @@index([assignedTo, status])
  @@index([targetDate, status])
  @@index([projectId, severity, targetDate])  // NEW: Overdue critical items
}
```

---

### 2.5 Audit Ledger (P2P8)

**Enhanced Indexes:**
```prisma
model AuditVaultEntry {
  // Existing
  @@index([companyId, chainIndex])
  @@unique([companyId, chainIndex])

  // NEW: For efficient chain verification
  @@index([companyId, createdAt])
  @@index([companyId, eventType, createdAt])
  @@index([documentFingerprint])  // For document integrity checks
}

model AuditAnchorBatch {
  @@index([companyId, anchoredAt])
  @@index([companyId, anchorType, anchoredAt])  // NEW: Filter by type
}
```

**Critical Performance Fix:**
The chain verification query will scan millions of rows. Add pagination:

```typescript
// ✅ GOOD: Cursor-based pagination
async function verifyAuditChain(
  companyId: string,
  batchSize = 1000
): Promise<VerificationResult> {
  let cursor: string | undefined
  const tampered: string[] = []

  while (true) {
    const entries = await prisma.auditVaultEntry.findMany({
      where: {
        companyId,
        ...(cursor ? { chainIndex: { gt: parseInt(cursor) } } : {})
      },
      orderBy: { chainIndex: 'asc' },
      take: batchSize
    })

    if (entries.length === 0) break

    // Parallel hash verification within batch
    const results = await Promise.all(
      entries.map(async (entry) => {
        const computed = await hashSHA256(/* ... */)
        return { id: entry.id, valid: computed === entry.hash }
      })
    )

    tampered.push(...results.filter(r => !r.valid).map(r => r.id))
    cursor = entries[entries.length - 1].chainIndex.toString()
  }

  return { valid: tampered.length === 0, tampered }
}
```

---

### 2.6 Storage Quota (P2P9)

**Required Indexes:**
```prisma
model Project {
  // Existing indexes...
  @@index([companyId, storageTier])  // NEW: For tier-based queries
  @@index([companyId, lastAccessedAt])  // NEW: For archival recommendations
  @@index([companyId, isPinned, lastAccessedAt])  // NEW: Unpinned old projects
}

model DocumentAccessLog {
  @@index([projectId, timestamp])
  @@index([documentId, timestamp])
  @@index([companyId, timestamp])
  @@index([projectId, accessType, timestamp])  // NEW: Access pattern analysis
}

model StorageQuotaLog {
  @@index([companyId, timestamp])
  @@index([companyId, action, timestamp])  // NEW: Action-specific queries
}
```

**Performance Note:**
Storage calculation for large projects:

```typescript
// ✅ GOOD: Aggregate at database level
async function calculateProjectStorage(projectId: string): Promise<number> {
  const result = await prisma.document.aggregate({
    where: { projectId },
    _sum: {
      fileSize: true,
      watermarkFileSize: true
    }
  })

  const totalBytes = (result._sum.fileSize || 0) + (result._sum.watermarkFileSize || 0)
  return totalBytes / (1024 ** 3) // Convert to GB
}

// ❌ BAD: Fetch all documents
const documents = await prisma.document.findMany({
  where: { projectId },
  select: { fileSize: true, watermarkFileSize: true }
})
const totalBytes = documents.reduce((sum, doc) =>
  sum + (doc.fileSize || 0) + (doc.watermarkFileSize || 0), 0
)
```

---

### 2.7 Multi-Round Review (P2P10)

**Required Indexes:**
```prisma
model DocumentRevision {
  // Existing indexes...
  @@index([documentId, reviewRound])  // NEW: For review history
  @@index([supersededById])  // NEW: For supersession chain
  @@index([lockedBy, lockedUntil])  // NEW: For cleanup of abandoned locks
}

model Review {
  @@index([documentId, reviewRound])
  @@index([revisionId])
  @@index([reviewerUserId, reviewedAt])
  @@index([companyId, decision])
  @@index([requiresRfi, rfiResolvedAt])
  @@index([documentId, reviewRound, discipline])  // NEW: Discipline filtering
  @@index([revisionId, decision])  // NEW: Decision summary
}

model DisciplineReviewStatus {
  @@unique([documentId, revisionId, discipline])
  @@index([companyId, status])
  @@index([revisionId, status])  // NEW: Pending disciplines
  @@index([documentId, discipline, completedAt])  // NEW: Discipline history
}
```

---

## 3. API Endpoint Optimization

### 3.1 Pagination Requirements

**ALL list endpoints MUST have pagination.** Here are the endpoints that will need it:

#### P2P1 - Equipment
```typescript
// GET /api/equipment?projectId={id}&page=1&limit=50
// ✅ Add pagination parameters
const page = parseInt(req.query.page as string) || 1
const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
const skip = (page - 1) * limit

const [equipment, total] = await Promise.all([
  prisma.equipment.findMany({
    where: { projectId },
    skip,
    take: limit,
    include: { parent: true, children: true }
  }),
  prisma.equipment.count({ where: { projectId } })
])

return {
  data: equipment,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
}
```

#### P2P4 - Vendor Submissions
```typescript
// GET /api/vendor-submissions?projectId={id}&status={status}&page=1&limit=50
```

#### P2P6 - Field Inspections
```typescript
// GET /api/field-inspections?equipmentId={id}&page=1&limit=50
```

#### P2P6 - Punch Items
```typescript
// GET /api/punch-items?projectId={id}&status={status}&page=1&limit=50
```

#### P2P7 - Classification Society Submissions
```typescript
// GET /api/classification-societies/submissions?projectId={id}&page=1&limit=50
```

#### P2P9 - Document Access Logs
```typescript
// GET /api/storage/quota-logs?companyId={id}&page=1&limit=100
```

#### P2P10 - Review History
```typescript
// GET /api/documents/{id}/review-history?page=1&limit=20
```

**Default Limits:**
- List endpoints: `limit=50`, max `100`
- Log/history endpoints: `limit=100`, max `500`
- Search endpoints: `limit=20`, max `100`

---

### 3.2 Rate Limiting Requirements

**Critical mutation endpoints that MUST have rate limiting:**

#### P2P1 - Equipment Creation
```typescript
// POST /api/equipment
await checkRateLimit({
  key: `equipment:create:${session.user.companyId}`,
  limit: 100,
  windowSeconds: 3600 // 100 per hour (prevent bulk spam)
})
```

#### P2P3 - Template Application
```typescript
// POST /api/projects/{id}/apply-template
await checkRateLimit({
  key: `template:apply:${session.user.id}`,
  limit: 10,
  windowSeconds: 3600 // 10 per hour (resource-intensive)
})
```

#### P2P4 - Vendor Submission
```typescript
// PATCH /api/vendor-submissions/{id}/submit
await checkRateLimit({
  key: `vendor:submit:${session.user.companyId}`,
  limit: 50,
  windowSeconds: 3600 // 50 submissions per hour
})
```

#### P2P5 - BIM Import
```typescript
// POST /api/projects/{id}/import-bim-equipment
await checkRateLimit({
  key: `bim:import:${session.user.id}`,
  limit: 5,
  windowSeconds: 3600 // 5 imports per hour (very resource-intensive)
})
```

#### P2P6 - Field Inspection
```typescript
// POST /api/field-inspections
await checkRateLimit({
  key: `inspection:create:${session.user.id}`,
  limit: 200,
  windowSeconds: 3600 // 200 per hour (field workers submit frequently)
})
```

#### P2P7 - Package Generation
```typescript
// POST /api/classification-societies/generate-package
await checkRateLimit({
  key: `class-society:package:${session.user.companyId}`,
  limit: 20,
  windowSeconds: 86400 // 20 per day (very resource-intensive)
})
```

#### P2P8 - Audit Chain Export
```typescript
// GET /api/audit-chain/export
await checkRateLimit({
  key: `audit:export:${session.user.companyId}`,
  limit: 10,
  windowSeconds: 3600 // 10 per hour (large dataset export)
})
```

#### P2P9 - Project Archive/Restore
```typescript
// POST /api/projects/{id}/archive
await checkRateLimit({
  key: `storage:archive:${session.user.id}`,
  limit: 20,
  windowSeconds: 86400 // 20 per day (background job intensive)
})
```

#### P2P10 - Review Submission
```typescript
// POST /api/documents/{id}/revisions/{revId}/review
await checkRateLimit({
  key: `review:submit:${session.user.id}`,
  limit: 100,
  windowSeconds: 3600 // 100 reviews per hour
})
```

---

### 3.3 Response Size Optimization

**Large responses that need optimization:**

#### Equipment Tree with Full Hierarchy
```typescript
// ❌ BAD: Returns entire tree (could be 10,000+ items)
GET /api/equipment/{id}/tree

// ✅ GOOD: Lazy loading by level
GET /api/equipment/{id}/children  // Immediate children only
GET /api/equipment/{id}/ancestors  // Parent chain only
```

#### Classification Society Package
```typescript
// ❌ BAD: Returns entire PDF in JSON response
{
  pdfPackage: "<base64 200MB string>"
}

// ✅ GOOD: Return presigned URL
{
  downloadUrls: {
    pdf: "https://r2.../package.pdf?expires=...",
    coverLetter: "https://r2.../cover.pdf?expires=...",
    zip: "https://r2.../complete.zip?expires=..."
  }
}
```

#### Audit Chain Export
```typescript
// ❌ BAD: Return 100,000 entries in single response
GET /api/audit-chain/export

// ✅ GOOD: Stream or paginate
GET /api/audit-chain/export?format=json&cursor={cursor}&limit=1000
// Or: Return job ID and poll for completion
POST /api/audit-chain/export/start
GET /api/audit-chain/export/{jobId}/status
GET /api/audit-chain/export/{jobId}/download
```

---

## 4. Background Job Efficiency

### 4.1 BullMQ Job Priorities

**Set appropriate concurrency and priority for each job type:**

```typescript
// apps/worker/src/index.ts

// Watermark jobs (existing)
const watermarkWorker = new Worker('watermark', processWatermarkJob, {
  concurrency: 4,  // Increase from 2 (based on profiling)
  limiter: { max: 10, duration: 60000 }
})

// NEW: BIM import jobs (P2P5)
const bimImportWorker = new Worker('bim-import', processBIMImport, {
  concurrency: 2,  // Resource-intensive, limit concurrency
  limiter: { max: 5, duration: 60000 }
})

// NEW: Project archival jobs (P2P9)
const archivalWorker = new Worker('project-archive', processArchival, {
  concurrency: 1,  // One at a time to avoid R2 throttling
  limiter: { max: 10, duration: 60000 }
})

// NEW: Classification society package generation (P2P7)
const packageWorker = new Worker('class-society-package', processPackage, {
  concurrency: 3,  // PDF processing intensive
  limiter: { max: 20, duration: 60000 }
})

// NEW: Daily storage calculation (P2P9)
const storageCalcWorker = new Worker('storage-calculation', processStorageCalc, {
  concurrency: 5,  // Can parallelize per-project
  limiter: { max: 100, duration: 60000 }
})

// NEW: Audit chain verification (P2P8)
const auditVerifyWorker = new Worker('audit-verify', processAuditVerify, {
  concurrency: 1,  // Sequential for chain integrity
  limiter: { max: 10, duration: 3600000 }  // Max 10 per hour
})
```

---

### 4.2 Job Progress Tracking

**For long-running jobs, implement progress updates:**

```typescript
// Example: BIM import with progress
async function processBIMImport(job: Job<BIMImportData>) {
  const { equipment, projectId } = job.data
  const BATCH_SIZE = 100

  for (let i = 0; i < equipment.length; i += BATCH_SIZE) {
    const batch = equipment.slice(i, i + BATCH_SIZE)

    // Process batch...
    await importBatch(batch, projectId)

    // Update progress
    const progress = ((i + BATCH_SIZE) / equipment.length) * 100
    await job.updateProgress(Math.min(progress, 100))
  }

  return {
    imported: equipment.length,
    status: 'SUCCESS'
  }
}

// Client polls for progress
GET /api/jobs/{jobId}/progress
// Response: { progress: 45.2, status: 'active' }
```

---

### 4.3 Failed Job Retry Strategy

```typescript
// apps/worker/src/index.ts

// Configure retry attempts and backoff
const workerOptions = {
  connection: redisConnection,
  concurrency: 4,
  settings: {
    retryProcessDelay: 5000,  // Wait 5s before retry
    maxStalledCount: 3,  // Max retries for stalled jobs
    stalledInterval: 30000  // Check for stalled jobs every 30s
  }
}

// Add job-specific retry configuration
await watermarkQueue.add('watermark', data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s, 10s, 20s
  },
  removeOnComplete: {
    age: 86400,  // Keep successful jobs for 24 hours
    count: 1000  // Keep max 1000 completed jobs
  },
  removeOnFail: {
    age: 604800  // Keep failed jobs for 7 days for debugging
  }
})
```

---

## 5. Memory Management

### 5.1 Large File Streaming

**For P2P7 (Classification Society), P2P9 (Archival), implement streaming:**

```typescript
// ✅ GOOD: Stream large PDFs
import { pipeline } from 'stream/promises'
import { createReadStream, createWriteStream } from 'fs'

async function generateClassSocietyPackage(documentKeys: string[]) {
  const tempFiles: string[] = []

  try {
    // Download all documents to temp files (streaming)
    for (const key of documentKeys) {
      const tempPath = `/tmp/doc-${randomUUID()}.pdf`
      const readStream = await getR2ObjectStream(key)
      const writeStream = createWriteStream(tempPath)

      await pipeline(readStream, writeStream)
      tempFiles.push(tempPath)
    }

    // Merge PDFs using file paths (not buffers)
    const mergedPdf = await mergePDFFiles(tempFiles)

    // Stream upload back to R2
    const uploadStream = createReadStream(mergedPdf)
    await uploadToR2Stream('packages/merged.pdf', uploadStream)

  } finally {
    // Cleanup temp files
    for (const file of tempFiles) {
      await unlink(file)
    }
  }
}
```

---

### 5.2 Batch Processing Limits

**P2P10 - Multi-Round Review consolidation:**

```typescript
// Process reviews in batches to avoid memory issues
async function consolidateAllDisciplines(revisionId: string) {
  const disciplines = await prisma.disciplineReviewStatus.findMany({
    where: { revisionId, status: 'IN_PROGRESS' },
    select: { discipline: true }
  })

  // Process one discipline at a time
  for (const { discipline } of disciplines) {
    await consolidateDisciplineReview(revisionId, discipline)

    // Small delay to avoid overwhelming database
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
```

---

## 6. Caching Strategies

### 6.1 Equipment Hierarchy Caching (P2P1)

```typescript
// Cache full equipment tree for project (expensive to compute)
const cacheKey = `equipment:tree:${projectId}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

// Compute tree (expensive)
const tree = await buildEquipmentTree(projectId)

// Cache for 15 minutes
await redis.setex(cacheKey, 900, JSON.stringify(tree))

return tree
```

**Invalidation:**
```typescript
// Invalidate on equipment create/update/delete
await redis.del(`equipment:tree:${projectId}`)
```

---

### 6.2 Template Structure Caching (P2P3)

```typescript
// Cache template details (rarely change)
const cacheKey = `template:${templateId}`
const TTL = 3600  // 1 hour

const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const template = await prisma.projectTemplate.findUnique({
  where: { id: templateId },
  include: {
    equipmentItems: true,
    folders: true,
    workflowStages: true,
    checklistItems: true
  }
})

await redis.setex(cacheKey, TTL, JSON.stringify(template))
return template
```

---

### 6.3 BIM Normalization Rules Caching (P2P5)

```typescript
// Cache active normalization rules per company
const cacheKey = `bim:rules:${companyId}:${bimSystem}`
const TTL = 1800  // 30 minutes

const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const rules = await prisma.bIMTagNormalizationRule.findMany({
  where: { companyId, bimSystem, isActive: true },
  orderBy: { priority: 'asc' }
})

await redis.setex(cacheKey, TTL, JSON.stringify(rules))
return rules
```

---

### 6.4 Commissioning Templates Caching (P2P6)

```typescript
// Cache commissioning templates by equipment type
const cacheKey = `commissioning:template:${companyId}:${equipmentType}`
const TTL = 3600  // 1 hour

const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const template = await prisma.commissioningTemplate.findFirst({
  where: { companyId, equipmentType, isActive: true }
})

await redis.setex(cacheKey, TTL, JSON.stringify(template))
return template
```

---

## 7. Phase-by-Phase Implementation Priorities

### P2P1 - Equipment Hierarchy Management

**Before Implementation:**
- [ ] Add all equipment indexes to schema
- [ ] Implement `createMany()` for bulk operations
- [ ] Add equipment tree caching
- [ ] Plan for level computation SQL function

**During Implementation:**
- [ ] Use single query with includes for hierarchy
- [ ] Validate circular reference prevention
- [ ] Add rate limiting to equipment creation
- [ ] Implement pagination for equipment list

**Testing:**
- [ ] Load test with 10,000+ equipment items
- [ ] Test tree query performance (should be <2 seconds)
- [ ] Verify cache invalidation on updates

---

### P2P3 - Project Templates

**Before Implementation:**
- [ ] Add template model indexes
- [ ] Plan transaction strategy for template application
- [ ] Implement template caching

**During Implementation:**
- [ ] Use batch operations (`createMany`) for cloning
- [ ] Add progress tracking for large template applications
- [ ] Set transaction timeout to 30 seconds minimum
- [ ] Add pagination to template library

**Testing:**
- [ ] Test template with 1000+ equipment items
- [ ] Verify transaction rollback on failure
- [ ] Test concurrent template applications

---

### P2P4 - Vendor Company Management

**Before Implementation:**
- [ ] Add vendor model indexes
- [ ] Plan vendor submission workflow transaction
- [ ] Implement rate limiting for submission trigger

**During Implementation:**
- [ ] Use batch operations for review creation
- [ ] Add proper transaction handling with timeout
- [ ] Implement GDPR export efficiently

**Testing:**
- [ ] Test submission with 50+ documents
- [ ] Verify all reviewers notified correctly
- [ ] Test concurrent vendor submissions

---

### P2P5 - BIM / 3D Model Integration

**Before Implementation:**
- [ ] Add BIM import model indexes
- [ ] Plan batch processing strategy (100 items per batch)
- [ ] Implement normalization rule caching
- [ ] Add rate limiting (5 imports per hour)

**During Implementation:**
- [ ] Process imports in batches of 100
- [ ] Add progress tracking callback
- [ ] Implement proper error handling per item
- [ ] Queue large imports (>1000 items) to BullMQ

**Testing:**
- [ ] Test import with 10,000 items
- [ ] Verify tag normalization performance
- [ ] Test conflict resolution strategies

---

### P2P6 - QR / Barcode Field Execution Layer

**Before Implementation:**
- [ ] Add field execution model indexes
- [ ] Plan offline sync conflict resolution
- [ ] Implement inspection caching for offline mode

**During Implementation:**
- [ ] Add rate limiting (200 inspections per hour)
- [ ] Implement batch sync for offline submissions
- [ ] Use IndexedDB compound indexes

**Testing:**
- [ ] Test offline mode with 100+ cached inspections
- [ ] Verify conflict resolution logic
- [ ] Test QR generation performance (<100ms)

---

### P2P7 - Classification Society Assisted Submission

**Before Implementation:**
- [ ] Add class society model indexes
- [ ] Plan file streaming strategy
- [ ] Implement package generation job with progress

**During Implementation:**
- [ ] Use streaming for large PDF operations
- [ ] Add proper cleanup of temp files
- [ ] Queue package generation to BullMQ
- [ ] Add rate limiting (20 packages per day)

**Testing:**
- [ ] Test package with 50+ documents
- [ ] Verify memory usage stays under 2GB
- [ ] Test concurrent package generation

---

### P2P8 - Immutable Audit Ledger with Anchoring

**Before Implementation:**
- [ ] Add audit chain indexes
- [ ] Plan cursor-based pagination for verification
- [ ] Implement parallel hash verification

**During Implementation:**
- [ ] Process verification in 1000-entry batches
- [ ] Use `Promise.all()` for parallel hashing
- [ ] Add progress tracking for large chains
- [ ] Add rate limiting (10 exports per hour)

**Testing:**
- [ ] Test verification with 100,000+ entries
- [ ] Verify merkle tree construction performance
- [ ] Test export with pagination

---

### P2P9 - Per-Project Storage Quota & Archival

**Before Implementation:**
- [ ] Add storage model indexes
- [ ] Plan archival job strategy
- [ ] Implement storage calculation caching

**During Implementation:**
- [ ] Use database aggregates for storage calculation
- [ ] Add rate limiting (20 archives per day)
- [ ] Queue archival jobs to BullMQ
- [ ] Implement auto-restore threshold logic

**Testing:**
- [ ] Test archival with 100GB project
- [ ] Verify quota enforcement blocks uploads
- [ ] Test concurrent archival operations

---

### P2P10 - Multi-Round Document Review

**Before Implementation:**
- [ ] Add review model indexes
- [ ] Plan consolidation batch processing
- [ ] Implement optimistic locking

**During Implementation:**
- [ ] Use batch operations for review status creation
- [ ] Add pagination to review history
- [ ] Implement proper version conflict detection
- [ ] Add rate limiting (100 reviews per hour)

**Testing:**
- [ ] Test multi-discipline review with 10+ reviewers
- [ ] Verify supersession chain integrity
- [ ] Test concurrent review submissions
- [ ] Test optimistic locking conflicts

---

## 8. Monitoring & Observability

### 8.1 Required Metrics

Add these metrics to track Phase 2 performance:

```typescript
// packages/core/src/metrics.ts

export const metrics = {
  // Equipment (P2P1)
  equipmentTreeQueryDuration: new Histogram({
    name: 'equipment_tree_query_duration_ms',
    help: 'Duration of equipment tree queries',
    labelNames: ['projectId']
  }),

  // Templates (P2P3)
  templateApplicationDuration: new Histogram({
    name: 'template_application_duration_ms',
    help: 'Duration of template application',
    labelNames: ['templateId', 'itemCount']
  }),

  // BIM Import (P2P5)
  bimImportDuration: new Histogram({
    name: 'bim_import_duration_ms',
    help: 'Duration of BIM import',
    labelNames: ['source', 'itemCount']
  }),
  bimImportConflicts: new Counter({
    name: 'bim_import_conflicts_total',
    help: 'Total BIM import conflicts',
    labelNames: ['source', 'conflictType']
  }),

  // Storage (P2P9)
  storageCalculationDuration: new Histogram({
    name: 'storage_calculation_duration_ms',
    help: 'Duration of storage calculation',
    labelNames: ['projectId']
  }),
  archivalJobDuration: new Histogram({
    name: 'archival_job_duration_ms',
    help: 'Duration of archival jobs',
    labelNames: ['projectId', 'sizeGB']
  }),

  // Audit Chain (P2P8)
  auditChainVerificationDuration: new Histogram({
    name: 'audit_chain_verification_duration_ms',
    help: 'Duration of audit chain verification',
    labelNames: ['companyId', 'entryCount']
  }),

  // Reviews (P2P10)
  reviewConsolidationDuration: new Histogram({
    name: 'review_consolidation_duration_ms',
    help: 'Duration of discipline review consolidation',
    labelNames: ['discipline', 'reviewCount']
  })
}
```

---

### 8.2 Alert Thresholds

Set up alerts for performance degradation:

```yaml
# prometheus-alerts.yml

groups:
  - name: phase2_performance
    rules:
      # Equipment tree queries
      - alert: SlowEquipmentTreeQuery
        expr: histogram_quantile(0.95, equipment_tree_query_duration_ms) > 2000
        annotations:
          summary: "Equipment tree queries are slow (>2s at p95)"

      # BIM import
      - alert: SlowBIMImport
        expr: histogram_quantile(0.95, bim_import_duration_ms) > 300000
        annotations:
          summary: "BIM imports are taking >5 minutes at p95"

      # Storage calculation
      - alert: SlowStorageCalculation
        expr: histogram_quantile(0.95, storage_calculation_duration_ms) > 5000
        annotations:
          summary: "Storage calculation is slow (>5s at p95)"

      # Audit chain verification
      - alert: SlowAuditVerification
        expr: histogram_quantile(0.95, audit_chain_verification_duration_ms) > 10000
        annotations:
          summary: "Audit chain verification is slow (>10s at p95)"
```

---

## 9. Conclusion

Phase 2 implementation introduces significant complexity with equipment hierarchies, BIM integration, multi-round reviews, and audit chains. Following these performance recommendations will ensure:

**Database Efficiency:**
- 50-70% reduction in query time with proper indexes
- 80-90% cache hit rate for frequently accessed data
- Support for 100,000+ records per table

**API Performance:**
- <100ms response time for list endpoints with pagination
- <500ms for complex hierarchy queries
- <2s for batch operations

**Background Job Throughput:**
- BIM imports: 1000 items per minute
- Watermarking: 100 PDFs per hour
- Archival: 10 projects per hour
- Package generation: 20 packages per day

**Memory Safety:**
- No OOM crashes with 200MB files
- Constant memory usage for batch operations
- Streaming for files >100MB

**Key Principles:**
1. **Always paginate** list endpoints
2. **Always rate limit** mutation endpoints
3. **Always use batch operations** for bulk creates
4. **Always add proper indexes** before deployment
5. **Always use transactions** for multi-step operations
6. **Always implement caching** for expensive queries
7. **Always stream** large files
8. **Always add progress tracking** for long jobs

Implementing these recommendations will prevent performance bottlenecks and ensure DocuRoute scales effectively through Phase 2 and beyond.

---

**Document Status:** FINAL
**Review Status:** Ready for Phase 2 Planning
**Next Action:** Incorporate recommendations into P2P* implementation plans
