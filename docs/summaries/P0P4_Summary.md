# P0/P4 Configuration Files Summary

## What Was Done

This document summarizes the complete configuration file creation for the DocuRoute project in the P0/P4 phase. All 14 configuration files have been generated according to the specifications, establishing the foundation for development, testing, deployment, and production operations.

## Overview

The P0/P4 phase focused on creating production-ready configuration files across all layers of the application:
- Frontend configuration (Next.js, TypeScript, testing, formatting)
- Worker configuration (TypeScript, environment variables)
- Database configuration (Prisma with Supabase)
- Deployment configuration (Vercel for web, Render for worker)
- Migration scripts

## Configuration Files Created/Modified

### 1. apps/web/tsconfig.json (Modified)

**Purpose:** TypeScript configuration for the Next.js web application.

**Key Features:**
- `strict: true` for maximum type safety
- Path aliases for monorepo packages:
  - `@/*` → `./src/*` (app-internal imports)
  - `@docuroute/core` → `../../packages/core/src/index.ts`
  - `@docuroute/db` → `../../packages/db/src/index.ts`
  - `@docuroute/types` → `../../packages/types/src/index.ts`
  - `@docuroute/emails` → `../../packages/emails/src/index.ts`

**Rationale:** Enables clean imports across the monorepo without relative path hell. All shared packages accessible via `@docuroute/*` namespace.

---

### 2. apps/web/next.config.js (Created)

**Purpose:** Next.js configuration with PWA support and production optimizations.

**Key Features:**

#### PWA Configuration (@ducanh2912/next-pwa)
- `dest: 'public'` — Service worker output directory
- `disable: process.env.NODE_ENV === 'development'` — Only active in production
- `maximumFileSizeToCacheInBytes: 50 * 1024 * 1024` (50MB)
  - **CRITICAL:** Default Workbox limit is 2MB
  - Engineering drawings are 5–50MB
  - Without this override, offline mode fails in the field (ships, remote sites)

#### Runtime Caching Strategy
1. **Static Assets (CacheFirst)**
   - Pattern: `https://.*\.(js|css|woff2|woff|ttf)`
   - Cache name: `docuroute-static-v1`
   - Expiration: 100 entries, 7 days
   - Rationale: Fonts and compiled assets never change after deployment

2. **API Routes (NetworkFirst)**
   - Pattern: `/api/*` with exclusions
   - **NEVER cache:** `/api/upload/`, `/api/transmittals/`
   - Cache name: `docuroute-api-v1`
   - Network timeout: 10s
   - Expiration: 200 entries, 5 minutes
   - Rationale: Document uploads and transmittal sends must always hit server

3. **Dashboard Pages (StaleWhileRevalidate)**
   - Pattern: `/dashboard/`
   - Cache name: `docuroute-pages-v1`
   - Rationale: Instant navigation with background refresh

#### Other Settings
- `transpilePackages`: All @docuroute packages (required for monorepo)
- `images.remotePatterns`: Cloudflare R2 public URL support
- `reactStrictMode: true` — Detect side effects
- `typescript.ignoreBuildErrors: false` — Fail build on type errors
- `eslint.ignoreDuringBuilds: false` — Enforce code quality

**Migration Note:** Changed from `.ts` to `.js` to use CommonJS `require()` for @ducanh2912/next-pwa.

---

### 3. apps/web/tailwind.config.ts (Modified)

**Purpose:** Tailwind CSS configuration with shadcn/ui theme support.

**Changes:**
- Simplified `content` to `["./src/**/*.{js,ts,jsx,tsx,mdx}"]` (previously listed subdirectories explicitly)
- Preserved shadcn/ui CSS variable theme extensions
- Preserved `darkMode: ["class"]` for toggle support

**Rationale:** Single pattern covers all source files, reducing configuration maintenance.

---

### 4. apps/web/.env.example (Created)

**Purpose:** Environment variable template for web application.

**Sections:**

#### Database (Supabase)
- `DATABASE_URL` — PgBouncer pooled connection (port 6543)
- `DIRECT_URL` — Direct connection for migrations (port 5432)
- **Enterprise Multi-Tenancy:** `TENANT_DB_URL_[COMPANY_ID]` pattern documented
  - Optional, Pillar 3 feature
  - Enables physical DB isolation for enterprise clients
  - Unset = shared DB with companyId filter (default)

#### Authentication (NextAuth)
- `NEXTAUTH_SECRET` — Session encryption key
- `NEXTAUTH_URL` — Canonical application URL

#### Storage (Cloudflare R2)
- 5 variables: account ID, access keys, bucket name, public URL

#### Encryption (AWS KMS)
- 4 AWS credentials + region
- `LOCAL_KMS_MODE=false` — **Must** be false in production, true only for local dev

#### Email (Resend)
- API key and from address

#### Payments (Stripe)
- 4 variables: secret key, publishable key, webhook secret, public key

#### Rate Limiting (Upstash Redis)
- REST URL and token

#### Background Jobs (Redis)
- `REDIS_URL` — Shared with worker process

#### Security
- `CRON_SECRET` — Protects cron endpoints from unauthorized access
- `VIRUSTOTAL_API_KEY` — Virus scanning (required; skipping is pilot limitation only)
- `QR_VERIFICATION_BASE_URL` — Public URL for field QR verification (no auth)

#### Application
- `NEXT_PUBLIC_APP_URL` — Frontend URL
- `NEXT_PUBLIC_VERSION=0.1.0` — Display version

#### Administration
- `PLATFORM_ADMIN_EMAIL` — Superuser account

#### Pilot Setup
- `PILOT_OWNER_EMAIL`, `PILOT_PROJECT_NAME`, `PILOT_NAMING_MASK`

**Total:** 35+ environment variables documented

---

### 5. apps/web/vitest.config.ts (Created)

**Purpose:** Vitest unit test configuration.

**Key Features:**
- `environment: 'jsdom'` — DOM APIs for React component testing
- `setupFiles: ['./vitest.setup.ts']` — Test environment initialization
- Path aliases matching tsconfig.json (manual mapping required for Vite)

**Rationale:** Vitest doesn't read tsconfig paths automatically; aliases must be redeclared.

---

### 6. apps/web/vitest.setup.ts (Created)

**Purpose:** Test environment setup.

**Content:** Single line: `import '@testing-library/jest-dom'`

**Rationale:** Provides DOM matchers like `toBeInTheDocument()`, `toHaveClass()`, etc.

---

### 7. apps/web/playwright.config.ts (Created)

**Purpose:** Playwright end-to-end test configuration.

**Key Features:**
- `testDir: './__tests__/e2e'` — E2E test location
- Uses Chromium only (fast, sufficient for CI)
- `baseURL: 'http://localhost:3000'`
- `webServer` automatically starts dev server for tests
- `reuseExistingServer: !process.env.CI` — Faster local testing

**Rationale:** Full-stack tests validate API routes, authentication, and UI flows.

---

### 8. apps/web/.prettierrc (Created)

**Purpose:** Code formatting configuration.

**Settings:**
- `semi: false` — No semicolons
- `singleQuote: true` — Single quotes for strings
- `tabWidth: 2` — 2-space indentation
- `plugins: ["prettier-plugin-tailwindcss"]` — Auto-sort Tailwind classes

**Rationale:** Consistent code style across team, automatic Tailwind class ordering.

---

### 9. apps/worker/tsconfig.json (Modified)

**Purpose:** TypeScript configuration for BullMQ worker process.

**Key Features:**
- `strict: true` — Same type safety as web app
- `module: "commonjs"` — Node.js compatibility (not ESM)
- `outDir: "./dist"` — Compiled output
- Path aliases for all @docuroute packages (matching web)

**Rationale:** Worker imports same business logic packages as web app. CommonJS required for stable Node.js production runtime.

---

### 10. apps/worker/.env.example (Created)

**Purpose:** Environment variable template for worker process.

**Sections:**
- Database (DATABASE_URL, DIRECT_URL)
- Enterprise DB pattern documented (TENANT_DB_URL_*)
- Cloudflare R2 (5 variables)
- AWS KMS (4 variables + LOCAL_KMS_MODE)
- Resend email (2 variables)
- Redis (REDIS_URL for BullMQ)
- Security (CRON_SECRET, QR_VERIFICATION_BASE_URL)
- Admin (PLATFORM_ADMIN_EMAIL)
- **Important:** Comment noting NODE_OPTIONS set by render.yaml (don't override locally)

**Rationale:** Worker needs subset of web environment (no Stripe, no NextAuth, no Upstash).

---

### 11. packages/db/prisma/schema.prisma (Modified)

**Purpose:** Prisma ORM schema and database connection configuration.

**Changes:**
- Reordered: `datasource db` now appears **before** `generator client` (convention)
- Added `directUrl = env("DIRECT_URL")` to datasource
  - Used for migrations (bypasses PgBouncer transaction pooling)
  - Supabase requires this for `prisma migrate deploy`

**Existing Content Preserved:**
- Company, User, CustomRole, UserCustomRole models
- SystemRole enum
- All relationships and constraints

**Rationale:** Direct URL is mandatory for Supabase migrations. PgBouncer in transaction mode doesn't support migration DDL.

---

### 12. render.yaml (Created)

**Purpose:** Render.com deployment configuration for worker and cron jobs.

**Services:**

#### 1. docuroute-worker (type: worker)
- **Plan:** `standard` (2GB RAM)
  - **CRITICAL:** Custom roles create unpredictable load
  - A company can grant "Bulk Watermark" to any custom role
  - workerpool caps each PDF job at 512MB
  - Need overhead for pool manager, Redis connections, SCIM operations
- **Memory:** `NODE_OPTIONS: --max-old-space-size=1536` (75% of 2GB)
  - Leaves 512MB for OS + connection overhead
- **Build:** `pnpm install && pnpm --filter @docuroute/worker build`
- **Start:** `pnpm --filter @docuroute/worker start`
- **Health Check:** `/health` endpoint
- **Env Vars:** All worker environment variables with `sync: false`

#### 2. docuroute-retention-cron (type: cron)
- **Schedule:** `0 2 * * *` (daily at 2am UTC)
- **Plan:** `starter` (512MB RAM sufficient)
- **Command:** `node apps/worker/dist/crons/retention.js`
- **Memory:** `NODE_OPTIONS: --max-old-space-size=400`
- **Purpose:** Enforces document retention policies, deletes expired documents

#### 3. docuroute-vault-integrity-cron (type: cron)
- **Schedule:** `0 3 * * *` (daily at 3am UTC)
- **Plan:** `starter`
- **Command:** `node apps/worker/dist/crons/vault-integrity.js`
- **Memory:** `NODE_OPTIONS: --max-old-space-size=400`
- **Purpose:** Verifies audit vault immutability, detects tampering

**Rationale:**
- Worker process handles PDF watermarking, SCIM operations, async document imports
- Cron jobs run maintenance tasks off-peak hours
- Memory limits prevent OOM kills

---

### 13. vercel.json (Created)

**Purpose:** Vercel deployment configuration for Next.js web application.

**Build Configuration:**
- `buildCommand: "pnpm --filter web build"` — Build only web app
- `outputDirectory: "apps/web/.next"` — Next.js build output
- `installCommand: "pnpm install"` — Install all workspace dependencies
- `framework: "nextjs"` — Auto-detected, explicit for clarity

**Cron Jobs (6 total):**

1. **Storage Metering** — `0 1 * * *` (daily 1am)
   - Path: `/api/cron/storage-meter`
   - Updates company storage usage for billing

2. **Key Rotation** — `0 4 * * 0` (weekly Sunday 4am)
   - Path: `/api/cron/key-rotation`
   - Rotates AWS KMS data encryption keys

3. **Ownership Transfer** — `*/15 * * * *` (every 15 minutes)
   - Path: `/api/cron/ownership-transfer`
   - Processes pending company owner succession requests

4. **Key Expiry** — `0 9 * * *` (daily 9am)
   - Path: `/api/cron/key-expiry`
   - Revokes expired service account API keys

5. **Watermark Cleanup** — `0 5 * * *` (daily 5am)
   - Path: `/api/cron/watermark-cleanup`
   - Deletes temporary watermarked PDFs older than 24h

6. **Workflow Timeout** — `0 * * * *` (every hour)
   - Path: `/api/cron/workflow-timeout`
   - Force-unlocks stalled approval workflows

**Rationale:**
- Vercel Cron runs in same process as web app (no separate worker needed)
- Staggered schedules prevent resource contention
- Critical operations (ownership transfer) run frequently

---

### 14. scripts/migrate.sh (Created)

**Purpose:** Production-safe database migration script.

**Content:**
```bash
#!/bin/bash
set -e  # Exit on error
echo "Running database migrations..."
cd packages/db && npx prisma migrate deploy
echo "Migrations complete."
```

**Key Features:**
- Uses `prisma migrate deploy` (production-safe)
- **NEVER** uses `prisma migrate dev` (can drop data)
- Comments warn to take Supabase backup first
- Executable permissions set (`chmod +x`)

**Usage:**
```bash
# In production, before deployment:
1. Take Supabase manual backup
2. Run: ./scripts/migrate.sh
3. Verify migration success
4. Deploy application
```

**Rationale:** Explicit migration step prevents accidental schema changes. `migrate deploy` only applies committed migrations, never creates new ones.

---

## Architecture Decisions

### PWA Offline Strategy

**Problem:** Engineering drawings are 5–50MB. Default Workbox cache limit is 2MB.

**Solution:** Override `maximumFileSizeToCacheInBytes: 50MB` in next.config.js.

**Impact:** Field workers on ships can now download drawings for offline use, which is the entire product value proposition.

**Trade-off:** Larger device storage requirements, but acceptable for B2B industrial users.

---

### Multi-Tenancy Database Isolation

**Pattern:** `TENANT_DB_URL_[COMPANY_ID]` environment variable pattern.

**Default:** All companies share one database, isolated by `companyId` column (standard B2B SaaS).

**Enterprise Override:** Set `TENANT_DB_URL_clxyz123=postgresql://dedicated-host/db` to give a specific company its own database instance.

**Rationale:**
- Satisfies data residency requirements (e.g., EU client wants EU-only database)
- Enables physical isolation for compliance (defense contractors, pharma)
- No code changes required — pure configuration

---

### Render Worker Memory Allocation

**Decision:** Standard plan (2GB RAM) with 1536MB heap (75%).

**Justification:**
- Custom roles enable unpredictable "Bulk Watermark" access
- A single company could trigger 50 concurrent PDF jobs
- workerpool caps each child process at 512MB
- Need headroom for pool manager, Redis, SCIM operations

**Alternative Rejected:** Starter plan (512MB) would OOM under realistic load.

---

### Cron Job Separation

**Vercel Crons (Web App):**
- Storage metering
- Key rotation
- Ownership transfer
- Key expiry
- Watermark cleanup
- Workflow timeout

**Render Crons (Separate Processes):**
- Retention enforcement (heavy R2 operations)
- Vault integrity checks (heavy cryptographic operations)

**Rationale:**
- Vercel crons run in web app process (fast, simple, shared resources)
- Heavy operations run as separate Render cron services (isolated resources, won't affect web app performance)

---

## File Summary

| File | Status | Lines | Purpose |
|------|--------|-------|---------|
| apps/web/tsconfig.json | Modified | ~30 | TypeScript config with package aliases |
| apps/web/next.config.js | Created | ~60 | Next.js + PWA config |
| apps/web/tailwind.config.ts | Modified | ~70 | Tailwind + shadcn/ui theme |
| apps/web/.env.example | Created | ~65 | Environment variable template |
| apps/web/vitest.config.ts | Created | ~20 | Vitest unit test config |
| apps/web/vitest.setup.ts | Created | 1 | Test environment setup |
| apps/web/playwright.config.ts | Created | ~25 | E2E test config |
| apps/web/.prettierrc | Created | ~5 | Code formatting rules |
| apps/worker/tsconfig.json | Modified | ~20 | Worker TypeScript config |
| apps/worker/.env.example | Created | ~20 | Worker environment variables |
| packages/db/prisma/schema.prisma | Modified | ~60 | Prisma schema with directUrl |
| render.yaml | Created | ~115 | Worker + cron deployment |
| vercel.json | Created | ~30 | Web app deployment + crons |
| scripts/migrate.sh | Created | ~8 | Production migration script |

**Total:** 14 files (8 created, 6 modified)

---

## Next Steps

With all configuration files in place, the project is ready for:

### Phase 1 (P1) — Database Schema & Types
- Expand Prisma schema with all models (Document, Project, Transmittal, etc.)
- Run first migration: `cd packages/db && npx prisma migrate dev --name init`
- Generate Prisma client: `npx prisma generate`
- Populate `packages/types/src/index.ts` with TypeScript types

### Phase 2 (P2) — Core Business Logic
- Implement all `packages/core/src/*.ts` modules
- AWS S3/R2 integration (r2.ts, kms.ts)
- PDF processing (watermark.ts, pdf-utils.ts)
- Audit logging (audit.ts, audit-vault.ts)
- Authorization helpers (already scaffolded in index.ts)

### Phase 3 (P3) — Authentication & API Routes
- Configure NextAuth in `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Implement all 62 API routes
- Add request validation with Zod schemas
- Add rate limiting with Upstash Redis

### Phase 4 (P4) — Worker Implementation
- Implement BullMQ workers (watermark.worker.ts, scim.worker.ts)
- Implement cron jobs (retention.ts, vault-integrity.ts)
- Implement workerpool child process (watermark-child.js)

### Phase 5 (P5) — Frontend UI
- Implement all 27 page components
- Implement all 80+ feature components
- Implement custom hooks
- Add PWA install prompt and offline sync

---

## Testing Checklist

Before moving to implementation phases:

- [ ] TypeScript compiles without errors: `pnpm typecheck`
- [ ] All package aliases resolve correctly
- [ ] Prisma client generates: `cd packages/db && npx prisma generate`
- [ ] Next.js builds successfully: `cd apps/web && pnpm build`
- [ ] Worker compiles: `cd apps/worker && pnpm build`
- [ ] Environment files documented for all required variables
- [ ] Migration script is executable: `ls -la scripts/migrate.sh`
- [ ] No hardcoded secrets in any configuration files

---

## Documentation Files Created

- `/home/runner/work/DocuRoute/DocuRoute/docs/tests/P0P4_Test.md` — Detailed verification procedure
- `/home/runner/work/DocuRoute/DocuRoute/docs/summaries/P0P4_Summary.md` — This document

---

## Conclusion

The P0/P4 phase successfully established all configuration files for the DocuRoute application. The project now has:

1. **Type-safe monorepo** — All packages accessible via clean aliases
2. **Production PWA** — 50MB cache limit enables offline engineering drawings
3. **Comprehensive environment management** — 35+ variables documented with comments
4. **Testing infrastructure** — Unit tests (Vitest), E2E tests (Playwright)
5. **Deployment automation** — Vercel (web + 6 crons), Render (worker + 2 crons)
6. **Migration safety** — Production-safe script with warnings

These configurations follow best practices:
- **Security:** No secrets, only templates; LOCAL_KMS_MODE warnings
- **Scalability:** Memory limits prevent OOM; worker pool isolation
- **Compliance:** Audit vault crons; retention enforcement; enterprise DB isolation pattern
- **Developer Experience:** Consistent formatting; strict TypeScript; comprehensive documentation

The foundation is complete. Implementation can now proceed efficiently through P1–P5 phases.
