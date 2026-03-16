# DocuRoute – File Directory

> Auto-generated reference of every file in the repository (excludes `node_modules`, `.git`, `dist`, `.next`, `build`, `.turbo`, and `generated` directories).

---

## Root

```
/
├── .gitignore                  – Git ignore rules
├── package.json                – Root workspace package manifest (pnpm + Turborepo)
├── pnpm-lock.yaml              – Locked dependency tree (pnpm)
├── pnpm-workspace.yaml         – Declares pnpm workspace packages
├── turbo.json                  – Turborepo task pipeline config
├── vercel.json                 – Vercel deployment config
├── render.yaml                 – Render.com service config (worker)
├── README.md                   – Project overview and setup guide
└── Prompt #5                   – Internal implementation prompt (Phase 0 P5) [legacy filename]
```

---

## apps/

### apps/web/  *(Next.js 14 front-end + API)*

```
apps/web/
├── .env.example                – Required environment variable template
├── .prettierrc                 – Prettier code-style config
├── components.json             – shadcn/ui component registry config
├── next.config.js              – Next.js configuration (PWA, headers, etc.)
├── package.json                – Web app dependencies
├── playwright.config.ts        – Playwright end-to-end test config
├── postcss.config.mjs          – PostCSS / Tailwind CSS config
├── tailwind.config.ts          – Tailwind CSS theme and plugin config
├── tsconfig.json               – TypeScript compiler options
├── vitest.config.ts            – Vitest unit test config
└── vitest.setup.ts             – Vitest global test setup
```

#### apps/web/public/

```
public/
├── manifest.json               – PWA web-app manifest
└── icons/
    ├── icon-192.png            – PWA icon 192 × 192
    └── icon-512.png            – PWA icon 512 × 512
```

#### apps/web/src/app/  *(Next.js App Router pages & API routes)*

```
src/app/
├── globals.css                 – Global CSS reset / Tailwind base
├── layout.tsx                  – Root layout (font, providers)
├── page.tsx                    – Marketing / landing root page

├── (auth)/                     – Auth route group (no sidebar layout)
│   ├── accept-invite/
│   │   └── page.tsx            – Accept-invitation landing page
│   └── login/
│       └── page.tsx            – Email magic-link login page

├── (dashboard)/                – Protected dashboard route group
│   ├── layout.tsx              – Dashboard shell (sidebar + topbar)
│   ├── approvals/
│   │   └── page.tsx            – Pending approval requests
│   ├── audit-log/
│   │   └── page.tsx            – Company-level audit log viewer
│   ├── auditor/
│   │   └── page.tsx            – External auditor read-only view
│   ├── dashboard/
│   │   └── page.tsx            – Main dashboard / home
│   ├── documents/
│   │   ├── page.tsx            – Document library list
│   │   ├── conflicts/
│   │   │   └── page.tsx        – Offline sync conflict resolution
│   │   └── recycle-bin/
│   │       └── page.tsx        – Soft-deleted documents
│   ├── projects/
│   │   └── page.tsx            – Projects / transmittal groupings
│   ├── search/
│   │   └── page.tsx            – Global full-text search
│   ├── transmittals/
│   │   └── page.tsx            – Transmittal management
│   └── settings/
│       ├── billing/
│       │   └── page.tsx        – Stripe billing & plan management
│       ├── document-control/
│       │   └── page.tsx        – Document control settings
│       ├── legal-holds/
│       │   └── page.tsx        – Legal hold management
│       ├── mobile/
│       │   └── page.tsx        – Mobile / PWA settings
│       ├── naming-masks/
│       │   └── page.tsx        – Document naming-mask rules
│       ├── retention/
│       │   └── page.tsx        – Retention policy configuration
│       ├── roles/
│       │   └── page.tsx        – Custom role builder
│       ├── security/
│       │   ├── page.tsx        – Security overview (SSO, keys)
│       │   └── identity/
│       │       └── page.tsx    – Identity provider / SCIM config
│       ├── service-accounts/
│       │   └── page.tsx        – Service account & API key management
│       ├── succession/
│       │   └── page.tsx        – Emergency ownership-transfer settings
│       └── users/
│           └── page.tsx        – User & invitation management

├── (public)/                   – Unauthenticated public-facing pages
│   ├── acknowledge/
│   │   └── [transmittalId]/
│   │       └── page.tsx        – External transmittal acknowledgement
│   └── verify/
│       └── [documentId]/
│           └── page.tsx        – QR-code document verification

├── dashboard/                  – Legacy / redirect dashboard tree
│   └── settings/
│       └── users/
│           └── page.tsx        – Legacy users settings redirect

└── api/                        – Next.js Route Handlers (REST API)
    ├── admin/
    │   └── queue-status/
    │       └── route.ts        – BullMQ queue health endpoint
    ├── audit-vault/
    │   └── export/
    │       └── route.ts        – Immutable audit-vault CSV/JSON export
    ├── auth/
    │   └── [...nextauth]/
    │       └── route.ts        – NextAuth v4 catch-all handler
    ├── billing/
    │   ├── checkout/
    │   │   └── route.ts        – Stripe checkout session creation
    │   └── portal/
    │       └── route.ts        – Stripe customer portal redirect
    ├── company/
    │   ├── emergency-ownership-transfer/
    │   │   └── route.ts        – Break-glass ownership transfer
    │   ├── onboarding/
    │   │   └── route.ts        – Company onboarding wizard state
    │   └── transfer-ownership/
    │       ├── route.ts        – Initiate ownership transfer
    │       └── [id]/
    │           └── route.ts    – Accept / cancel specific transfer
    ├── compliance/
    │   ├── reports/
    │   │   ├── audit-trail/
    │   │   │   └── route.ts    – Audit-trail compliance report
    │   │   └── retention/
    │   │       └── route.ts    – Retention compliance report
    │   └── retention-dry-run/
    │       └── route.ts        – Preview retention purge (dry run)
    ├── cron/                   – Vercel Cron job endpoints
    │   ├── key-expiry/
    │   │   └── route.ts        – Expire service-account API keys
    │   ├── key-rotation/
    │   │   └── route.ts        – Rotate encryption keys
    │   ├── ownership-transfer/
    │   │   └── route.ts        – Auto-process timed-out transfers
    │   ├── retention/
    │   │   └── route.ts        – Execute retention purge policies
    │   ├── storage-meter/
    │   │   └── route.ts        – Update per-company storage usage
    │   ├── vault-integrity/
    │   │   └── route.ts        – Verify audit-vault hash chain
    │   ├── watermark-cleanup/
    │   │   └── route.ts        – Clean up stale watermark jobs
    │   └── workflow-timeout/
    │       └── route.ts        – Timeout stalled workflow instances
    ├── documents/
    │   ├── route.ts            – List / create documents
    │   ├── search/
    │   │   └── route.ts        – Full-text document search
    │   ├── parse-preview/
    │   │   └── route.ts        – Smart-parser metadata preview
    │   ├── watermark-status/
    │   │   └── [jobId]/
    │   │       └── route.ts    – Poll watermark job status
    │   ├── mdr-import/
    │   │   ├── route.ts        – Start MDR bulk import job
    │   │   └── [jobId]/
    │   │       └── route.ts    – Poll MDR import job status
    │   ├── bulk/
    │   │   ├── route.ts        – Bulk document operations
    │   │   └── [operationId]/
    │   │       └── undo/
    │   │           └── route.ts – Undo bulk operation
    │   └── [id]/
    │       ├── route.ts        – Get / update / delete document
    │       ├── current-hash/
    │       │   └── route.ts    – Fetch document integrity hash
    │       ├── verify/
    │       │   └── route.ts    – Public document authenticity verify
    │       └── revisions/
    │           └── [revisionId]/
    │               ├── acknowledge/
    │               │   └── route.ts – Mark revision acknowledged
    │               └── view/
    │                   └── route.ts – Stream watermarked PDF view
    ├── health/
    │   └── route.ts            – Health-check endpoint
    ├── invitations/
    │   ├── accept/
    │   │   └── route.ts        – Accept invitation token
    │   ├── resend/
    │   │   └── route.ts        – Resend invitation email (rate limited)
    │   └── validate/
    │       └── route.ts        – Validate invitation token
    ├── legal-holds/
    │   ├── route.ts            – List / create legal holds
    │   └── [id]/
    │       └── route.ts        – Get / update / release legal hold
    ├── notifications/
    │   ├── route.ts            – List notifications
    │   ├── read-all/
    │   │   └── route.ts        – Mark all notifications read
    │   └── [id]/
    │       └── read/
    │           └── route.ts    – Mark single notification read
    ├── roles/
    │   ├── route.ts            – List / create custom roles
    │   └── [id]/
    │       ├── route.ts        – Get / update / delete role
    │       └── permissions/
    │           └── route.ts    – Update role permissions
    ├── scim/
    │   └── v2/
    │       └── Users/
    │           ├── route.ts    – SCIM 2.0 user list / create
    │           └── [id]/
    │               └── route.ts – SCIM 2.0 user get / update / delete
    ├── service-accounts/
    │   ├── route.ts            – List / create service accounts
    │   └── [id]/
    │       └── keys/
    │           └── route.ts    – Manage API keys for service account
    ├── transmittals/
    │   ├── route.ts            – List / create transmittals
    │   └── [id]/
    │       ├── route.ts        – Get / update / delete transmittal
    │       ├── send/
    │       │   └── route.ts    – Send transmittal to recipients
    │       └── return/
    │           └── route.ts    – Return transmittal with comments
    ├── upload/
    │   ├── presign/
    │   │   └── route.ts        – Generate R2 pre-signed upload URL
    │   └── confirm/
    │       └── route.ts        – Confirm upload and trigger watermark
    ├── users/
    │   ├── route.ts            – List company users
    │   ├── invite/
    │   │   └── route.ts        – Send user invitation email
    │   └── [id]/
    │       ├── route.ts        – Get / update user
    │       ├── deactivate/
    │       │   └── route.ts    – Deactivate user account
    │       └── role/
    │           └── route.ts    – Change user role
    ├── webhooks/
    │   └── stripe/
    │       └── route.ts        – Stripe webhook receiver
    └── workflows/
        ├── start/
        │   └── route.ts        – Start workflow instance
        ├── templates/
        │   └── route.ts        – List workflow templates
        └── [instanceId]/
            ├── route.ts        – Get workflow instance
            ├── action/
            │   └── route.ts    – Submit workflow action (approve/reject)
            └── force-unlock/
                └── route.ts    – Admin force-unlock stalled workflow
```

#### apps/web/src/components/  *(React UI components)*

```
src/components/
├── audit/
│   ├── audit-log-table.tsx     – Paginated audit event table
│   └── vault-table.tsx         – Immutable audit-vault hash-chain table
├── auth/
│   ├── accept-invite-form.tsx  – Invitation acceptance form
│   └── login-form.tsx          – Magic-link login form
├── billing/
│   ├── plan-card.tsx           – Subscription plan display card
│   └── usage-bar.tsx           – Storage / seat usage progress bar
├── documents/
│   ├── bulk-action-bar.tsx     – Floating bulk-action toolbar
│   ├── discipline-badge.tsx    – Engineering discipline colour badge
│   ├── document-card.tsx       – Document list-item card
│   ├── document-list.tsx       – Virtualized document list container
│   ├── document-status-badge.tsx – Document lifecycle status badge
│   ├── dropzone.tsx            – Drag-and-drop PDF upload zone
│   ├── issue-purpose-badge.tsx – Issue-purpose colour badge
│   ├── metadata-grid.tsx       – Document metadata key-value grid
│   ├── pdf-preview.tsx         – In-browser PDF preview (pdfjs-dist)
│   └── recycle-bin-table.tsx   – Soft-deleted document restore table
├── layout/
│   ├── breadcrumbs.tsx         – Dynamic route breadcrumb trail
│   ├── mobile-nav.tsx          – Bottom navigation bar (mobile)
│   ├── notification-bell.tsx   – Header notification bell icon
│   ├── notification-dropdown.tsx – Notification dropdown panel
│   ├── sidebar.tsx             – Collapsible desktop sidebar
│   └── topbar.tsx              – Top header bar
├── offline/
│   ├── conflict-modal.tsx      – Offline sync conflict resolution modal
│   ├── conflict-queue.tsx      – List of pending sync conflicts
│   ├── offline-banner.tsx      – "You are offline" banner
│   ├── offline-download-button.tsx – Download document for offline use
│   ├── storage-disclaimer.tsx  – Local storage usage disclaimer
│   └── sync-status.tsx         – Background sync status indicator
├── onboarding/
│   ├── onboarding-checklist.tsx – Company setup checklist widget
│   └── onboarding-step.tsx     – Individual onboarding step item
├── roles/
│   ├── permission-checkbox-grid.tsx – Permission matrix checkbox grid
│   ├── role-builder.tsx        – Custom role creation / edit form
│   └── role-list.tsx           – List of company roles with actions
├── search/
│   ├── global-search-bar.tsx   – Command-palette global search input
│   └── search-results.tsx      – Search result list with highlighting
├── shared/
│   ├── confirmation-modal.tsx  – Generic confirm / cancel dialog
│   ├── empty-state.tsx         – Zero-content empty-state illustration
│   ├── error-boundary.tsx      – React error boundary wrapper
│   ├── loading-skeleton.tsx    – Shimmer loading skeleton
│   ├── page-header.tsx         – Page title + action slot header
│   └── pwa-install-prompt.tsx  – "Add to home screen" install prompt
├── transmittals/
│   ├── transmittal-form.tsx    – Create / edit transmittal form
│   └── transmittal-list.tsx    – Transmittal list with status
├── ui/                         – shadcn/ui primitive components
│   ├── accordion.tsx
│   ├── alert.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── command.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── progress.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── skeleton.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   └── tooltip.tsx
├── upload/
│   ├── mdr-upload.tsx          – MDR bulk-import upload wizard
│   ├── naming-mask-validator.tsx – Real-time naming-mask validation UI
│   └── smart-parser-preview.tsx – Smart-parser metadata preview panel
├── users/
│   ├── invite-modal.tsx        – Invite user modal dialog
│   ├── permission-gate.tsx     – Render-gate for permission-guarded UI
│   ├── role-badge.tsx          – User role colour badge
│   └── user-table.tsx          – User management data table
└── workflows/
    ├── action-modal.tsx        – Approve / reject workflow action modal
    ├── stage-progress.tsx      – Workflow stage progress stepper
    └── workflow-card.tsx       – Workflow instance summary card
```

#### apps/web/src/hooks/  *(React custom hooks)*

```
src/hooks/
├── use-current-user.ts         – Session user + company context hook
├── use-debounce.ts             – Generic debounce value hook
├── use-mdr-job-status.ts       – Poll MDR import job status hook
├── use-notifications.ts        – Real-time notification list hook
├── use-offline-download-progress.ts – Offline download progress hook
├── use-permissions.ts          – PBAC permission check hook
├── use-search.ts               – Debounced document search hook
├── use-sync-queue.ts           – Offline sync queue hook
└── use-watermark-status.ts     – Poll watermark job status hook
```

#### apps/web/src/lib/  *(Server-side utilities)*

```
src/lib/
├── auth.ts                     – NextAuth v4 config (JWT, magic links, PBAC)
├── email.ts                    – Resend email client wrapper
├── offline-db.ts               – IndexedDB offline store (Dexie)
├── utils.ts                    – General utility helpers (cn, etc.)
└── validations/
    ├── role.ts                 – Zod schemas for role CRUD
    └── user.ts                 – Zod schemas for user invite / update
```

#### apps/web/src/types/  *(TypeScript declaration files)*

```
src/types/
├── global.d.ts                 – Global ambient type declarations
└── next-auth.d.ts              – Extends NextAuth Session / JWT types
```

#### apps/web/src/styles/

```
src/styles/
└── globals.css                 – Additional global stylesheet
```

#### apps/web/src/ *(root source files)*

```
src/
└── middleware.ts               – Next.js Edge middleware (auth + route guard)
```

---

### apps/worker/  *(Node.js BullMQ background worker)*

```
apps/worker/
├── .env.example                – Required environment variable template
├── package.json                – Worker app dependencies
├── tsconfig.json               – TypeScript compiler options
└── src/
    ├── index.ts                – Worker entry point (queue registration)
    ├── crons/
    │   ├── retention.ts        – Scheduled retention-policy execution
    │   └── vault-integrity.ts  – Scheduled audit-vault integrity check
    ├── scripts/
    │   └── watermark-child.js  – Child process for PDF watermarking
    └── workers/
        ├── scim.worker.ts      – SCIM user-provisioning BullMQ worker
        └── watermark.worker.ts – PDF watermark BullMQ worker
```

---

## packages/

### packages/core/  *(Shared business logic – no Next.js/React imports)*

```
packages/core/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                – Barrel export for all core modules
    ├── audit-vault.ts          – Immutable append-only audit vault
    ├── audit.ts                – Audit logging helpers
    ├── conflict-resolver.ts    – Offline sync conflict detection & merge
    ├── errors.ts               – Typed application error classes
    ├── kms.ts                  – Encryption key management (AES-256-GCM)
    ├── legal-hold.ts           – Legal hold enforcement helpers
    ├── naming-mask.ts          – Document naming-mask parser & validator
    ├── offline-download.ts     – Offline package builder
    ├── pdf-utils.ts            – PDF parsing & manipulation utilities
    ├── qr-verification.ts      – QR-code generation for doc verification
    ├── r2.ts                   – Cloudflare R2 storage client
    ├── rate-limit.ts           – Upstash Redis sliding-window rate limiter
    ├── resend.ts               – Transactional email via Resend SDK
    ├── search.ts               – Document full-text search (pg_trgm)
    ├── smart-parser.ts         – AI-assisted document metadata extractor
    ├── stripe.ts               – Stripe billing helpers
    ├── transmittal-pdf.ts      – Transmittal PDF generation (PDFKit)
    ├── transmittal-sequence.ts – Auto-incrementing transmittal numbering
    ├── utils.ts                – Shared utility functions
    ├── watermark.ts            – PDF watermark pipeline (workerpool)
    ├── workflow-engine.ts      – Workflow state-machine engine
    ├── queries/
    │   ├── documents.ts        – Prisma document query helpers
    │   ├── notifications.ts    – Prisma notification query helpers
    │   ├── transmittals.ts     – Prisma transmittal query helpers
    │   └── workflows.ts        – Prisma workflow query helpers
    └── validations/
        ├── document.ts         – Zod schemas for document operations
        ├── role.ts             – Zod schemas for role operations
        ├── transmittal.ts      – Zod schemas for transmittal operations
        ├── user.ts             – Zod schemas for user operations
        └── workflow.ts         – Zod schemas for workflow operations
```

---

### packages/db/  *(Prisma database client)*

```
packages/db/
├── package.json
├── tsconfig.json
└── prisma/
│   ├── schema.prisma           – Full Prisma schema (all models)
│   └── migrations/
│       └── 20260314_phase-1-schema/
│           └── migration.sql   – Phase 1 schema migration SQL
└── src/
    ├── client.ts               – Multi-tenant Prisma client factory (getPrismaForCompany)
    └── index.ts                – Barrel export
```

---

### packages/emails/  *(React Email templates)*

```
packages/emails/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                – Barrel export for all email templates
    ├── invite.tsx              – User invitation email template
    ├── notification-digest.tsx – Daily notification digest email
    ├── ownership-transfer.tsx  – Ownership transfer request email
    ├── transmittal-return.tsx  – Transmittal returned email
    ├── transmittal.tsx         – New transmittal notification email
    ├── virus-quarantine.tsx    – Virus-quarantine alert email
    ├── workflow-action.tsx     – Workflow action required email
    └── templates/
        └── welcome.tsx         – Welcome / onboarding email
```

---

### packages/types/  *(Shared TypeScript types)*

```
packages/types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                – All shared types, enums, and 47 Permission values
    └── role-descriptions.ts   – Human-readable labels for roles & permissions
```

---

## docs/

```
docs/
├── DEPLOYMENT_CHECKLIST.md             – Step-by-step production deployment guide
├── DEPLOYMENT_PERFORMANCE_CHECKLIST.md – Performance hardening checklist
├── P0P3_COMMANDS.txt                   – CLI commands reference for Phase 0 P3
├── PERFORMANCE_ANALYSIS.md            – System performance analysis report
├── PILOT_CLIENT_HANDOFF.md            – Pilot client handoff documentation
├── ROLE_PERMISSION_MATRIX.md          – Full RBAC/PBAC permission matrix
├── SECURITY_MANUAL_CHECKLIST.md       – Security audit manual checklist
├── SSO_SETUP_AZURE_AD.md              – Azure AD SSO / SCIM setup guide
├── SSO_SETUP_GOOGLE_WORKSPACE.md      – Google Workspace SSO setup guide
├── SSO_SETUP_OKTA.md                  – Okta SSO / SCIM setup guide
├── SYSTEM_ARCHITECTURE.md            – High-level system architecture overview
├── File_Directory/
│   └── FILE_DIRECTORY.md              – This file – complete repository file index
├── summaries/                         – Implementation summary documents
│   ├── P0P1_Summary.md
│   ├── P0P2.md
│   ├── P0P3_Summary.md
│   ├── P0P4_Summary.md
│   ├── P0P5_Summary.md
│   ├── P0P6_Summary.md
│   ├── P0_Complete_Summary.md
│   ├── P1P1_Summary.md
│   ├── 1-2 P1P2.md
│   ├── 1-3 P1P3.md
│   ├── 1-4 P1P4.md
│   └── 1-5 P1P5.md
└── tests/                             – Test plan and guide documents
    ├── P0P1_Test.md
    ├── P0P2.md
    ├── P0P3_Test.md
    ├── P0P4_Test.md
    ├── P0P5_Test.md
    ├── P0P6_Test.md
    ├── P0_Complete_Beginner_Guide.md
    ├── P1P1_Test.md
    ├── 1-2 P1P2.md
    ├── 1-3 P1P3.md
    ├── 1-4 P1P4.md
    └── 1-5 P1P5.md
```

---

## scripts/

```
scripts/
├── migrate.sh                  – Run Prisma migrations against production DB
├── seed-benchmark-data.ts      – Seed large dataset for performance benchmarks
└── seed-pilot.ts               – Seed initial data for pilot client demo
```

---

## Key Concepts & Cross-Cutting Concerns

| Concern | Location |
|---|---|
| Authentication (NextAuth v4, JWT, magic links) | `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/` |
| Route protection (Edge middleware) | `apps/web/src/middleware.ts` |
| Permission system (PBAC, 47 permissions) | `packages/types/src/index.ts`, `packages/core/src/index.ts` |
| Multi-tenant database client | `packages/db/src/client.ts` |
| Database schema (Prisma) | `packages/db/prisma/schema.prisma` |
| Audit vault (immutable event log) | `packages/core/src/audit-vault.ts`, `apps/web/src/app/api/audit-vault/` |
| PDF watermarking (child process) | `packages/core/src/watermark.ts`, `apps/worker/src/scripts/watermark-child.js` |
| Background jobs (BullMQ) | `apps/worker/src/workers/`, `apps/worker/src/crons/` |
| Email templates (React Email + Resend) | `packages/emails/src/` |
| Offline / PWA support | `apps/web/src/lib/offline-db.ts`, `apps/web/src/components/offline/` |
| Rate limiting (Upstash Redis) | `packages/core/src/rate-limit.ts` |
| Storage (Cloudflare R2) | `packages/core/src/r2.ts` |
| Billing (Stripe) | `packages/core/src/stripe.ts`, `apps/web/src/app/api/billing/`, `apps/web/src/app/api/webhooks/stripe/` |
| SCIM provisioning | `apps/web/src/app/api/scim/`, `apps/worker/src/workers/scim.worker.ts` |
| Document search (pg_trgm + Fuse.js) | `packages/core/src/search.ts`, `apps/web/src/hooks/use-search.ts` |
| QR verification | `packages/core/src/qr-verification.ts`, `apps/web/src/app/(public)/verify/` |
