# P0/P4 Configuration Files Test Procedure

## Overview

This document provides step-by-step instructions to verify all configuration files created in the P0/P4 phase are correct and functional.

## Prerequisites

- Repository cloned locally
- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Access to verify file contents

## Test Procedure

### 1. Verify apps/web/tsconfig.json

**Test Steps:**
```bash
cat apps/web/tsconfig.json
```

**Expected Results:**
- `strict: true` is set
- `paths` includes:
  - `"@/*": ["./src/*"]`
  - `"@docuroute/core": ["../../packages/core/src/index.ts"]`
  - `"@docuroute/db": ["../../packages/db/src/index.ts"]`
  - `"@docuroute/types": ["../../packages/types/src/index.ts"]`
  - `"@docuroute/emails": ["../../packages/emails/src/index.ts"]`

**Status:** ☐ Pass ☐ Fail

---

### 2. Verify apps/web/next.config.js

**Test Steps:**
```bash
cat apps/web/next.config.js
```

**Expected Results:**
- Uses `@ducanh2912/next-pwa` with `require()` syntax
- PWA config includes:
  - `dest: 'public'`
  - `disable: process.env.NODE_ENV === 'development'`
  - `maximumFileSizeToCacheInBytes: 50 * 1024 * 1024` (50MB)
- Runtime caching includes 3 patterns:
  - Static assets (CacheFirst)
  - API routes with exclusions for `/api/upload/` and `/api/transmittals/` (NetworkFirst)
  - Dashboard pages (StaleWhileRevalidate)
- `images.remotePatterns` configured for Cloudflare R2
- `reactStrictMode: true`
- `typescript.ignoreBuildErrors: false`
- `eslint.ignoreDuringBuilds: false`
- `transpilePackages` includes all @docuroute packages

**Status:** ☐ Pass ☐ Fail

---

### 3. Verify apps/web/tailwind.config.ts

**Test Steps:**
```bash
cat apps/web/tailwind.config.ts
```

**Expected Results:**
- `content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"]` (simplified to src/**)
- `darkMode: ["class"]` is set
- CSS variable theme extensions present (shadcn/ui compatibility)
- `plugins: [require("tailwindcss-animate")]`

**Status:** ☐ Pass ☐ Fail

---

### 4. Verify apps/web/.env.example

**Test Steps:**
```bash
cat apps/web/.env.example
```

**Expected Results:**
- Contains all required sections:
  - Database (DATABASE_URL, DIRECT_URL)
  - Enterprise multi-tenancy comment (TENANT_DB_URL_[COMPANY_ID])
  - Auth (NEXTAUTH_SECRET, NEXTAUTH_URL)
  - Cloudflare R2 (5 variables)
  - AWS KMS (4 variables + LOCAL_KMS_MODE)
  - Email/Resend (2 variables)
  - Stripe (4 variables)
  - Upstash Redis (2 variables)
  - BullMQ Redis (REDIS_URL)
  - Cron (CRON_SECRET)
  - App (NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_VERSION)
  - Platform admin (PLATFORM_ADMIN_EMAIL)
  - Pilot seeding (3 variables)
  - Virus scanning (VIRUSTOTAL_API_KEY)
  - QR verification (QR_VERIFICATION_BASE_URL)
- Comments explain PgBouncer vs direct connection ports
- Comments explain enterprise DB isolation pattern

**Status:** ☐ Pass ☐ Fail

---

### 5. Verify apps/web/vitest.config.ts

**Test Steps:**
```bash
cat apps/web/vitest.config.ts
```

**Expected Results:**
- Uses `@vitejs/plugin-react`
- `test.environment: 'jsdom'`
- `test.setupFiles: ['./vitest.setup.ts']`
- `resolve.alias` maps all @docuroute packages to correct paths
- `resolve.alias` maps `@` to `./src`

**Status:** ☐ Pass ☐ Fail

---

### 6. Verify apps/web/vitest.setup.ts

**Test Steps:**
```bash
cat apps/web/vitest.setup.ts
```

**Expected Results:**
- Contains single line: `import '@testing-library/jest-dom'`

**Status:** ☐ Pass ☐ Fail

---

### 7. Verify apps/web/playwright.config.ts

**Test Steps:**
```bash
cat apps/web/playwright.config.ts
```

**Expected Results:**
- `testDir: './__tests__/e2e'`
- Uses chromium project
- `baseURL: 'http://localhost:3000'`
- `webServer.command: 'pnpm dev'`
- `webServer.url: 'http://localhost:3000'`

**Status:** ☐ Pass ☐ Fail

---

### 8. Verify apps/web/.prettierrc

**Test Steps:**
```bash
cat apps/web/.prettierrc
```

**Expected Results:**
- `semi: false`
- `singleQuote: true`
- `tabWidth: 2`
- `plugins: ["prettier-plugin-tailwindcss"]`

**Status:** ☐ Pass ☐ Fail

---

### 9. Verify apps/worker/tsconfig.json

**Test Steps:**
```bash
cat apps/worker/tsconfig.json
```

**Expected Results:**
- `strict: true`
- `module: "commonjs"` (for Node.js)
- `paths` includes all @docuroute packages (same as web)
- `outDir: "./dist"`
- `rootDir: "./src"`

**Status:** ☐ Pass ☐ Fail

---

### 10. Verify apps/worker/.env.example

**Test Steps:**
```bash
cat apps/worker/.env.example
```

**Expected Results:**
- Contains DATABASE_URL and DIRECT_URL
- Contains enterprise DB comment (TENANT_DB_URL_[COMPANY_ID])
- Contains all R2 variables (5)
- Contains all AWS KMS variables (4 + LOCAL_KMS_MODE)
- Contains Resend variables (2)
- Contains REDIS_URL
- Contains CRON_SECRET
- Contains PLATFORM_ADMIN_EMAIL
- Contains QR_VERIFICATION_BASE_URL
- Comment about NODE_OPTIONS set by render.yaml

**Status:** ☐ Pass ☐ Fail

---

### 11. Verify packages/db/prisma/schema.prisma

**Test Steps:**
```bash
cat packages/db/prisma/schema.prisma
```

**Expected Results:**
- `datasource db` block appears BEFORE `generator client` block
- `datasource.provider: "postgresql"`
- `datasource.url: env("DATABASE_URL")`
- `datasource.directUrl: env("DIRECT_URL")` is present
- `generator.provider: "prisma-client-js"`
- Existing models preserved (Company, User, CustomRole, UserCustomRole, SystemRole enum)

**Status:** ☐ Pass ☐ Fail

---

### 12. Verify render.yaml

**Test Steps:**
```bash
cat render.yaml
```

**Expected Results:**
- Three services defined:
  1. **docuroute-worker** (type: worker)
     - plan: standard
     - NODE_OPTIONS: --max-old-space-size=1536
     - buildCommand uses pnpm
     - healthCheckPath: /health
     - All env vars (DATABASE_URL, REDIS_URL, R2, KMS, etc.)
     - Comment explains 2GB RAM minimum for custom roles
  2. **docuroute-retention-cron** (type: cron)
     - schedule: "0 2 * * *" (daily at 2am)
     - NODE_OPTIONS: --max-old-space-size=400
     - startCommand: node apps/worker/dist/crons/retention.js
  3. **docuroute-vault-integrity-cron** (type: cron)
     - schedule: "0 3 * * *" (daily at 3am)
     - NODE_OPTIONS: --max-old-space-size=400
     - startCommand: node apps/worker/dist/crons/vault-integrity.js
- All env vars have `sync: false` (except hardcoded values)

**Status:** ☐ Pass ☐ Fail

---

### 13. Verify vercel.json

**Test Steps:**
```bash
cat vercel.json
```

**Expected Results:**
- `buildCommand: "pnpm --filter web build"`
- `outputDirectory: "apps/web/.next"`
- `installCommand: "pnpm install"`
- `framework: "nextjs"`
- 6 cron jobs defined:
  1. `/api/cron/storage-meter` - daily 1am
  2. `/api/cron/key-rotation` - weekly Sunday 4am
  3. `/api/cron/ownership-transfer` - every 15 minutes
  4. `/api/cron/key-expiry` - daily 9am
  5. `/api/cron/watermark-cleanup` - daily 5am
  6. `/api/cron/workflow-timeout` - every hour

**Status:** ☐ Pass ☐ Fail

---

### 14. Verify scripts/migrate.sh

**Test Steps:**
```bash
cat scripts/migrate.sh
ls -la scripts/migrate.sh
```

**Expected Results:**
- File is executable (chmod +x)
- Contains shebang: `#!/bin/bash`
- Sets `set -e` for error exit
- Comments warn against prisma migrate dev in production
- Commands:
  1. `cd packages/db`
  2. `npx prisma migrate deploy`
- Echo statements for user feedback

**Status:** ☐ Pass ☐ Fail

---

## Integration Tests

### 15. TypeScript Path Resolution Test

**Test Steps:**
```bash
cd apps/web
pnpm exec tsc --noEmit
```

**Expected Results:**
- No errors about missing modules
- Package aliases resolve correctly

**Status:** ☐ Pass ☐ Fail

---

### 16. Next.js Build Test

**Test Steps:**
```bash
cd apps/web
pnpm build
```

**Expected Results:**
- Build completes without errors
- PWA service worker generated in public/
- No TypeScript or ESLint errors

**Status:** ☐ Pass ☐ Fail

---

### 17. Prisma Client Generation Test

**Test Steps:**
```bash
cd packages/db
npx prisma generate
```

**Expected Results:**
- Prisma client generates successfully
- Uses both DATABASE_URL and DIRECT_URL from schema

**Status:** ☐ Pass ☐ Fail

---

### 18. Worker TypeScript Compilation Test

**Test Steps:**
```bash
cd apps/worker
pnpm build
```

**Expected Results:**
- TypeScript compiles to dist/ folder
- No type errors
- CommonJS output format

**Status:** ☐ Pass ☐ Fail

---

## File Count Verification

**Test Steps:**
```bash
# Count created/modified files
ls -1 apps/web/tsconfig.json \
       apps/web/next.config.js \
       apps/web/tailwind.config.ts \
       apps/web/.env.example \
       apps/web/vitest.config.ts \
       apps/web/vitest.setup.ts \
       apps/web/playwright.config.ts \
       apps/web/.prettierrc \
       apps/worker/tsconfig.json \
       apps/worker/.env.example \
       packages/db/prisma/schema.prisma \
       render.yaml \
       vercel.json \
       scripts/migrate.sh | wc -l
```

**Expected Result:** 14 files exist

**Status:** ☐ Pass ☐ Fail

---

## Documentation Verification

### 19. Verify Test Documentation

**Test Steps:**
```bash
ls -la docs/tests/P0P4_Test.md
```

**Expected Results:**
- File exists
- Contains complete test procedure

**Status:** ☐ Pass ☐ Fail

---

### 20. Verify Summary Documentation

**Test Steps:**
```bash
ls -la docs/summaries/P0P4_Summary.md
```

**Expected Results:**
- File exists
- Summarizes all configuration files created
- Explains purpose and key details

**Status:** ☐ Pass ☐ Fail

---

## Summary

**Total Tests:** 20
**Passed:** ___
**Failed:** ___

**Critical Failures:** (list any blocking issues)

**Notes:**

---

## Sign-off

**Tested By:** _______________
**Date:** _______________
**Status:** ☐ Approved ☐ Needs Revision
