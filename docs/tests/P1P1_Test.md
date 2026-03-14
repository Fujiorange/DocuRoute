# P1/P1 Phase 1 Database Schema Test Guide

This document provides step-by-step verification for the Phase 1 database schema implementation.

## Overview

This phase implements:
- Extended Company model with feature flags and security settings
- Extended DocumentRevision model with discipline and issuePurpose fields
- New Document model with full industry field support
- New CompanyOnboarding model for onboarding step tracking
- New Notification model for user notifications
- Complete Prisma migration with all indexes and foreign keys
- Post-migration SQL commands for GIN indexes and triggers

## Prerequisites

- Repository cloned locally
- Node.js 18+ installed
- pnpm installed
- PostgreSQL/Supabase connection available (for migration execution)
- Completed P0 prompts (base schema in place)

## Test Procedure

### 1. Verify Prisma Schema File

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma | grep -A5 "model Company"
```

**Expected Results:**
- Company model includes `bulkOperationUndoWindowMinutes Int @default(30)`
- Company model includes `features Json?` with inline comments
- Company model includes `securitySettings Json?` with inline comments
- Company model has relations to: roles, users, projects, documents, documentRevisions, onboarding, notifications

**Verification:**
```bash
# Verify Company has the new fields
grep "bulkOperationUndoWindowMinutes" packages/db/prisma/schema.prisma
grep "features" packages/db/prisma/schema.prisma
grep "securitySettings" packages/db/prisma/schema.prisma
```

**Status:** ☐ Pass ☐ Fail

---

### 2. Verify Document Model

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma | grep -A30 "model Document"
```

**Expected Results:**
- Document model exists with all fields:
  - `id`, `companyId`, `projectId?`, `filename`, `fileKey`, `fileSize`, `mimeType`, `sha256Hash`, `uploadedBy`
  - `discipline String?` (EngineeringDiscipline enum value)
  - `issuePurpose String?` (IssuePurpose enum value)
  - `status String @default("PENDING")` (DocumentStatus enum value)
  - `virusScanStatus String @default("PENDING")`
  - `virusScanCompletedAt DateTime?`
  - `watermarkStatus String @default("PENDING")`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- Relations to Company and Project
- Three indexes: [companyId, status], [companyId, createdAt], [companyId, projectId]

**Verification:**
```bash
# Count Document model indexes
grep -A30 "model Document" packages/db/prisma/schema.prisma | grep "@@index" | wc -l
# Expected: 3
```

**Status:** ☐ Pass ☐ Fail

---

### 3. Verify DocumentRevision Model Extended Fields

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma | grep -A20 "model DocumentRevision"
```

**Expected Results:**
- DocumentRevision model includes `discipline String?` field
- DocumentRevision model includes `issuePurpose String?` field
- Both fields have inline comments indicating they are enum values
- Relation to Company exists

**Verification:**
```bash
# Verify DocumentRevision has both new fields
grep -A20 "model DocumentRevision" packages/db/prisma/schema.prisma | grep "discipline"
grep -A20 "model DocumentRevision" packages/db/prisma/schema.prisma | grep "issuePurpose"
```

**Status:** ☐ Pass ☐ Fail

---

### 4. Verify CompanyOnboarding Model

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma | grep -A15 "model CompanyOnboarding"
```

**Expected Results:**
- CompanyOnboarding model exists with fields:
  - `id String @id @default(cuid())`
  - `companyId String @unique`
  - `completedSteps String[] @default([])`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- Inline comment listing valid step values
- Foreign key relation to Company

**Verification:**
```bash
# Verify companyId is unique
grep -A10 "model CompanyOnboarding" packages/db/prisma/schema.prisma | grep "@unique"
```

**Status:** ☐ Pass ☐ Fail

---

### 5. Verify Notification Model

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma | grep -A15 "model Notification"
```

**Expected Results:**
- Notification model exists with fields:
  - `id`, `companyId`, `userId`, `type`, `title`, `message`
  - `isRead Boolean @default(false)`
  - `metadata Json?`
  - `createdAt DateTime @default(now())`
- Two indexes: [userId, isRead], [companyId, createdAt]
- Relation to Company

**Verification:**
```bash
# Count Notification model indexes
grep -A15 "model Notification" packages/db/prisma/schema.prisma | grep "@@index" | wc -l
# Expected: 2
```

**Status:** ☐ Pass ☐ Fail

---

### 6. Verify Prisma Schema Format and Validation

**Test Steps:**
```bash
cd packages/db
pnpm prisma format
```

**Expected Results:**
- Command executes successfully
- Output: "Formatted prisma/schema.prisma in XXms 🚀"
- No validation errors

**Status:** ☐ Pass ☐ Fail

---

### 7. Verify Migration File Created

**Test Steps:**
```bash
ls -la packages/db/prisma/migrations/20260314_phase-1-schema/
cat packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql | head -10
```

**Expected Results:**
- Directory `20260314_phase-1-schema` exists
- File `migration.sql` exists and is ~280+ lines
- First 3 lines contain CRITICAL comment about transaction rules
- Migration includes CREATE TABLE statements for all models

**Verification:**
```bash
# Count CREATE TABLE statements
grep "CREATE TABLE" packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql | wc -l
# Expected: 10 (Role, Company, User, Project, Document, DocumentRevision, AuditLog, AuditVaultEntry, Invitation, TransmittalCounter, CompanyOnboarding, Notification = 12 tables)
```

**Status:** ☐ Pass ☐ Fail

---

### 8. Verify Migration SQL Contains New Fields

**Test Steps:**
```bash
grep -i "bulkOperationUndoWindowMinutes" packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql
grep -i "features" packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql
grep -i "discipline" packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql
```

**Expected Results:**
- `bulkOperationUndoWindowMinutes INTEGER NOT NULL DEFAULT 30` in Company table
- `features JSONB` in Company table
- `discipline TEXT` in both Document and DocumentRevision tables

**Status:** ☐ Pass ☐ Fail

---

### 9. Verify Migration SQL Contains All Indexes

**Test Steps:**
```bash
grep "CREATE INDEX" packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql | wc -l
```

**Expected Results:**
- Multiple CREATE INDEX statements (at least 15)
- Includes indexes for:
  - Role: companyId_isSystemRole
  - User: companyId_roleId, companyId_isActive
  - Document: companyId_status, companyId_createdAt, companyId_projectId
  - DocumentRevision: documentId_status, companyId
  - Notification: userId_isRead, companyId_createdAt

**Status:** ☐ Pass ☐ Fail

---

### 10. Verify Migration SQL Contains Foreign Keys

**Test Steps:**
```bash
grep "AddForeignKey" packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql | wc -l
```

**Expected Results:**
- Multiple AddForeignKey statements (at least 9)
- Includes foreign keys for:
  - Role → Company
  - User → Company, User → Role
  - Project → Company
  - Document → Company, Document → Project
  - DocumentRevision → Company
  - CompanyOnboarding → Company
  - Notification → Company

**Status:** ☐ Pass ☐ Fail

---

### 11. Verify DEPLOYMENT_CHECKLIST.md

**Test Steps:**
```bash
cat docs/DEPLOYMENT_CHECKLIST.md
```

**Expected Results:**
- File exists with Phase 1 section
- Contains post-migration SQL commands:
  1. GIN index for Role permissions
  2. Audit vault immutability trigger
  3. pg_trgm extension
- Each SQL block includes verification queries
- Contains CRITICAL TRANSACTION RULE at the bottom
- Includes verification checklist

**Verification:**
```bash
# Verify all required sections exist
grep "GIN index" docs/DEPLOYMENT_CHECKLIST.md
grep "Audit Vault Immutability" docs/DEPLOYMENT_CHECKLIST.md
grep "pg_trgm" docs/DEPLOYMENT_CHECKLIST.md
grep "CRITICAL TRANSACTION RULE" docs/DEPLOYMENT_CHECKLIST.md
```

**Status:** ☐ Pass ☐ Fail

---

### 12. Verify Transaction Rule Comment in Migration

**Test Steps:**
```bash
head -5 packages/db/prisma/migrations/20260314_phase-1-schema/migration.sql
```

**Expected Results:**
- First 3 lines contain comment about transaction rules
- Comment mentions "CRITICAL: Prisma interactive transactions"
- Comment mentions "companyId extension from getPrismaForCompany()"
- Comment instructs to always pass companyId explicitly

**Status:** ☐ Pass ☐ Fail

---

## Optional: Database Migration Execution Test

**⚠️ WARNING:** Only perform this test if you have a test PostgreSQL database available. Do NOT run on production.

### 13. Execute Migration (Optional)

**Prerequisites:**
- Test PostgreSQL database available
- DATABASE_URL and DIRECT_URL environment variables set

**Test Steps:**
```bash
cd packages/db
pnpm prisma migrate deploy
```

**Expected Results:**
- Migration executes successfully
- All tables created
- All indexes created
- All foreign keys created

**Post-Migration SQL Execution:**
```sql
-- Run in Supabase SQL Editor or psql

-- 1. Create GIN index
CREATE INDEX IF NOT EXISTS idx_role_permissions ON "Role" USING GIN (permissions);

-- 2. Create audit vault trigger
CREATE OR REPLACE FUNCTION prevent_audit_vault_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditVaultEntry is INSERT ONLY. Tampering detected.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_vault_immutable
BEFORE UPDATE OR DELETE ON "AuditVaultEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_vault_mutation();

-- 3. Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Verification Queries:**
```sql
-- Verify GIN index
SELECT indexname FROM pg_indexes WHERE tablename = 'Role' AND indexname = 'idx_role_permissions';

-- Verify trigger
SELECT tgname FROM pg_trigger WHERE tgrelid = '"AuditVaultEntry"'::regclass;

-- Verify extension
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
```

**Status:** ☐ Pass ☐ Fail ☐ Skipped

---

## Summary

After completing all tests, the following should be verified:

- ✅ Company model extended with 3 new fields
- ✅ DocumentRevision model extended with 2 new fields
- ✅ Document model created with full schema
- ✅ CompanyOnboarding model created
- ✅ Notification model created
- ✅ All relations properly defined
- ✅ All indexes properly defined
- ✅ Migration SQL file generated
- ✅ DEPLOYMENT_CHECKLIST.md documented
- ✅ Transaction rules documented

## Troubleshooting

### Error: "Can't reach database server"
- This is expected if you don't have a database running
- The schema validation and migration file generation don't require a database
- Only the actual migration execution (Step 13) requires a database

### Error: "Validation error in schema"
- Check that all model field types are correct
- Ensure all relations have matching foreign keys
- Run `pnpm prisma format` to auto-fix formatting issues

### Error: "Migration already exists"
- This is expected if you've already generated the migration
- Delete the migration folder if you need to regenerate
- Ensure the schema changes are what you expect before regenerating

## Next Steps

After verification:
1. Generate Prisma client: `pnpm prisma generate`
2. Review docs/summaries/P1P1_Summary.md for implementation details
3. Proceed with implementing API routes that use these models
