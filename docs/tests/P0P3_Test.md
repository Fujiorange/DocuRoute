# P0/P3 Folder Structure Creation Test Guide

This document provides a detailed step-by-step guide to verify the complete folder structure was created correctly for all 5 phases of the DocuRoute project.

## Overview

This test verifies that all folders and empty files specified in the P0/P3 prompt were created using `mkdir -p` and `touch` commands. No file content is added at this stage - only the directory structure and empty placeholder files.

## 1. Verify apps/web/src/app Routes

### 1.1 Verify (auth) Routes

Run:
```bash
ls -la /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(auth\)/login/
ls -la /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(auth\)/accept-invite/
```

Expected:
- Each directory should contain a `page.tsx` file

### 1.2 Verify (dashboard) Routes

Run:
```bash
ls -la /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(dashboard\)/
```

Expected:
- Should contain `layout.tsx` file
- Should contain subdirectories: dashboard, documents, projects, approvals, transmittals, audit-log, auditor, search, settings

### 1.3 Verify (dashboard)/documents Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(dashboard\)/documents -name "page.tsx"
```

Expected files:
- `/home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/(dashboard)/documents/page.tsx`
- `/home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/(dashboard)/documents/conflicts/page.tsx`
- `/home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/(dashboard)/documents/recycle-bin/page.tsx`

### 1.4 Verify (dashboard)/settings Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(dashboard\)/settings -name "page.tsx"
```

Expected files (12 total):
- users/page.tsx
- roles/page.tsx
- security/page.tsx
- security/identity/page.tsx
- billing/page.tsx
- succession/page.tsx
- retention/page.tsx
- legal-holds/page.tsx
- naming-masks/page.tsx
- service-accounts/page.tsx
- document-control/page.tsx
- mobile/page.tsx

### 1.5 Verify (public) Routes

Run:
```bash
ls -la /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(public\)/acknowledge/\[transmittalId\]/
ls -la /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/\(public\)/verify/\[documentId\]/
```

Expected:
- Each directory should contain a `page.tsx` file

### 1.6 Count Total Page Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app -type f -name "page.tsx" | wc -l
```

Expected: 27 page.tsx files

## 2. Verify API Routes

### 2.1 Verify NextAuth Route

Run:
```bash
ls -la /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api/auth/\[...nextauth\]/
```

Expected: Should contain `route.ts` file

### 2.2 Verify User API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api/users -name "route.ts"
```

Expected files:
- api/users/route.ts
- api/users/[id]/route.ts
- api/users/[id]/role/route.ts
- api/users/[id]/deactivate/route.ts

### 2.3 Verify Roles API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api/roles -name "route.ts"
```

Expected files:
- api/roles/route.ts
- api/roles/[id]/route.ts
- api/roles/[id]/permissions/route.ts

### 2.4 Verify Documents API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api/documents -name "route.ts" | wc -l
```

Expected: 13 route.ts files in documents endpoints

### 2.5 Verify Workflows API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api/workflows -name "route.ts"
```

Expected files:
- api/workflows/templates/route.ts
- api/workflows/start/route.ts
- api/workflows/[instanceId]/route.ts
- api/workflows/[instanceId]/action/route.ts
- api/workflows/[instanceId]/force-unlock/route.ts

### 2.6 Verify Cron API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api/cron -name "route.ts"
```

Expected files (8 total):
- retention/route.ts
- key-rotation/route.ts
- vault-integrity/route.ts
- storage-meter/route.ts
- ownership-transfer/route.ts
- key-expiry/route.ts
- watermark-cleanup/route.ts
- workflow-timeout/route.ts

### 2.7 Count Total API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api -type f -name "route.ts" | wc -l
```

Expected: 62 route.ts files

## 3. Verify Components Structure

### 3.1 Verify UI Components (shadcn)

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/ui/
```

Expected: Should already exist from P0/P1 with shadcn components (button.tsx, card.tsx, etc.)

### 3.2 Verify Layout Components

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/layout/
```

Expected files (6 total):
- sidebar.tsx
- topbar.tsx
- mobile-nav.tsx
- breadcrumbs.tsx
- notification-bell.tsx
- notification-dropdown.tsx

### 3.3 Verify Auth Components

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/auth/
```

Expected files:
- login-form.tsx
- accept-invite-form.tsx

### 3.4 Verify Users Components

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/users/
```

Expected files:
- user-table.tsx
- invite-modal.tsx
- role-badge.tsx
- permission-gate.tsx

### 3.5 Verify Roles Components

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/roles/
```

Expected files:
- role-builder.tsx
- permission-checkbox-grid.tsx
- role-list.tsx

### 3.6 Verify Documents Components

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/documents/ | wc -l
```

Expected: 10 component files

### 3.7 Verify Offline Components

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/offline/
```

Expected files (6 total):
- sync-status.tsx
- offline-download-button.tsx
- conflict-modal.tsx
- conflict-queue.tsx
- storage-disclaimer.tsx
- offline-banner.tsx

### 3.8 Verify All Component Directories

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/components/
```

Expected directories:
- ui (shadcn)
- layout
- auth
- users
- roles
- documents
- upload
- workflows
- transmittals
- audit
- offline
- billing
- onboarding
- search
- shared

## 4. Verify Hooks

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/hooks/
```

Expected files (9 total):
- use-current-user.ts
- use-permissions.ts
- use-offline-download-progress.ts
- use-sync-queue.ts
- use-mdr-job-status.ts
- use-watermark-status.ts
- use-debounce.ts
- use-notifications.ts
- use-search.ts

## 5. Verify Lib

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/lib/
```

Expected files:
- utils.ts (already exists from shadcn setup)
- auth.ts
- offline-db.ts

## 6. Verify Types

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/types/
```

Expected files:
- next-auth.d.ts
- global.d.ts

## 7. Verify Styles

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/web/src/styles/
```

Expected:
- globals.css (copied from app/globals.css if it existed there)

## 8. Verify Worker Structure

### 8.1 Verify Worker Index

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/worker/src/
```

Expected files:
- index.ts (already exists from P0/P1)
- Plus subdirectories: workers, scripts, crons

### 8.2 Verify Workers

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/worker/src/workers/
```

Expected files:
- watermark.worker.ts
- scim.worker.ts

### 8.3 Verify Scripts

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/worker/src/scripts/
```

Expected file:
- watermark-child.js

### 8.4 Verify Crons

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/apps/worker/src/crons/
```

Expected files:
- retention.ts
- vault-integrity.ts

## 9. Verify Packages/Core Structure

### 9.1 Verify Core Root Files

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/packages/core/src/
```

Expected files (20+ files):
- index.ts (already exists)
- r2.ts, kms.ts
- audit.ts, audit-vault.ts
- legal-hold.ts
- smart-parser.ts, naming-mask.ts
- watermark.ts, qr-verification.ts
- transmittal-pdf.ts, transmittal-sequence.ts
- workflow-engine.ts
- conflict-resolver.ts, offline-download.ts
- stripe.ts, resend.ts, rate-limit.ts
- utils.ts, errors.ts, search.ts, pdf-utils.ts
- Plus subdirectories: queries, validations

### 9.2 Verify Core Queries

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/packages/core/src/queries/
```

Expected files:
- documents.ts
- workflows.ts
- transmittals.ts
- notifications.ts

### 9.3 Verify Core Validations

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/packages/core/src/validations/
```

Expected files:
- user.ts
- document.ts
- workflow.ts
- transmittal.ts
- role.ts

## 10. Verify Packages/DB Structure

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/packages/db/src/
```

Expected files:
- index.ts (already exists from P0/P1)
- client.ts (may already exist)

## 11. Verify Packages/Types Structure

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/packages/types/src/
```

Expected file:
- index.ts (already exists from P0/P1)

## 12. Verify Packages/Emails Structure

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/packages/emails/src/
```

Expected files:
- index.ts (already exists)
- invite.tsx
- transmittal.tsx
- transmittal-return.tsx
- workflow-action.tsx
- ownership-transfer.tsx
- virus-quarantine.tsx
- notification-digest.tsx

## 13. Verify Root-Level Documentation

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/docs/
```

Expected files:
- SYSTEM_ARCHITECTURE.md
- ROLE_PERMISSION_MATRIX.md
- PILOT_CLIENT_HANDOFF.md
- DEPLOYMENT_CHECKLIST.md
- SECURITY_MANUAL_CHECKLIST.md
- SSO_SETUP_AZURE_AD.md
- SSO_SETUP_OKTA.md
- SSO_SETUP_GOOGLE_WORKSPACE.md

Expected directories:
- tests/ (contains P0P1_Test.md, P0P2.md, P0P3_Test.md)
- summaries/ (contains P0P1_Summary.md, P0P2.md, P0P3_Summary.md)
- prompts/ (will contain phase files)

## 14. Verify Scripts

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/scripts/
```

Expected files:
- seed-pilot.ts
- migrate.sh
- seed-benchmark-data.ts

## 15. Verify Tests Structure

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/
```

Expected directories:
- __tests__/unit/
- __tests__/api/
- __tests__/e2e/
- __tests__/security/

## 16. Verify Benchmarks

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/benchmarks/
```

Expected directory:
- load-tests/

## 17. Verify Public Assets

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/public/
ls /home/runner/work/DocuRoute/DocuRoute/public/icons/
```

Expected files:
- manifest.json
- icons/icon-192.png
- icons/icon-512.png

## 18. Final Verification

### 18.1 Count All Page Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app -type f -name "page.tsx" | wc -l
```

Expected: 27 files

### 18.2 Count All API Routes

Run:
```bash
find /home/runner/work/DocuRoute/DocuRoute/apps/web/src/app/api -type f -name "route.ts" | wc -l
```

Expected: 62 files

### 18.3 Verify Documentation Created

Run:
```bash
ls /home/runner/work/DocuRoute/DocuRoute/docs/tests/P0P3_Test.md
ls /home/runner/work/DocuRoute/DocuRoute/docs/summaries/P0P3_Summary.md
```

Expected: Both files should exist

## 19. Build Test (Optional)

The structure should not break any existing builds since all files are empty placeholders:

```bash
cd /home/runner/work/DocuRoute/DocuRoute
pnpm install
pnpm typecheck
```

Expected: Should complete with no errors (though type errors may exist in empty files, which is expected)

## Summary

If all the above checks pass, the P0/P3 folder structure creation is complete. The repository now has:

- **27** page routes in apps/web/src/app
- **62** API route endpoints in apps/web/src/app/api
- **80+** component files across 15 component directories
- **9** custom hooks
- **Complete** worker structure with workers, scripts, and crons
- **Complete** package structures for core, db, types, and emails
- **Root-level** documentation, scripts, tests, benchmarks, and public assets

All files are empty placeholders ready for implementation in subsequent phases.
