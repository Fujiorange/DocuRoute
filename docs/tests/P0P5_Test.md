# P0/P5 Core Infrastructure Test Guide

This document provides step-by-step verification for all core infrastructure files generated in Prompt #5.

## Overview

This phase implements:
- Complete type system with Permission enum (47 permissions)
- Database schema with Role-based access control
- Multi-tenancy database client with enterprise isolation
- Core business logic modules (errors, utils, audit, watermark, QR)
- Worker processes for background jobs
- Authentication and authorization framework
- PWA offline support with Dexie

## Prerequisites

- Repository cloned locally
- Node.js 18+ installed
- pnpm installed
- PostgreSQL/Supabase connection available (for Prisma generation)

## Test Procedure

### 1. Verify packages/types/src/index.ts

**Test Steps:**
```bash
cat packages/types/src/index.ts | head -100
```

**Expected Results:**
- Permission enum with 47 values (UPLOAD_DOCUMENT, VIEW_DOCUMENT, etc.)
- SYSTEM_ROLE_PERMISSIONS constant with 6 role mappings
- SYSTEM_ROLE_KEYS array with 6 system roles
- All industry enums (EngineeringDiscipline, IssuePurpose, DocumentStatus, etc.)
- STANDARD_WORKFLOW_TEMPLATES with 3 templates
- PLAN_LIMITS with 8 tier definitions

**Verification:**
```bash
# Count Permission enum values
grep "^  [A-Z_]*.*=" packages/types/src/index.ts | wc -l
# Expected: 47
```

**Status:** ☐ Pass ☐ Fail

---

### 2. Verify packages/db/prisma/schema.prisma

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma
```

**Expected Results:**
- datasource db with directUrl field
- Role model with isSystemRole and systemRoleKey fields
- Company model with slug, planTier, transmittalTemplate
- User model with roleId FK to Role (not systemRole enum)
- Project model (minimal)
- DocumentRevision model with watermarkStatus
- AuditLog model
- AuditVaultEntry model with hash field and immutability comment
- Invitation model with roleId FK
- TransmittalCounter model

**Verification:**
```bash
# Count models
grep "^model " packages/db/prisma/schema.prisma | wc -l
# Expected: 9
```

**Status:** ☐ Pass ☐ Fail

---

### 3. Verify Database Client Files

**Test Steps:**
```bash
cat packages/db/src/client.ts
cat packages/db/src/index.ts
```

**Expected Results:**

**client.ts:**
- prismaAdmin singleton with globalThis caching
- Comment explaining usage restrictions

**index.ts:**
- getPrismaForCompany function
- tenantClientCache and extendedClientCache Maps
- Enterprise DB isolation check (TENANT_DB_URL_${companyId})
- Prisma Client Extension with companyId injection
- Critical comment about transaction rule

**Status:** ☐ Pass ☐ Fail

---

### 4. Verify packages/core/src/errors.ts

**Test Steps:**
```bash
cat packages/core/src/errors.ts
```

**Expected Results:**
- DocuRouteError class with code, message, statusCode, category, metadata
- ErrorCategory type: 'SYSTEM_ERROR' | 'COMPLIANCE_VIOLATION'
- Factory functions: notFound, forbidden, unauthorized, validationError, legalHoldActive, transmittalLinked, seatLimitReached, rateLimitExceeded, undoWindowExpired, complianceViolation

**Verification:**
```bash
# Count factory functions
grep "^export function" packages/core/src/errors.ts | wc -l
# Expected: 10
```

**Status:** ☐ Pass ☐ Fail

---

### 5. Verify packages/core/src/utils.ts

**Test Steps:**
```bash
cat packages/core/src/utils.ts
```

**Expected Results:**
- cn() function (Tailwind class merge)
- formatDate(), generateSlug(), hashSHA256()
- truncate(), isValidEmail(), formatBytes()
- getParserConfidenceLevel()
- **isDocumentSafeForConstruction()** - critical safety function

**Verification:**
```bash
# Verify isDocumentSafeForConstruction exists
grep "isDocumentSafeForConstruction" packages/core/src/utils.ts
```

**Status:** ☐ Pass ☐ Fail

---

### 6. Verify Audit Modules

**Test Steps:**
```bash
cat packages/core/src/audit.ts
cat packages/core/src/audit-vault.ts
```

**Expected Results:**

**audit.ts:**
- logAuditEvent function with AuditLog insertion
- Uses prismaAdmin with comment explaining why
- Never throws

**audit-vault.ts:**
- writeVaultEntry function with hash computation
- verifyVaultIntegrity function
- Critical hash computation comment
- Uses prismaAdmin

**Status:** ☐ Pass ☐ Fail

---

### 7. Verify QR and Watermark Modules

**Test Steps:**
```bash
cat packages/core/src/qr-verification.ts
cat packages/core/src/watermark.ts
```

**Expected Results:**

**qr-verification.ts:**
- generateVerificationQRCode() - returns base64 PNG
- buildVerificationStatus() - constructs QRVerificationStatus
- Calls isDocumentSafeForConstruction()

**watermark.ts:**
- POOL_SIZE = 2, MAX_WORKER_MEMORY_MB = 512
- MAX_WATERMARK_SIZE_BYTES = 200MB
- watermarkInChildProcess() function
- getCachedWatermark() and saveCachedWatermark() stubs
- terminatePool() for graceful shutdown

**Status:** ☐ Pass ☐ Fail

---

### 8. Verify Worker Files

**Test Steps:**
```bash
cat apps/worker/src/scripts/watermark-child.js
cat apps/worker/src/workers/watermark.worker.ts
cat apps/worker/src/workers/scim.worker.ts
cat apps/worker/src/index.ts
```

**Expected Results:**

**watermark-child.js:**
- CommonJS module with module.exports
- generateQRCodeInline() function
- watermarkPDF() function using pdf-lib
- Handles encrypted PDFs gracefully
- Returns { success, buffer } or { success: false, reason }

**watermark.worker.ts:**
- BullMQ Worker with 'watermark' queue
- Concurrency: 2
- Rate limit: 10 jobs / 60s
- 3 retries with exponential backoff
- Updates watermarkStatus in DB

**scim.worker.ts:**
- createSCIMWorker() function
- Per-user queue: scim-user-{userId}
- Concurrency: 1
- Handles CREATE, UPDATE, DELETE operations

**index.ts:**
- Starts watermark worker
- Health endpoint on port 3001
- Global crash handlers
- SIGTERM graceful shutdown
- Calls terminatePool()

**Status:** ☐ Pass ☐ Fail

---

### 9. Verify Web Lib Files

**Test Steps:**
```bash
cat apps/web/src/lib/auth.ts
cat apps/web/src/lib/offline-db.ts
```

**Expected Results:**

**auth.ts:**
- ResolvedUser type
- resolvePermissions() - uses prismaAdmin with comment
- requirePermission() - OR logic
- requirePermissions() - AND logic
- requireLivePermission() - fetches live user, logs PERMISSION_DENIED
- withApiHandler() - catches DocuRouteError, writes vault on COMPLIANCE_VIOLATION

**offline-db.ts:**
- OfflineDocumentMeta and OfflineAction interfaces
- DocuRouteOfflineDB class extends Dexie
- offlineDB export with SSR guard (typeof window !== 'undefined')
- Version 1 with documents and actions tables

**Status:** ☐ Pass ☐ Fail

---

### 10. Verify Offline Banner Component

**Test Steps:**
```bash
cat apps/web/src/components/offline/offline-banner.tsx
```

**Expected Results:**
- 'use client' directive
- ConnectionStatus type
- Listens to window online/offline events
- Pings /api/health every 30s
- Shows amber banner when offline
- Dismissible per session
- Shows sync queue size (TODO)

**Status:** ☐ Pass ☐ Fail

---

## Integration Tests

### 11. TypeScript Compilation Test

**Test Steps:**
```bash
cd /home/runner/work/DocuRoute/DocuRoute
pnpm install
pnpm --filter @docuroute/types build
pnpm --filter @docuroute/db build
pnpm --filter @docuroute/core build
pnpm --filter @docuroute/worker build
```

**Expected Results:**
- All packages compile without errors
- Type definitions generated

**Status:** ☐ Pass ☐ Fail

---

### 12. Prisma Client Generation Test

**Test Steps:**
```bash
cd packages/db
npx prisma generate
```

**Expected Results:**
- Prisma client generates successfully
- No schema validation errors

**Status:** ☐ Pass ☐ Fail

---

### 13. Worker Build Test

**Test Steps:**
```bash
cd apps/worker
pnpm build
ls -la dist/
```

**Expected Results:**
- dist/ directory created
- index.js, workers/, scripts/ compiled
- watermark-child.js copied as-is (CommonJS)

**Status:** ☐ Pass ☐ Fail

---

### 14. Web App TypeCheck Test

**Test Steps:**
```bash
cd apps/web
pnpm exec tsc --noEmit
```

**Expected Results:**
- No type errors
- Package aliases resolve correctly (@docuroute/*)

**Status:** ☐ Pass ☐ Fail

---

## Critical Verification Checklist

### Authorization Model

- [ ] Permission enum has exactly 47 values
- [ ] SYSTEM_ROLE_PERMISSIONS has 6 role mappings
- [ ] PLATFORM_ADMIN and COMPANY_OWNER include correct permissions
- [ ] BYPASS_LEGAL_HOLD only in COMPANY_OWNER
- [ ] PLATFORM_ADMIN_ACCESS only in PLATFORM_ADMIN

### Database Schema

- [ ] Role model uses isSystemRole + systemRoleKey (not enum)
- [ ] User has roleId FK to Role
- [ ] AuditVaultEntry has hash field
- [ ] AuditVaultEntry has immutability trigger SQL in comments
- [ ] All models have companyId except TransmittalCounter

### Multi-Tenancy

- [ ] getPrismaForCompany checks TENANT_DB_URL_${companyId}
- [ ] Extended client is cached (not created on every call)
- [ ] Transaction rule documented in getPrismaForCompany

### Worker Infrastructure

- [ ] Watermark pool size = 2, memory = 512MB
- [ ] MAX_WATERMARK_SIZE_BYTES = 200MB
- [ ] watermark-child.js is CommonJS (module.exports)
- [ ] Worker has health endpoint on port 3001
- [ ] Worker terminates pool on SIGTERM

### Authorization

- [ ] requireLivePermission uses prismaAdmin (with comment)
- [ ] resolvePermissions uses prismaAdmin (with comment)
- [ ] withApiHandler writes vault on COMPLIANCE_VIOLATION
- [ ] Permission checks use Permission enum (never role names)

### PWA Offline

- [ ] offlineDB has SSR guard (typeof window !== 'undefined')
- [ ] Offline banner pings /api/health every 30s
- [ ] Offline banner shows sync queue size

---

## Summary

**Total Tests:** 14
**Passed:** ___
**Failed:** ___

**Critical Failures:** (list any blocking issues)

**Notes:**

---

## Sign-off

**Tested By:** _______________
**Date:** _______________
**Status:** ☐ Approved ☐ Needs Revision
