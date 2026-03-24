# DocuRoute Repository Export - Navigation Index

**Export File:** `docs/FULL_REPO_EXPORT.txt`
**Generated:** 2026-03-24
**Size:** 599 KB (~17,428 lines)

This index helps you navigate the comprehensive repository export created for AI review.

---

## 📋 What's Included

The export contains the **complete DocuRoute codebase** organized into 11 sections:

### Section 1: Project Overview & Documentation
- README.md
- LAUNCH_GUIDE.md
- SYSTEM_ARCHITECTURE.md
- DEPLOYMENT_CHECKLIST.md
- ARCHITECTURE_FIXES_SUMMARY.md
- PDF_PROCESSING_ARCHITECTURE.md
- DEPLOYMENT_PERFORMANCE_CHECKLIST.md

### Section 2: Database Schema & Migrations
- Prisma schema definition
- All migration files
- Database client and multi-tenant setup
- RLS (Row Level Security) migration

### Section 3: Type Definitions (packages/types)
- Permission enums (41+ permissions)
- System role definitions
- All TypeScript type definitions
- Shared types across monorepo

### Section 4: Core Business Logic (packages/core)
- Audit logging
- Audit vault (immutable compliance log)
- Permission caching (Redis)
- Rate limiting
- QR verification
- Watermark processing
- R2 (storage) integration
- Notification system
- Error handling

### Section 5: API Routes (apps/web/src/app/api)
**Authentication:**
- NextAuth configuration
- Magic link authentication

**User Management:**
- User CRUD operations
- User invitation flow
- Role assignment

**Role Management:**
- Custom role CRUD
- Permission management

**Document Management:**
- Document upload (presign/confirm)
- Document verification (QR)
- Document search
- MDR import
- Bulk operations

**Notifications:**
- Notification list
- Mark as read

**Compliance:**
- Audit vault export
- Legal holds
- Retention policies
- Compliance reports

**Billing:**
- Stripe integration
- Checkout & portal

**Admin:**
- Queue status
- SCIM provisioning

**Cron Jobs:**
- Retention execution
- Key rotation
- Watermark cleanup
- Workflow timeouts
- Vault integrity checks

### Section 6: Authentication & Middleware
- Next.js middleware (route protection)
- Authentication helpers
- Permission checking utilities
- NextAuth type definitions

### Section 7: Worker Services (apps/worker)
- BullMQ worker setup
- Watermark worker
- SCIM worker
- PDF processing child script

### Section 8: Configuration Files
- Root package.json
- Turborepo config
- PNPM workspace config
- Next.js config
- TypeScript configs
- Package manifests for all workspaces

### Section 9: Key UI Components
- Role management UI
- Permission checkbox grid
- Global search bar
- Custom hooks (permissions, notifications)

### Section 10: Validation Schemas
- Zod schemas for all API inputs
- Type-safe validation

### Section 11: Phase Summaries & Planning
- Phase 0 implementation summaries
- Phase 1 implementation summaries
- Phase 2 planning documents
- Test documentation

---

## 🎯 Key Areas to Review

### For Security Review:
1. **Multi-tenancy isolation:**
   - Section 2: RLS migration (`packages/db/prisma/migrations/20260323_rls_multi_tenancy/migration.sql`)
   - Section 2: `packages/db/src/index.ts` (getPrismaForCompany with RLS)
   - Section 1: `ARCHITECTURE_FIXES_SUMMARY.md`

2. **Permission system:**
   - Section 3: Permission enum definitions
   - Section 4: `packages/core/src/permission-cache.ts`
   - Section 6: `apps/web/src/middleware.ts` (permission resolution)
   - Section 6: `apps/web/src/lib/auth.ts` (requireLivePermission)

3. **Authentication:**
   - Section 5: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
   - Section 6: `apps/web/src/middleware.ts`

4. **Audit & Compliance:**
   - Section 4: `packages/core/src/audit.ts`
   - Section 4: `packages/core/src/audit-vault.ts`
   - Section 2: Audit vault immutability trigger

### For Architecture Review:
1. **Database schema:**
   - Section 2: `packages/db/prisma/schema.prisma`
   - Section 1: `SYSTEM_ARCHITECTURE.md`

2. **Multi-tenant patterns:**
   - Section 2: `packages/db/src/index.ts`
   - Section 1: `DEPLOYMENT_CHECKLIST.md` (RLS setup)

3. **API patterns:**
   - Section 5: All API route files
   - Section 6: `apps/web/src/lib/auth.ts` (withApiHandler)

4. **Worker architecture:**
   - Section 7: Worker setup and job processing
   - Section 4: `packages/core/src/watermark.ts`

### For Performance Review:
1. **PDF processing bottleneck:**
   - Section 1: `PDF_PROCESSING_ARCHITECTURE.md`
   - Section 4: `packages/core/src/watermark.ts`
   - Section 7: Watermark worker

2. **JWT optimization:**
   - Section 1: `ARCHITECTURE_FIXES_SUMMARY.md`
   - Section 4: `packages/core/src/permission-cache.ts`
   - Section 6: `apps/web/src/middleware.ts`

3. **Database performance:**
   - Section 2: Schema indexes
   - Section 1: `DEPLOYMENT_PERFORMANCE_CHECKLIST.md`

### For Code Quality Review:
1. **Type safety:**
   - Section 3: All type definitions
   - Section 10: Zod validation schemas

2. **Error handling:**
   - Section 4: `packages/core/src/errors.ts`
   - Section 6: `apps/web/src/lib/auth.ts` (withApiHandler)

3. **Code organization:**
   - Monorepo structure (packages separation)
   - Clear separation of concerns

---

## 🔍 Quick Search Tips

When reviewing the `FULL_REPO_EXPORT.txt` file:

### Finding Specific Sections:
Search for section headers like:
- `SECTION 1: PROJECT OVERVIEW`
- `SECTION 5: API ROUTES`
- `SECTION 7: WORKER SERVICES`

### Finding Specific Files:
Each file starts with:
```
────────────────────────────────────────────────────────────────────────────
FILE: path/to/file.ts
────────────────────────────────────────────────────────────────────────────
```

Search for `FILE: path/to/file` to jump to any specific file.

### Finding Key Concepts:
- **RLS (Row Level Security):** Search for "RLS" or "Row Level Security"
- **Permissions:** Search for "Permission" or "requirePermission"
- **Multi-tenancy:** Search for "companyId" or "multi-tenant"
- **Audit:** Search for "AuditLog" or "AuditVault"
- **Watermark:** Search for "watermark" or "pdf-lib"

---

## 📊 Repository Statistics

- **Total Files Exported:** ~150+ files
- **Lines of Code:** ~17,428 lines (including documentation)
- **Languages:** TypeScript, JavaScript, SQL, Markdown
- **Packages:** 6 (web, worker, core, db, types, emails)
- **API Routes:** 50+ endpoints
- **Database Models:** 11 models
- **Permissions:** 41 distinct permissions
- **System Roles:** 6 roles

---

## 🚀 Recent Architecture Changes (2026-03-23)

These critical fixes are documented in the export:

1. **PostgreSQL RLS Migration** (CRITICAL)
   - Fixes multi-tenancy flaw where Prisma extensions don't work in transactions
   - Database-level tenant isolation via Row Level Security
   - Fail-safe: Missing companyId returns NO data (not another tenant's data)

2. **JWT Permission Caching** (MEDIUM)
   - Reduces JWT size from ~1,440 bytes to ~400 bytes (3.6x smaller)
   - Permissions cached in Redis with version-based invalidation
   - Enables immediate permission revocation

3. **PDF Processing Documentation** (HIGH)
   - Documented migration plan from Node.js to Go microservice
   - Addresses OOM issues with large CAD drawings (180MB+)
   - Detailed cost analysis and implementation timeline

---

## 📝 Notes for AI Reviewers

### What This Codebase Does:
DocuRoute is a **document management SaaS** for regulated heavy industries (maritime, shipyards, heavy construction). It handles:
- ISO 9001 compliant document control
- Multi-tenant SaaS architecture
- Role-based permissions (41 distinct permissions)
- Document watermarking with QR codes
- Immutable audit trails
- Email magic link authentication
- PDF processing in background workers
- Full-text search with PostgreSQL

### Architecture Highlights:
- **Monorepo:** Turborepo + PNPM workspaces
- **Database:** PostgreSQL (Supabase) with Row Level Security for multi-tenancy
- **Auth:** NextAuth v4 with JWT + Redis permission caching
- **Storage:** Cloudflare R2 (S3-compatible)
- **Workers:** BullMQ with Redis for background jobs
- **Framework-agnostic core:** `packages/core` has zero Next.js dependencies

### Key Design Decisions:
- **Hybrid PBAC+RBAC:** Permission-based access control with system roles
- **Immutable audit vault:** Database trigger prevents UPDATE/DELETE on audit logs
- **Database-level multi-tenancy:** RLS policies enforce tenant isolation
- **Version-based caching:** Permission cache uses version numbers for invalidation
- **Defense in depth:** Both application and database level security

### Known Limitations (Phase 1):
- PDF watermarking limited to 200MB files (migration to Go planned)
- No real-time notifications yet (polling every 30s)
- No equipment hierarchy (Phase 2 feature)
- No offline P2P sync yet (Phase 2 feature)

---

## 📧 Questions?

If you have questions while reviewing, key documentation files in the export:
- `ARCHITECTURE_FIXES_SUMMARY.md` - Recent critical fixes
- `SYSTEM_ARCHITECTURE.md` - Overall system design
- `DEPLOYMENT_CHECKLIST.md` - Production setup steps
- `PDF_PROCESSING_ARCHITECTURE.md` - PDF handling details

---

**Last Updated:** 2026-03-24
**Export Version:** 1.0
