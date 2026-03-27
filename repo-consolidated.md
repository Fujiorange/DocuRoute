# DocuRoute - Repository Consolidated Documentation

**Last Updated:** March 27, 2026
**Status:** Production Ready (Phase 1 Complete)
**Branch:** `claude/replace-nodejs-pdf-watermarking`

---

## Executive Summary

DocuRoute is a **production-ready document management SaaS** for regulated heavy industries (shipbuilding, offshore oil & gas, aerospace). It provides enterprise-grade document control with audit trails, compliance features, and industry-specific workflows.

**Key Differentiators:**
- ISO 9001 compliant with immutable audit vault
- Multi-tenant PostgreSQL with Row-Level Security
- Hybrid PBAC authorization model (41 granular permissions + 6 system roles)
- PDF watermarking for large files (200MB+) via Go microservice
- Equipment tag format validation for engineering disciplines
- Classification society integration ready (ABS, DNV, LR, BV)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Authorization Model](#authorization-model)
5. [Core Features](#core-features)
6. [API Endpoints](#api-endpoints)
7. [Background Jobs](#background-jobs)
8. [Deployment Architecture](#deployment-architecture)
9. [Security & Compliance](#security--compliance)
10. [Development Guide](#development-guide)

---

## Architecture Overview

### Monorepo Structure

DocuRoute uses **pnpm + Turborepo** for monorepo management:

```
docuroute/
├── apps/
│   ├── web/              # Next.js 15 frontend + API routes
│   ├── worker/           # BullMQ background job processor (Node.js)
│   └── pdf-worker/       # Go microservice for PDF watermarking
├── packages/
│   ├── db/               # Prisma schema + PostgreSQL client
│   ├── core/             # Business logic (36 modules)
│   ├── types/            # Shared TypeScript types
│   └── emails/           # React Email templates
└── docs/                 # Documentation files
```

**Build System:**
- **Package Manager:** pnpm 10.32.1
- **Build Orchestrator:** Turborepo 2.8.16
- **Language:** TypeScript 5
- **Runtime:** Node.js 20+

### Service Architecture

```mermaid
graph TD
    A[Next.js Web App] -->|HTTP| B[PostgreSQL + RLS]
    A -->|Queue Jobs| C[Redis/BullMQ]
    A -->|Upload/Download| D[Cloudflare R2]
    E[BullMQ Worker] -->|Process Jobs| C
    E -->|Watermark PDFs| F[Go PDF Worker]
    F -->|Read/Write| D
    E -->|Send Emails| G[Resend]
    E -->|Write Logs| B
    H[Cron Jobs] -->|Scheduled Tasks| B
```

**Key Services:**
1. **Next.js Web App** - Frontend UI + API routes (Vercel)
2. **BullMQ Worker** - Background job processing (Render)
3. **Go PDF Worker** - Large PDF watermarking with Ghostscript (Render)
4. **PostgreSQL** - Multi-tenant database with RLS (Supabase)
5. **Redis** - Job queue + caching (Upstash)
6. **R2** - Object storage for documents (Cloudflare)

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15.3.9 (App Router, React 18, React Server Components)
- **UI Library:** shadcn/ui (Radix primitives + Tailwind CSS 3.4)
- **State Management:** TanStack Query (React Query) for server state
- **Forms:** React Hook Form + Zod validation
- **Tables:** TanStack React Table
- **Styling:** Tailwind CSS with custom design tokens
- **PDF Viewer:** pdfjs-dist for in-browser PDF rendering
- **QR Codes:** qrcode library for field safety
- **Notifications:** Sonner toast library
- **Offline:** Dexie (IndexedDB) + Workbox (PWA)
- **Testing:** Playwright (E2E), Vitest (unit)

### Backend
- **Framework:** Next.js 15 API Routes (App Router)
- **ORM:** Prisma 6.2 with PostgreSQL
- **Authentication:** NextAuth v4.24.13 (stable, JWT strategy)
- **Background Jobs:** BullMQ 5.x + ioredis 5.x
- **Worker Pool:** workerpool for CPU-intensive tasks
- **File Storage:** Cloudflare R2 (S3-compatible API)
- **Email:** Resend API with React Email templates
- **Payments:** Stripe SDK for subscriptions
- **Rate Limiting:** Upstash Redis (REST API)
- **Caching:** Upstash Redis (direct protocol) + in-memory
- **Key Management:** AWS KMS (optional)

### Microservices
- **PDF Worker:** Go 1.21 + Ghostscript 10.x
  - HTTP server on port 8080
  - Handles PDFs up to 500MB
  - Direct R2 integration
  - QR code generation

### Infrastructure
- **Deployment:** Render (backend services) + Vercel (frontend)
- **Database:** PostgreSQL 15+ (Supabase)
- **Cache/Queue:** Upstash Redis (dual protocol: direct + REST)
- **Storage:** Cloudflare R2
- **CDN:** Cloudflare
- **Container:** Docker (multi-stage builds)

---

## Database Schema

### Models (15 tables)

#### Core Multi-Tenancy
1. **Company** - Tenant root entity
   - Fields: name, slug, planTier, features, securitySettings
   - Relations: users, roles, projects, documents

2. **User** - Multi-tenant users
   - Fields: email, name, companyId, roleId, isActive, mfaEnabled
   - Relations: company, role

3. **Role** - System + custom roles
   - Fields: name, isSystemRole, systemRoleKey, permissions[]
   - Relations: company, users

#### Document Management
4. **Project** - Document grouping
   - Fields: name, tagFormatId
   - Relations: company, documents, tagFormat, bimWatchFolder

5. **Document** - Primary document entity
   - Fields: filename, fileKey, fileSize, sha256Hash, discipline, issuePurpose, status, watermarkStatus
   - Relations: company, project

6. **DocumentRevision** - Revision tracking
   - Fields: revisionCode, fileKey, watermarkStatus, watermarkFileKey
   - Relations: company

#### Compliance & Audit
7. **AuditLog** - Standard audit logging
   - Fields: action, resourceType, resourceId, permissionsUsed, metadata
   - Relations: company

8. **AuditVaultEntry** - Immutable compliance vault
   - Fields: eventType, userEmail, documentFingerprint, hash
   - **CRITICAL:** INSERT-only enforced by database trigger
   - Relations: company

#### User Management
9. **Invitation** - Email-based user invites
   - Fields: email, token, expiresAt, acceptedAt
   - No relations (pre-user creation)

10. **Notification** - User notifications
    - Fields: type, title, message, isRead
    - Relations: company

#### Industry Features
11. **EquipmentTagFormat** - Naming conventions
    - Fields: pattern, rules, isDefault
    - Relations: company, projects

12. **BIMWatchFolder** - Automated CSV import
    - Fields: folderPath, enabled, lastPolledAt
    - Relations: company, project

13. **ClassSocietySubmission** - Classification society packages
    - Fields: societyCode, packageTitle, status, classReferenceNumber, webhookReceivedAt, webhookPayload
    - Relations: company, project

#### Utility
14. **TransmittalCounter** - Sequential numbering
    - Composite key: companyId + year

15. **CompanyOnboarding** - Setup progress tracking
    - Fields: completedSteps[]
    - Relations: company

### Database Indexes

**Performance Indexes:**
- `pg_trgm` GIN index on `Document.filename` for fuzzy search
- GIN index on `Role.permissions` for permission queries
- Composite index on `Notification(userId, isRead, createdAt)` for unread queries
- Standard indexes on foreign keys and common query patterns

**Security:**
- Row-Level Security (RLS) policies on all multi-tenant tables
- Database triggers enforce companyId NOT NULL on INSERT
- Immutable audit vault trigger prevents UPDATE/DELETE on AuditVaultEntry

---

## Authorization Model

### Hybrid PBAC + System Roles

DocuRoute uses a **Permission-Based Access Control (PBAC)** model with immutable system roles for compliance.

#### Permission Enum (41 permissions)

All authorization checks reference the `Permission` enum:

**Document Operations:**
- UPLOAD_DOCUMENT
- VIEW_DOCUMENT
- DOWNLOAD_DOCUMENT
- DELETE_DOCUMENT
- ARCHIVE_DOCUMENT
- HARD_PURGE_DOCUMENT
- EDIT_DOCUMENT_METADATA

**Naming & Classification:**
- VALIDATE_NAMING_MASK
- CONFIGURE_NAMING_MASK

**MDR & Bulk Operations:**
- IMPORT_MDR
- BULK_OPERATION
- UNDO_BULK_OPERATION

**Workflows:**
- START_WORKFLOW
- APPROVE_WORKFLOW
- REJECT_WORKFLOW
- FORCE_UNLOCK_WORKFLOW
- MANAGE_WORKFLOW_TEMPLATES

**Transmittals:**
- CREATE_TRANSMITTAL
- SEND_TRANSMITTAL
- VIEW_TRANSMITTAL

**User Management:**
- INVITE_USERS
- MANAGE_USERS
- DEACTIVATE_USERS
- MANAGE_CUSTOM_ROLES

**Legal & Compliance:**
- PLACE_LEGAL_HOLD
- LIFT_LEGAL_HOLD
- BYPASS_LEGAL_HOLD
- CONFIGURE_RETENTION
- VIEW_AUDIT_LOG
- EXPORT_AUDIT_VAULT
- MANAGE_LEGAL_HOLDS

**Security:**
- CONFIGURE_SSO
- MANAGE_SCIM
- CREATE_API_KEY
- REVOKE_API_KEY
- MANAGE_SERVICE_ACCOUNTS

**Billing:**
- MANAGE_BILLING
- TRANSFER_OWNERSHIP
- CONFIGURE_SUCCESSION

**Platform (Admin Only):**
- PLATFORM_ADMIN_ACCESS
- EMERGENCY_TRANSFER

#### System Roles (Immutable)

Six hardcoded roles required for ISO 9001 compliance:

1. **PLATFORM_ADMIN** - Anthropic/DocuRoute staff
   - All permissions except company-specific operations
   - Emergency ownership transfer

2. **COMPANY_OWNER** - Company founder/owner
   - All permissions except PLATFORM_ADMIN_ACCESS
   - Cannot be deleted or demoted

3. **COMPANY_ADMIN** - IT administrators
   - User/role management, SSO, billing
   - No document operations

4. **DOCUMENT_CONTROLLER** - Quality team
   - Full document lifecycle control
   - Workflow approval, transmittals
   - Compliance reporting

5. **AUDITOR** - Compliance officers
   - Read-only access to audit logs
   - Export audit vault
   - Cannot modify documents

6. **BILLING_CONTACT** - Finance team
   - Billing portal access only
   - View invoices, update payment methods

#### Custom Roles (Database-Driven)

Companies can create custom roles with any subset of permissions:

```typescript
// Example: Field Engineer role
{
  name: "Field Engineer",
  permissions: [
    Permission.VIEW_DOCUMENT,
    Permission.DOWNLOAD_DOCUMENT,
    Permission.VALIDATE_NAMING_MASK
  ]
}
```

**Constraints:**
- Custom roles gated by `customRoles` feature flag
- Cannot assign PLATFORM_ADMIN_ACCESS
- Permission changes tracked in audit vault

---

## Core Features

### 1. Document Management

#### Upload & Storage
- **Direct-to-R2 uploads** via presigned URLs (no backend proxy)
- **File size limit:** 500MB (configurable)
- **SHA-256 verification** ensures file integrity
- **Virus scanning** integration ready (status: PENDING/CLEAN/INFECTED)
- **Metadata extraction** from PDF files

#### PDF Watermarking
- **Go microservice** with Ghostscript for large files (200MB+)
- **QR codes** embedded for field safety verification
- **Watermark bypass** for construction drawings >200MB (acknowledged by user)
- **Async processing** via BullMQ queue
- **Status tracking:** PENDING → PROCESSING → COMPLETED/FAILED

#### Versioning
- **DocumentRevision** model tracks all versions
- **Supersede/Void** workflow for revision control
- **Status tracking:** ACTIVE, SUPERSEDED, DELETED, QUARANTINED, ARCHIVED

#### Search
- **Fuzzy search** using PostgreSQL `pg_trgm` extension
- **Performance:** <500ms for 100,000+ documents
- **Filters:** project, discipline, status, date range
- **UI:** Global search with Cmd+K/Ctrl+K shortcut, 300ms debounce

### 2. Multi-Tenant Security

#### Row-Level Security (RLS)
- **PostgreSQL RLS policies** filter all queries by companyId
- **SET LOCAL** session variable sets current company context
- **Works in transactions** (critical fix implemented)
- **Database triggers** enforce companyId NOT NULL on INSERT
- **Fail-safe:** Returns empty result set if companyId not set

#### RLS Transaction Safety
```sql
-- Trigger prevents NULL companyId
CREATE TRIGGER enforce_company_id_document
BEFORE INSERT ON "Document"
FOR EACH ROW EXECUTE FUNCTION enforce_company_id();

-- RLS policy filters by company
CREATE POLICY "Document_select_policy" ON "Document"
FOR SELECT USING ("companyId" = current_setting('app.current_company_id')::text);
```

**Three-Layer Defense:**
1. RLS policies (database level)
2. Database triggers (prevent NULL inserts)
3. Development middleware (catch errors early)

### 3. Compliance & Audit

#### Audit Logging
- **AuditLog** - Standard mutable audit trail
- **AuditVaultEntry** - Immutable compliance vault
  - INSERT-only enforced by database trigger
  - SHA-256 hash integrity
  - Cannot be modified or deleted

#### Legal Holds
- **Place/lift holds** on documents
- **Retention override** - held documents never purged
- **Audit trail** tracks all hold operations

#### Retention Policies
- **Configurable per company** (default: 90 days)
- **Recycle bin** soft-delete with restore window
- **Hard purge** after retention period
- **Dry-run mode** previews actions before execution

### 4. Workflows & Approvals

#### Multi-Stage Workflows
- **Configurable approval chains** (review → approval → release)
- **Role-based stages** tied to permissions
- **Parallel approvals** supported
- **Timeout handling** with escalation
- **Status tracking:** DRAFT → IN_REVIEW → APPROVED/REJECTED

#### Workflow Templates
- **Reusable sequences** (Internal Review, Client Approval, Regulatory Submission)
- **Company-level** or project-level templates
- **Stage configuration:**
  - Stage number, name, type (REVIEW/APPROVAL)
  - Required permission for action
  - Number of approvals needed
  - Timeout hours

### 5. Industry-Specific Features

#### Engineering Disciplines
12 disciplines supported:
- PIPING, STRUCTURAL, ELECTRICAL, HVAC, MECHANICAL, INSTRUMENTATION
- CIVIL, ARCHITECTURAL, PROCESS, SAFETY, MARINE, GENERAL

#### Issue Purpose (Document Status)
- FOR_INFORMATION
- FOR_TENDER
- FOR_REVIEW
- FOR_APPROVAL
- FOR_CONSTRUCTION (watermark bypass allowed)
- AS_BUILT
- SUPERSEDED
- VOID

#### Equipment Tag Formats
- **Company-level** default naming conventions
- **Project-level overrides** (vessel vs FPSO)
- **Pattern validation** with regex rules
- **Example pattern:** `{discipline}-{area}-{type}-{sequence:4d}`
- **Validation rules** in JSON format

#### BIM Automated Watch Folders
- **Continuous polling** every 15 minutes
- **CSV import** from network folders
- **Conflict detection** and reporting
- **Email notifications** to platform admin
- **File archiving** after processing

#### Classification Society Integration
**Phase 3 Ready** - Webhook architecture for:
- **ABS** (American Bureau of Shipping) - MyFreedom API
- **DNV** (Det Norske Veritas) - Veristar Portal
- **LR** (Lloyd's Register) - MOVE Portal
- **BV** (Bureau Veritas) - Approval Explorer

**Current Features:**
- Manual package generation and download
- Reference number tracking
- Webhook endpoint for status updates
- Background status polling (6-hour fallback)

### 6. Authentication & User Management

#### NextAuth v4 Integration
- **JWT strategy** with 30-day sessions
- **Magic link** email authentication
- **MFA support** with TOTP (2FA)
- **Session management** with configurable timeout
- **Middleware protection** on all /dashboard/* and /api/* routes

#### User Invitations
- **Email-based** with token expiration
- **Role assignment** during invite
- **Rate limiting** (3 invites per 24 hours)
- **React Email** templates for branding

#### SCIM v2 Integration
- **SSO provisioning** from identity providers
- **User lifecycle** management (create, update, deactivate)
- **Automatic deprovisioning** preserves audit trail
- **Standard SCIM endpoints** for enterprise SSO

### 7. Billing & Subscriptions

#### Stripe Integration
- **Subscription management** (PILOT, PRO, ENTERPRISE)
- **Customer portal** for self-service
- **Webhook handling** for subscription events
- **Usage tracking** for storage and API calls

#### Plan Tiers
- **PILOT:** Free tier with limited features
- **PRO:** Custom roles, advanced workflows
- **ENTERPRISE:** SCIM, dedicated support, SLA

#### Feature Flags
Stored in `Company.features` JSON field:
```json
{
  "customRoles": true,
  "advancedWorkflows": true,
  "scim": false
}
```

---

## API Endpoints

### Document Operations
- `POST /api/upload/presign` - Get presigned URL for upload
- `POST /api/upload/confirm` - Confirm upload, trigger watermark
- `GET /api/documents` - List documents with filters
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Soft delete document
- `POST /api/documents/search` - Fuzzy search
- `GET /api/documents/[id]/verify` - QR verification (public)
- `POST /api/documents/bulk` - Bulk operations (delete, archive)
- `POST /api/documents/bulk/[id]/undo` - Undo bulk operation

### User & Role Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Deactivate user
- `POST /api/invitations` - Send invite
- `GET /api/roles` - List roles
- `POST /api/roles` - Create custom role (feature-gated)
- `PATCH /api/roles/[id]` - Update role
- `DELETE /api/roles/[id]` - Delete role

### Workflows
- `POST /api/workflows/start` - Start workflow
- `POST /api/workflows/[id]/approve` - Approve stage
- `POST /api/workflows/[id]/reject` - Reject stage
- `GET /api/workflows` - List workflows
- `GET /api/workflows/templates` - List templates

### Transmittals
- `GET /api/transmittals` - List transmittals
- `POST /api/transmittals` - Create transmittal
- `GET /api/transmittals/[id]` - Get transmittal details

### Compliance
- `GET /api/audit-log` - Query audit log
- `GET /api/audit-vault` - Query immutable vault
- `POST /api/audit-vault/export` - Export vault records
- `POST /api/legal-holds` - Create legal hold
- `GET /api/legal-holds` - List legal holds

### Company Settings
- `GET /api/company` - Get company settings
- `PATCH /api/company` - Update settings
- `POST /api/company/transfer-ownership` - Transfer ownership
- `GET /api/company/onboarding` - Onboarding progress

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout session
- `POST /api/billing/portal` - Get customer portal URL

### Authentication
- `POST /api/auth/signin` - Magic link signin
- `POST /api/auth/callback` - Auth callback
- `GET /api/auth/session` - Get session

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook events
- `POST /api/webhooks/classification-society` - Society status updates

### Service Accounts (API Keys)
- `GET /api/service-accounts` - List service accounts
- `POST /api/service-accounts` - Create service account
- `POST /api/service-accounts/[id]/keys` - Generate API key
- `DELETE /api/service-accounts/[id]/keys/[keyId]` - Revoke key

### SCIM v2
- `POST /api/scim/v2/Users` - Create user
- `GET /api/scim/v2/Users` - List users
- `GET /api/scim/v2/Users/[id]` - Get user
- `PATCH /api/scim/v2/Users/[id]` - Update user
- `DELETE /api/scim/v2/Users/[id]` - Deactivate user

### Health & Monitoring
- `GET /api/health` - Health check
- `GET /api/admin/queue-status` - BullMQ metrics

---

## Background Jobs

### BullMQ Workers

#### Watermark Worker
- **Queue:** `watermark`
- **Concurrency:** 4 workers
- **Rate limit:** 20 jobs/minute
- **Timeout:** 5 minutes per job
- **Retry:** Exponential backoff (1s → 2s → 4s → ... → 30s max)
- **Process:**
  1. Fetch document metadata from database
  2. Call Go PDF worker via HTTP
  3. Update watermarkStatus and watermarkFileKey
  4. Handle errors with retry logic

#### Email Worker (Future)
- **Queue:** `email`
- **Jobs:** Invitations, password resets, notifications
- **Provider:** Resend API

#### SCIM Worker
- **Queue:** `scim-user-{userId}` (per-user queues)
- **Concurrency:** 1 (sequential per user)
- **Operations:** CREATE, UPDATE, DELETE
- **Ensures:** Sequential processing of user lifecycle events

### Scheduled Cron Jobs

**Vercel Crons (via Next.js API routes):**
- `0 1 * * *` - Storage meter (daily at 1 AM)
- `0 4 * * 0` - Key rotation (weekly, Sunday 4 AM)
- `*/15 * * * *` - Ownership transfer polling (every 15 minutes)
- `0 9 * * *` - Key expiry checks (daily at 9 AM)
- `0 5 * * *` - Watermark cleanup (daily at 5 AM)
- `0 * * * *` - Workflow timeout (hourly)

**Render Crons (standalone Node.js processes):**
- `0 2 * * *` - Retention enforcement (daily at 2 AM)
- `0 3 * * *` - Vault integrity checks (daily at 3 AM)

**Worker Crons (BullMQ recurring jobs):**
- `*/15 * * * *` - BIM watch folder polling (every 15 minutes)
- `0 */6 * * *` - Classification society status polling (every 6 hours)

---

## Deployment Architecture

### Production Environment

#### Vercel (Frontend + API)
- **Service:** Next.js application
- **Plan:** Pro or Enterprise
- **Features:**
  - Edge functions for authentication
  - API routes for document operations
  - 6 scheduled cron jobs
  - Environment: Node.js 20+
- **Build Command:**
  ```bash
  pnpm install && pnpm --filter @docuroute/db exec prisma generate && pnpm --filter web build
  ```

#### Render (Backend Services)

**1. PDF Worker (Docker)**
- **Runtime:** Go 1.21 + Ghostscript
- **Port:** 8080
- **Plan:** Standard (1GB RAM)
- **Health Check:** `/health`
- **Environment:**
  - R2_* credentials
  - QR_VERIFICATION_BASE_URL

**2. BullMQ Worker (Node.js)**
- **Runtime:** Node.js 20
- **Plan:** Standard (2GB RAM)
- **Build Command:**
  ```bash
  pnpm install
  pnpm --filter @docuroute/db exec prisma generate
  pnpm --filter @docuroute/worker build
  ```
- **Start Command:** `pnpm --filter @docuroute/worker start`
- **Health Check:** `/health` on port 3001
- **Environment:**
  - DATABASE_URL, REDIS_URL
  - R2_*, AWS_*, RESEND_*, PDF_WORKER_URL

**3. Retention Cron (Node.js)**
- **Runtime:** Node.js 20
- **Schedule:** `0 2 * * *` (daily at 2 AM)
- **Plan:** Starter (512MB RAM)
- **Build:** Same as worker
- **Start:** `node apps/worker/dist/crons/retention.js`

**4. Vault Integrity Cron (Node.js)**
- **Runtime:** Node.js 20
- **Schedule:** `0 3 * * *` (daily at 3 AM)
- **Plan:** Starter (512MB RAM)
- **Build:** Same as worker
- **Start:** `node apps/worker/dist/crons/vault-integrity.js`

### Infrastructure Dependencies

**PostgreSQL (Supabase):**
- **Version:** 15+
- **Extensions:** pg_trgm, uuid-ossp
- **RLS:** Enabled on all multi-tenant tables
- **Connection pooling:** PgBouncer via DIRECT_URL

**Redis (Upstash):**
- **Protocol:** Direct (redis://) for BullMQ
- **REST API:** HTTP for rate limiting and caching
- **Latency:** <5ms (direct), 10-30ms (REST)
- **Persistence:** AOF enabled

**Cloudflare R2:**
- **Bucket:** Single bucket for all files
- **Key format:** `documents/{companyId}/{fileKey}`
- **Access:** Presigned URLs (15-minute expiry for upload, 1-hour for download)
- **Backup:** Versioning enabled

**AWS KMS (Optional):**
- **Purpose:** Document encryption key management
- **Usage:** Encrypt/decrypt document metadata
- **Fallback:** Local encryption if KMS unavailable

### Environment Variables

**Critical (Required):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db?pgbouncer=false

# Redis
REDIS_URL=redis://default:pass@host:6379
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...

# Authentication
NEXTAUTH_URL=https://app.docuroute.com
NEXTAUTH_SECRET=... (32+ characters)

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@docuroute.com

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Internal Services
PDF_WORKER_URL=http://docuroute-pdf-worker:8080
```

**Optional:**
```bash
# KMS
AWS_KMS_KEY_ARN=arn:aws:kms:...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Monitoring
PLATFORM_ADMIN_EMAIL=admin@docuroute.com
CRON_SECRET=... (for cron authentication)

# Webhooks
CLASS_SOCIETY_WEBHOOK_SECRET=... (32+ characters)

# Phase 3 (Society APIs)
ABS_API_KEY=... (placeholder)
DNV_API_KEY=... (placeholder)
LR_API_KEY=... (placeholder)
BV_API_KEY=... (placeholder)
```

---

## Security & Compliance

### Authentication & Authorization

**Authentication:**
- Magic link email (passwordless)
- MFA with TOTP (optional per user)
- JWT tokens (30-day expiry)
- Session middleware on all protected routes

**Authorization:**
- Permission-based access control (41 permissions)
- Permission caching in Redis (60-minute TTL)
- Live permission checks for sensitive operations
- Audit trail for all permission denials

**Session Security:**
- HTTP-only cookies
- Secure flag in production
- SameSite=Lax for CSRF protection
- Session timeout (configurable per company)

### Data Protection

**Encryption:**
- TLS 1.3 for all connections
- Encrypted at rest (PostgreSQL + R2)
- Optional KMS for document encryption
- SHA-256 file integrity verification

**Multi-Tenancy:**
- Row-Level Security (RLS) on all tables
- Database triggers prevent cross-tenant access
- Fail-safe: Empty result set if companyId missing
- Transaction safety with SET LOCAL

**Audit Trail:**
- AuditLog for standard operations
- AuditVaultEntry for compliance events (immutable)
- SHA-256 hash integrity for vault entries
- Database trigger prevents tampering

### Compliance Features

**ISO 9001 Ready:**
- Named system roles (DOCUMENT_CONTROLLER, AUDITOR)
- Immutable audit vault
- Legal hold support
- Retention policy enforcement

**GDPR Support:**
- User data export
- Right to be forgotten (with audit trail)
- Consent tracking
- Data processing agreements

**SOC 2 Ready:**
- Access controls with permission model
- Audit logging for all operations
- Encryption at rest and in transit
- Backup and disaster recovery

---

## Development Guide

### Prerequisites

- Node.js 20+
- pnpm 10.32.1
- PostgreSQL 15+
- Redis 7+
- Go 1.21+ (for PDF worker)

### Local Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/your-org/docuroute.git
   cd docuroute
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment:**
   ```bash
   # Copy example env files
   cp apps/web/.env.example apps/web/.env.local
   cp apps/worker/.env.example apps/worker/.env.local

   # Edit .env.local files with your credentials
   ```

4. **Database setup:**
   ```bash
   # Generate Prisma client
   pnpm --filter @docuroute/db exec prisma generate

   # Run migrations
   pnpm --filter @docuroute/db exec prisma migrate dev

   # Run post-migration SQL (in Supabase SQL editor)
   # See docs/DEPLOYMENT_CHECKLIST.md
   ```

5. **Start services:**
   ```bash
   # Start all services in dev mode
   pnpm dev

   # Or start individually:
   pnpm --filter web dev          # Next.js on :3000
   pnpm --filter @docuroute/worker dev  # Worker on :3001
   cd apps/pdf-worker && go run main.go # PDF worker on :8080
   ```

### Build Commands

**Generate Prisma Client:**
```bash
pnpm --filter @docuroute/db exec prisma generate
```

**Build all packages:**
```bash
pnpm build
```

**Build specific package:**
```bash
pnpm --filter web build
pnpm --filter @docuroute/worker build
```

**Run tests:**
```bash
pnpm test
```

### Database Migrations

**Create migration:**
```bash
pnpm --filter @docuroute/db exec prisma migrate dev --name add_feature
```

**Apply migrations (production):**
```bash
pnpm --filter @docuroute/db exec prisma migrate deploy
```

**Reset database (dev only):**
```bash
pnpm --filter @docuroute/db exec prisma migrate reset
```

### Docker Build

**Build Next.js app:**
```bash
docker build -t docuroute-web -f Dockerfile .
docker run -p 3000:3000 docuroute-web
```

**Build PDF worker:**
```bash
cd apps/pdf-worker
docker build -t docuroute-pdf-worker .
docker run -p 8080:8080 docuroute-pdf-worker
```

---

## Project Status & Roadmap

### Phase 1 (Complete) ✅

- ✅ Document upload/download with R2
- ✅ PDF watermarking with Go microservice
- ✅ Multi-tenant RLS with transaction safety
- ✅ Permission-based access control (41 permissions)
- ✅ Audit logging with immutable vault
- ✅ Legal holds and retention policies
- ✅ Workflow approval chains
- ✅ Transmittals
- ✅ Equipment tag format validation
- ✅ BIM automated watch folders
- ✅ Classification society webhook readiness
- ✅ QR field safety verification
- ✅ SCIM v2 integration
- ✅ Stripe billing
- ✅ PWA offline support

### Phase 2 (Planned)

- ⏳ Equipment hierarchy management
- ⏳ Vendor/contractor management
- ⏳ Advanced workflow templates
- ⏳ Custom fields and metadata
- ⏳ Reporting dashboard
- ⏳ Mobile app (React Native)

### Phase 3 (Future)

- 🔮 Classification society API integration (when available)
- 🔮 Advanced analytics
- 🔮 AI document classification
- 🔮 Real-time collaboration
- 🔮 Mobile-first field app

---

## Documentation Files

### Technical Documentation
- **CLASSIFICATION_SOCIETY_WEBHOOKS.md** - Webhook architecture for ABS/DNV/LR/BV
- **PDF_PROCESSING_GHOSTSCRIPT.md** - Go microservice architecture
- **BIM_WATCH_FOLDER.md** - Automated CSV import system
- **RLS_TRANSACTION_SAFETY.md** - Multi-tenant isolation guarantees
- **TAG_FORMAT_PROJECT_OVERRIDE.md** - Equipment naming conventions
- **DEPLOYMENT_BUILD.md** - Build pipeline and Prisma generate
- **REDIS_PROTOCOL.md** - Direct vs REST API usage

### Planning Documents
- **DocuRouteP0P1.md** - Phase 0/1 complete summary (50KB)
- **Phase2Plan.md** - Equipment hierarchy roadmap (118KB)
- **doc/plan/P2P*.md** - Individual Phase 2 feature plans

### Deployment Guides
- **LAUNCH_GUIDE.md** - Comprehensive setup guide (27KB)
- **README.md** - Quick start guide
- **render.yaml** - Render service configuration
- **vercel.json** - Vercel deployment + crons
- **Dockerfile** - Multi-stage production build

---

## Key Architectural Decisions

### 1. Multi-Tenancy with RLS
**Decision:** Use PostgreSQL Row-Level Security instead of application-level filtering.

**Rationale:**
- Database-level enforcement prevents human error
- Works across all queries including raw SQL
- Transaction-safe with SET LOCAL
- Fail-safe design (empty results if companyId missing)

### 2. Immutable Audit Vault
**Decision:** Use database trigger to enforce INSERT-only on AuditVaultEntry.

**Rationale:**
- Regulatory compliance requires tamper-proof logs
- Database trigger cannot be bypassed by application
- SHA-256 hash integrity detection
- Required for ISO 9001, SOC 2, GDPR

### 3. Go Microservice for PDFs
**Decision:** Separate Go service with Ghostscript instead of Node.js pdf-lib.

**Rationale:**
- Node.js pdf-lib has 200MB memory limit
- Ghostscript handles 500MB+ PDFs efficiently
- 5-10x performance improvement
- Eliminates OOM crashes on complex drawings

### 4. Direct Redis Protocol for BullMQ
**Decision:** Use direct Redis protocol (redis://) for job queue, REST API for rate limiting.

**Rationale:**
- Direct protocol: <5ms latency for job processing
- REST API: 10-30ms acceptable for rate limiting
- BullMQ requires direct protocol for performance
- Upstash supports both protocols

### 5. Permission Caching
**Decision:** Cache permissions in Redis with 60-minute TTL.

**Rationale:**
- Reduces database load (every API call checks permissions)
- JWT stores permissionVersion instead of full array
- Reduces JWT size from 1,440 bytes to 400 bytes
- Cache invalidation via version increment

---

## Support & Contributing

### Getting Help
- **Documentation:** `/docs` directory
- **Issues:** GitHub Issues
- **Email:** support@docuroute.com

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- TypeScript strict mode
- Prettier for formatting
- ESLint for linting
- Conventional commits

---

## License

Proprietary - All rights reserved

---

**End of Documentation**
