# DocuRoute - Complete Repository Summary (Phase 0 & Phase 1)

## Table of Contents
1. [Project Overview](#project-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Core Architecture](#core-architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Key Components](#key-components)
7. [Business Logic](#business-logic)
8. [Technology Stack](#technology-stack)
9. [Deployment Architecture](#deployment-architecture)
10. [Security & Compliance](#security--compliance)

---

## Project Overview

**DocuRoute** is a document management SaaS platform designed for regulated heavy industries (marine, engineering, construction). It provides ISO 9001-compliant document control with:

- **Multi-tenant architecture** with row-level security (RLS)
- **Hybrid PBAC (Permission-Based Access Control)** with 41 granular permissions
- **Immutable audit vault** for compliance logging
- **PDF watermarking** with QR code verification for field safety
- **Workflow approvals** with multi-stage review processes
- **Document transmittals** for controlled document exchange
- **Legal holds** and retention policies for regulatory compliance
- **PWA support** for offline document access

**Key Principles:**
- Compliance-first design for ISO 9001, ISO 19650, and regulatory audits
- Permission enum drives ALL authorization checks
- System roles are immutable; custom roles are database-driven
- Audit vault entries are immutable (enforced by database trigger)
- Field safety validation for construction documents

---

## Monorepo Structure

```
/home/runner/work/DocuRoute/DocuRoute/
├── apps/
│   ├── web/                    # Next.js 15 frontend + API routes (203 TypeScript files)
│   │   ├── src/app/           # App Router pages and API routes
│   │   │   ├── (auth)/        # Authentication pages (login, accept-invite)
│   │   │   ├── (dashboard)/   # Protected dashboard routes
│   │   │   ├── (public)/      # Public routes (QR verification)
│   │   │   └── api/           # 67 REST API endpoints
│   │   ├── src/components/    # 76 React components
│   │   ├── src/hooks/         # 10 custom React hooks
│   │   ├── src/lib/           # Utilities and helpers
│   │   └── src/types/         # TypeScript type definitions
│   └── worker/                 # Background job processor (BullMQ)
│       ├── src/workers/       # Watermark and SCIM workers
│       └── src/crons/         # Retention and vault integrity crons
├── packages/
│   ├── core/                  # Business logic (25+ files, NO React imports)
│   │   ├── src/               # Utilities, audit, watermark, R2, QR, notifications
│   │   ├── queries/           # Query builders (placeholder)
│   │   └── validations/       # Zod schemas (placeholder)
│   ├── db/                    # Prisma client and schema
│   │   ├── prisma/schema.prisma  # 11 database models
│   │   └── src/client.ts      # Company-scoped Prisma client
│   ├── types/                 # Shared TypeScript types and enums
│   │   └── index.ts           # 41 permissions, 6 system roles, industry enums
│   └── emails/                # React Email templates
├── scripts/                   # Deployment and utility scripts
├── public/                    # Static assets
├── docs/                      # Documentation (Phase2Plan.md retained)
└── Configuration files:
    ├── pnpm-workspace.yaml    # Monorepo packages
    ├── turbo.json             # Turborepo build orchestration
    ├── vercel.json            # Vercel deployment + 6 cron jobs
    └── render.yaml            # Render deployment + worker + 2 cron jobs
```

**Build System:**
- **pnpm 10.32** - Package manager with workspaces
- **Turborepo 2.8** - Monorepo build orchestration
- **Tasks:** build, dev, lint, typecheck, test

---

## Core Architecture

### Multi-Tenancy Model

**Row-Level Security (RLS) Approach:**
- PostgreSQL RLS policies filter by `current_setting('app.current_company_id')`
- `getPrismaForCompany(companyId)` sets `SET LOCAL` for session-scoped filtering
- `prismaAdmin` provides direct access for cross-company queries (auth, admin)

**Company Isolation:**
- All queries automatically filtered by companyId
- Works inside transactions
- Fail-safe: Returns empty results if companyId not set

### Authorization Model

**Hybrid PBAC + System Roles:**

**41 Granular Permissions:**
```typescript
// Document permissions
UPLOAD_DOCUMENT, VIEW_DOCUMENTS, DOWNLOAD_DOCUMENT, DELETE_DOCUMENT,
ARCHIVE_DOCUMENT, RESTORE_DOCUMENT, HARD_PURGE_DOCUMENT, EDIT_DOCUMENT_METADATA,
BULK_OPERATIONS, UNDO_BULK_OPERATION, VALIDATE_NAMING_MASK,
CONFIGURE_NAMING_MASK, MDR_IMPORT

// Workflow permissions
START_WORKFLOW, APPROVE_WORKFLOW, REJECT_WORKFLOW, FORCE_UNLOCK_WORKFLOW,
MANAGE_WORKFLOW_TEMPLATES

// Transmittal permissions
CREATE_TRANSMITTAL, SEND_TRANSMITTAL, VIEW_TRANSMITTALS

// User & role permissions
INVITE_USERS, MANAGE_USERS, DEACTIVATE_USERS, MANAGE_CUSTOM_ROLES

// Legal & compliance permissions
PLACE_LEGAL_HOLD, LIFT_LEGAL_HOLD, CONFIGURE_RETENTION, VIEW_AUDIT_LOG,
EXPORT_AUDIT_VAULT

// Security permissions
CONFIGURE_SSO, MANAGE_SCIM, CREATE_API_KEY, REVOKE_API_KEY,
ROTATE_API_KEY, VIEW_SERVICE_ACCOUNTS

// Billing & ownership permissions
MANAGE_BILLING, TRANSFER_OWNERSHIP, APPROVE_OWNERSHIP_TRANSFER,
CONFIGURE_SUCCESSION

// Platform admin permissions (DocuRoute staff only)
PLATFORM_ADMIN_ACCESS, EMERGENCY_OWNERSHIP_TRANSFER
```

**6 System Roles (Immutable, ISO-compliant):**
1. **PLATFORM_ADMIN** - DocuRoute staff (2 permissions)
2. **COMPANY_OWNER** - All permissions except platform-only (39 permissions)
3. **COMPANY_ADMIN** - User/role management, settings (32 permissions)
4. **DOCUMENT_CONTROLLER** - Document lifecycle, workflows (14 permissions)
5. **AUDITOR** - Read-only audit access (3-4 permissions)
6. **BILLING_CONTACT** - Billing only (2 permissions)

**Custom Roles:**
- Database-driven with Permission[] arrays
- Created via UI with granular permission selection
- Requires `MANAGE_CUSTOM_ROLES` permission

**Permission Caching (JWT Optimization):**
- JWT stores `permissionVersion` (integer) instead of Permission[] array
- Permissions cached in Redis: `permissions:{companyId}:{roleId}:v{version}`
- Cache TTL: 30 days (matches JWT maxAge)
- Invalidation: Increment `permissionVersion` on role change
- **Result:** JWT size reduced from ~1,440 bytes to ~400 bytes

### Authentication Flow

**NextAuth v4.24 (stable) with JWT strategy:**

1. **Magic Link Login:**
   - POST `/api/auth/signin/email` - Send magic link
   - GET `/api/auth/verify-request` - Check email prompt
   - Email contains token link: `/api/auth/callback/email?token=...`

2. **Session Creation (JWT callback):**
   ```typescript
   jwt: {
     userId, companyId, roleId, permissionVersion
   }
   session: {
     user: { id, name, email, companyId, roleId, permissions }
   }
   ```

3. **Middleware Protection:**
   - `/dashboard/*` - Redirect to login if unauthenticated
   - `/api/*` - Return 401 if unauthenticated
   - **Public routes:** `/api/auth/*`, `/api/health`, `/api/documents/*/verify`, `/verify/*`, `/acknowledge/*`
   - API keys (bearer tokens) pass through for service account validation

### Audit System

**Two-Tier Audit Logging:**

**1. AuditLog (Operational):**
- General operational audit trail
- 11 AuditAction types: USER_LOGIN, USER_LOGOUT, DOCUMENT_UPLOAD, DOCUMENT_DOWNLOAD, LEGAL_HOLD_PLACED, etc.
- Includes userId, ipAddress, userAgent, permissionsUsed, metadata
- Queryable, deletable (30-day retention typical)

**2. AuditVaultEntry (Compliance - IMMUTABLE):**
- Compliance-critical events only (12 types)
- **DATABASE TRIGGER** prevents UPDATE/DELETE
- SHA-256 hash verification with deterministic JSON serialization
- Hash chain: Each entry includes hash of previous entry
- Fields: userId, userEmail (snapshot), ipAddress, userAgent, documentFingerprint, metadata
- Export endpoint: `/api/audit-vault/export` for auditor review
- Daily integrity check cron verifies hash chain

**Event Types (AuditVaultEventType):**
```typescript
DOCUMENT_UPLOADED, DOCUMENT_DELETED, DOCUMENT_ARCHIVED, DOCUMENT_PURGED,
REVISION_UPLOADED, REVISION_DELETED, LEGAL_HOLD_PLACED, LEGAL_HOLD_LIFTED,
ROLE_PERMISSIONS_CHANGED, USER_ROLE_CHANGED, OWNERSHIP_TRANSFERRED,
VAULT_INTEGRITY_CHECK_FAILED
```

### File Processing Pipeline

**Upload Flow (3-Phase):**

**Phase 1: Presign** (`POST /api/upload/presign`)
- Validate file metadata (name, size, MIME type)
- Generate server-side fileKey: `{companyId}/{projectId}/{uuid}-{filename}`
- Check naming mask rules
- **Watermark size gate:** Warn if fileSize > 200MB AND issuePurpose === FOR_CONSTRUCTION
- Return presigned R2 URL (15-minute expiry)

**Phase 2: Client Upload**
- Direct PUT to R2 presigned URL
- Bypasses Next.js (saves bandwidth)

**Phase 3: Confirm** (`POST /api/upload/confirm`)
- Verify file exists in R2 (HEAD request)
- Calculate SHA-256 hash
- Create Document and DocumentRevision records
- **Watermark decision:**
  - Skip if: fileSize > 200MB AND acknowledgedWatermarkSkip === true
  - Skip if: issuePurpose !== FOR_CONSTRUCTION
  - Enqueue: BullMQ watermark job
- Write AuditVaultEntry
- Return documentId and revisionId

**Watermark Processing (Worker):**
- **Worker Pool:** 2 processes, 512MB each (prevents OOM)
- **File-based IPC:** Temp files instead of base64 encoding (33% memory savings)
- Libraries: pdf-lib (watermark text), qrcode (status QR)
- Watermark includes:
  - Document code, revision code, issue purpose
  - QR code linking to `/verify/{documentId}`
  - Company branding (if configured)
- Upload watermarked PDF to R2: `{fileKey}.watermarked.pdf`
- Update DocumentRevision.watermarkStatus = COMPLETE

**Watermark Size Gate:**
- 200MB threshold for FOR_CONSTRUCTION documents
- Client shows warning modal during presign phase
- User must acknowledge to proceed
- Metadata stored: `{ acknowledgedWatermarkSkip: true, watermarkSkippedReason: "File size exceeds 200MB limit" }`

### QR Verification (Public)

**Endpoint:** `GET /api/documents/[id]/verify` (no auth required)

**Response (`QRVerificationStatus`):**
```typescript
{
  isSafe: boolean,              // Safe for construction?
  headline: string,             // "SAFE FOR CONSTRUCTION" | "NOT SAFE - DO NOT USE"
  color: "green" | "red",       // Status color
  documentCode: string,         // e.g., "PRJ-001-P&ID-001"
  revisionCode: string,         // e.g., "Rev B"
  issuePurpose: string,         // "FOR CONSTRUCTION"
  discipline: string,           // "PIPING"
  projectName: string,
  lastVerifiedAt: Date
}
```

**Field Safety Check:**
```typescript
isSafe = (
  revision.issuePurpose === "FOR_CONSTRUCTION" &&
  revision.status === "ACTIVE" &&
  document.status === "ACTIVE" &&
  !document.hasActiveLegalHold
)
```

---

## Database Schema

### 11 Prisma Models

**1. Company (Tenant)**
```prisma
model Company {
  id                              String   @id @default(uuid())
  slug                            String   @unique
  name                            String
  planTier                        PlanTier
  recycleBinRetentionDays         Int      @default(30)
  bulkOperationUndoWindowMinutes  Int      @default(30)
  features                        Json?    // Feature flags
  securitySettings                Json?    // MFA, SSO, session timeout
  createdAt                       DateTime @default(now())
  updatedAt                       DateTime @updatedAt

  // Relations
  users         User[]
  roles         Role[]
  projects      Project[]
  documents     Document[]
  // ... (40+ relations)
}
```

**2. Role (PBAC)**
```prisma
model Role {
  id              String      @id @default(uuid())
  companyId       String
  name            String
  isSystemRole    Boolean     @default(false)
  systemRoleKey   String?     // COMPANY_OWNER, COMPANY_ADMIN, etc.
  permissions     Permission[] // Array of enums
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  company         Company     @relation(fields: [companyId], references: [id])
  users           User[]

  @@unique([companyId, name])
  @@index([companyId, isSystemRole])
}
```

**3. User**
```prisma
model User {
  id                    String   @id @default(uuid())
  email                 String   @unique
  name                  String?
  companyId             String
  roleId                String
  isActive              Boolean  @default(true)
  mfaEnabled            Boolean  @default(false)
  mfaSecret             String?
  scimExternalId        String?
  scimDeprovisioned     Boolean  @default(false)
  lastLoginAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  company               Company  @relation(fields: [companyId], references: [id])
  role                  Role     @relation(fields: [roleId], references: [id])

  @@index([companyId, roleId])
  @@index([companyId, isActive])
}
```

**4. Project**
```prisma
model Project {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])
  documents   Document[]

  @@index([companyId])
}
```

**5. Document**
```prisma
model Document {
  id                String            @id @default(uuid())
  companyId         String
  projectId         String
  filename          String
  fileKey           String            // R2 object key
  fileSize          BigInt
  mimeType          String
  sha256Hash        String
  uploadedBy        String
  discipline        EngineeringDiscipline?
  issuePurpose      IssuePurpose?
  status            DocumentStatus    @default(PENDING)
  virusScanStatus   VirusScanStatus   @default(PENDING)
  watermarkStatus   WatermarkStatus   @default(PENDING)
  metadata          Json?             // Custom fields
  deletedAt         DateTime?
  archivedAt        DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  company           Company           @relation(fields: [companyId], references: [id])
  project           Project           @relation(fields: [projectId], references: [id])
  revisions         DocumentRevision[]

  @@index([companyId, status])
  @@index([companyId, createdAt])
  @@index([companyId, projectId])
  @@index([projectId, status, createdAt])
}
```

**6. DocumentRevision**
```prisma
model DocumentRevision {
  id                String            @id @default(uuid())
  documentId        String
  companyId         String
  revisionCode      String            // "Rev A", "Rev B", etc.
  fileKey           String            // Original file
  watermarkFileKey  String?           // Watermarked file
  fileSize          BigInt
  sha256Hash        String
  discipline        EngineeringDiscipline?
  issuePurpose      IssuePurpose?
  status            DocumentStatus    @default(ACTIVE)
  watermarkStatus   WatermarkStatus   @default(PENDING)
  uploadedBy        String
  createdAt         DateTime          @default(now())

  document          Document          @relation(fields: [documentId], references: [id])
  company           Company           @relation(fields: [companyId], references: [id])

  @@index([documentId, status])
  @@index([companyId])
}
```

**7. AuditLog (Operational)**
```prisma
model AuditLog {
  id              String      @id @default(uuid())
  companyId       String
  userId          String?
  action          AuditAction
  resourceType    String?     // "Document", "User", "Role"
  resourceId      String?
  ipAddress       String?
  userAgent       String?
  permissionsUsed Permission[]
  metadata        Json?
  createdAt       DateTime    @default(now())

  company         Company     @relation(fields: [companyId], references: [id])

  @@index([companyId, createdAt])
  @@index([companyId, action])
}
```

**8. AuditVaultEntry (IMMUTABLE - Compliance)**
```prisma
model AuditVaultEntry {
  id                   String              @id @default(uuid())
  companyId            String
  eventType            AuditVaultEventType
  userId               String?
  userEmail            String?             // Snapshot (not FK)
  ipAddress            String?
  userAgent            String?
  permissionsUsed      Permission[]
  metadata             Json?
  documentFingerprint  String?             // SHA-256 of document at event time
  hash                 String              // SHA-256 of this entry
  createdAt            DateTime            @default(now())

  company              Company             @relation(fields: [companyId], references: [id])

  @@index([companyId, createdAt])
  @@index([companyId, eventType])
}
```

**Database Trigger (Immutability):**
```sql
CREATE OR REPLACE FUNCTION prevent_audit_vault_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditVaultEntry is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_vault_immutable
BEFORE UPDATE OR DELETE ON "AuditVaultEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_vault_mutation();
```

**9. Invitation**
```prisma
model Invitation {
  id          String    @id @default(uuid())
  email       String
  companyId   String
  roleId      String
  token       String    @unique
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())

  company     Company   @relation(fields: [companyId], references: [id])
  role        Role      @relation(fields: [roleId], references: [id])

  @@index([token])
  @@index([email, companyId])
}
```

**10. TransmittalCounter (Sequencing)**
```prisma
model TransmittalCounter {
  companyId String
  year      Int
  sequence  Int    @default(0)

  @@id([companyId, year])
}
```

**11. CompanyOnboarding**
```prisma
model CompanyOnboarding {
  id              String   @id @default(uuid())
  companyId       String   @unique
  completedSteps  String[] // "FIRST_PROJECT_CREATED", "FIRST_DOCUMENT_UPLOADED", etc.
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])
}
```

**12. Notification**
```prisma
model Notification {
  id          String           @id @default(uuid())
  companyId   String
  userId      String
  type        NotificationType
  title       String
  message     String
  isRead      Boolean          @default(false)
  metadata    Json?
  createdAt   DateTime         @default(now())

  company     Company          @relation(fields: [companyId], references: [id])
  user        User             @relation(fields: [userId], references: [id])

  @@index([userId, isRead])
  @@index([companyId, createdAt])
  @@index([userId, isRead, createdAt])
}
```

### Key Enums

**EngineeringDiscipline:**
```typescript
PIPING, STRUCTURAL, ELECTRICAL, HVAC, MECHANICAL, INSTRUMENTATION,
CIVIL, ARCHITECTURAL, PROCESS, SAFETY, MARINE, GENERAL
```

**IssuePurpose:**
```typescript
FOR_INFORMATION, FOR_TENDER, FOR_REVIEW, FOR_APPROVAL, FOR_CONSTRUCTION,
AS_BUILT, SUPERSEDED, VOID
```

**DocumentStatus:**
```typescript
PENDING, ACTIVE, SUPERSEDED, DELETED, QUARANTINED, ENCRYPTING,
PENDING_METADATA, ARCHIVED
```

**WatermarkStatus:**
```typescript
PENDING, PROCESSING, COMPLETE, FAILED, SKIPPED_TOO_LARGE, SKIPPED_ENCRYPTED
```

**NotificationType:**
```typescript
WORKFLOW_ACTION_REQUIRED, WORKFLOW_APPROVED, WORKFLOW_REJECTED,
DOCUMENT_QUARANTINED, TRANSMITTAL_RECEIVED, TRANSMITTAL_RETURNED,
LEGAL_HOLD_PLACED, OWNERSHIP_TRANSFER_REQUESTED
```

### Performance Indexes

**Critical Indexes:**
```sql
-- Document search (pg_trgm extension required)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_document_filename_gin ON "Document" USING gin(filename gin_trgm_ops);

-- Permission lookups (faster than array scans)
CREATE INDEX idx_role_permissions ON "Role" USING gin(permissions);

-- Common queries
CREATE INDEX idx_document_status ON "Document"(companyId, status);
CREATE INDEX idx_notification_unread ON "Notification"(userId, isRead, createdAt);
CREATE INDEX idx_audit_log_date ON "AuditLog"(companyId, createdAt DESC);
```

**Expected Performance:**
- Document search: <500ms with 100K+ documents (pg_trgm)
- Permission check: <10ms (Redis cached)
- Audit log query: <100ms (indexed by date)

---

## API Endpoints

### 67 REST Endpoints

**Authentication (1):**
```
POST   /api/auth/[...nextauth]     NextAuth handlers (signin, callback, session, signout)
```

**Invitations (3):**
```
POST   /api/invitations/validate   Validate invitation token
POST   /api/invitations/accept     Accept invitation (create user)
POST   /api/invitations/resend     Resend invitation email (rate limited: 3/24h)
```

**Documents (15):**
```
GET    /api/documents              List documents (filter by project, status, discipline)
POST   /api/documents              Create document metadata
GET    /api/documents/[id]         Get document details
PATCH  /api/documents/[id]         Update document metadata
DELETE /api/documents/[id]         Soft delete document
GET    /api/documents/[id]/verify  Public QR verification (no auth)
GET    /api/documents/[id]/current-hash  Get current revision hash
POST   /api/documents/bulk         Bulk operations (delete, archive, move, status, download)
POST   /api/documents/bulk/[operationId]/undo  Undo within 30-min window
GET    /api/documents/search       Full-text search (fuzzy, pg_trgm)
POST   /api/documents/parse-preview  Preview MDR import
POST   /api/documents/mdr-import   Import Master Document Register
GET    /api/documents/mdr-import/[jobId]  Check import job status
GET    /api/documents/watermark-status/[jobId]  Poll watermark processing
```

**Document Revisions (3):**
```
GET    /api/documents/[id]/revisions/[revisionId]  Get revision details
POST   /api/documents/[id]/revisions/[revisionId]/acknowledge  Acknowledge receipt
GET    /api/documents/[id]/revisions/[revisionId]/view  Secure download URL
```

**File Upload (2):**
```
POST   /api/upload/presign         Generate presigned R2 URL (15-min expiry)
POST   /api/upload/confirm         Finalize upload, enqueue watermark job
```

**Workflows (4):**
```
POST   /api/workflows/start        Create workflow instance
POST   /api/workflows/[instanceId]/action  Submit approval/rejection
POST   /api/workflows/[instanceId]/force-unlock  Emergency unlock
GET    /api/workflows/templates    List standard workflow templates
```

**Transmittals (5):**
```
GET    /api/transmittals           List transmittals
POST   /api/transmittals           Create transmittal
GET    /api/transmittals/[id]      Get transmittal details
PATCH  /api/transmittals/[id]      Update transmittal
DELETE /api/transmittals/[id]      Delete transmittal
POST   /api/transmittals/[id]/send  Send to recipients
POST   /api/transmittals/[id]/return  Return with review
```

**Users & Roles (8):**
```
GET    /api/users                  List company users
POST   /api/users/invite           Invite new user
GET    /api/users/[id]             Get user details
PATCH  /api/users/[id]             Update user
DELETE /api/users/[id]             Delete user
POST   /api/users/[id]/deactivate  Deactivate user
PATCH  /api/users/[id]/role        Change user role
GET    /api/roles                  List roles
POST   /api/roles                  Create custom role
GET    /api/roles/[id]             Get role details
PATCH  /api/roles/[id]             Update role
DELETE /api/roles/[id]             Delete role
PATCH  /api/roles/[id]/permissions Update role permissions
```

**Service Accounts (3):**
```
GET    /api/service-accounts       List service accounts
POST   /api/service-accounts       Create service account
GET    /api/service-accounts/[id]  Get account details
PATCH  /api/service-accounts/[id]  Update account
DELETE /api/service-accounts/[id]  Delete account
POST   /api/service-accounts/[id]/keys  Generate API key
DELETE /api/service-accounts/[id]/keys/[keyId]  Revoke API key
```

**SCIM Provisioning (5):**
```
POST   /api/scim/v2/Users          Create user (SSO auto-provisioning)
GET    /api/scim/v2/Users          List users
GET    /api/scim/v2/Users/[id]     Get user
PATCH  /api/scim/v2/Users/[id]     Update user
DELETE /api/scim/v2/Users/[id]     Deprovision user
```

**Legal & Compliance (5):**
```
GET    /api/legal-holds            List legal holds
POST   /api/legal-holds            Place legal hold
GET    /api/legal-holds/[id]       Get hold details
PATCH  /api/legal-holds/[id]       Update hold
DELETE /api/legal-holds/[id]       Lift hold
GET    /api/compliance/reports/audit-trail  Export audit log (CSV)
GET    /api/compliance/reports/retention  Retention policy report
POST   /api/compliance/retention-dry-run  Test retention rules
```

**Billing (3):**
```
POST   /api/billing/checkout       Create Stripe checkout session
POST   /api/billing/portal         Create Stripe customer portal session
POST   /api/webhooks/stripe        Stripe webhook handler (subscription events)
```

**Company Operations (5):**
```
GET    /api/company/features       Get feature flags
GET    /api/company/onboarding     Get onboarding checklist status
POST   /api/company/transfer-ownership  Initiate ownership transfer
PATCH  /api/company/transfer-ownership/[id]  Approve/reject transfer
POST   /api/company/emergency-ownership-transfer  Platform admin emergency transfer
```

**Notifications (4):**
```
GET    /api/notifications          List user notifications (paginated)
GET    /api/notifications/[id]     Get notification details
POST   /api/notifications/[id]/read  Mark as read
POST   /api/notifications/read-all  Mark all as read
```

**Audit Vault (1):**
```
GET    /api/audit-vault/export     Export compliance vault (JSON)
```

**Admin (2):**
```
GET    /api/admin/queue-status     BullMQ job queue status
GET    /api/health                 Health check (public)
```

**Cron Jobs (8):**
```
POST   /api/cron/retention         Execute retention policies (daily 2 AM)
POST   /api/cron/storage-meter     Update storage usage (daily 1 AM)
POST   /api/cron/key-rotation      Rotate API keys (weekly 4 AM)
POST   /api/cron/key-expiry        Check key expiration (daily 9 AM)
POST   /api/cron/ownership-transfer  Process ownership transfers (every 15 min)
POST   /api/cron/watermark-cleanup  Clean stale watermarks (daily 5 AM)
POST   /api/cron/workflow-timeout  Timeout stale workflows (hourly)
POST   /api/cron/vault-integrity   Verify audit vault hash chain (daily 3 AM)
```

### API Authentication

**Session-based (Cookies):**
- Browser requests use NextAuth session cookies
- Middleware validates session on protected routes

**API Key (Bearer tokens):**
```http
Authorization: Bearer docuroute_live_...
```
- Service account API keys
- Validated in API routes via `validateAPIKey()`
- Scopes: READ_PROJECT, WRITE_DOCUMENT, READ_AUDIT

**Public endpoints (no auth):**
- `/api/health`
- `/api/documents/[id]/verify` (QR verification)
- `/api/webhooks/stripe` (webhook signature validation)
- `/verify/*` (public pages)
- `/acknowledge/*` (transmittal acknowledgment)

---

## Key Components

### Page Routes (Dashboard)

**Authentication:**
- `/login` - Magic link login form
- `/accept-invite` - Accept invitation and create account

**Dashboard:**
- `/dashboard` - Home dashboard with stats, recent docs, notifications
- `/dashboard/documents` - Document list with search/filter
- `/dashboard/documents/conflicts` - Conflict resolution
- `/dashboard/documents/recycle-bin` - Soft-deleted documents (30-day retention)
- `/dashboard/projects` - Project management
- `/dashboard/approvals` - Workflow approval queue
- `/dashboard/audit-log` - Operational audit trail
- `/dashboard/auditor` - Auditor-specific view (read-only)
- `/dashboard/search` - Global document search
- `/dashboard/transmittals` - Document transmittal management

**Settings:**
- `/dashboard/settings/billing` - Plan & usage
- `/dashboard/settings/roles` - Custom role management
- `/dashboard/settings/users` - User management
- `/dashboard/settings/security` - MFA, SSO, session timeout
- `/dashboard/settings/naming-masks` - Document naming rules
- `/dashboard/settings/retention` - Retention policies
- `/dashboard/settings/legal-holds` - Legal hold management
- `/dashboard/settings/service-accounts` - API key management
- `/dashboard/settings/succession` - Ownership succession planning
- `/dashboard/settings/document-control` - Document controller settings

**Public:**
- `/verify/[documentId]` - QR verification page (no auth)
- `/acknowledge/[transmittalId]` - Document acknowledgment (no auth)

### React Components (76 total)

**UI Components (shadcn/ui):**
```
Button, Badge, Card, Dialog, Form, Input, Label, Select, Tabs, Table, Tooltip,
DropdownMenu, Progress, Popover, Sheet, Separator, Accordion, Command, Alert,
Avatar, Toast, Toaster, Skeleton, Switch, Checkbox, RadioGroup, Calendar
```

**Document Components:**
- `DocumentList` - Data table with sorting, filtering, pagination
- `DocumentCard` - Card view with thumbnail
- `DocumentStatusBadge` - Status indicator (ACTIVE, ARCHIVED, DELETED, QUARANTINED)
- `DisciplineBadge` - Engineering discipline badge
- `IssuePurposeBadge` - Issue purpose display
- `PDFPreview` - PDF viewer (pdfjs-dist)
- `Dropzone` - File upload drag-and-drop area
- `MetadataGrid` - Document metadata editor
- `RecycleBinTable` - Soft-deleted document list with restore
- `BulkActionBar` - Multi-select bulk operations (delete, archive, move, download)

**Upload Components:**
- `MDRUpload` - Master Document Register import UI
- `NamingMaskValidator` - Validate file names against company rules
- `SmartParserPreview` - Preview parsed MDR data before import

**Workflow Components:**
- `WorkflowCard` - Workflow instance display with stage progress
- `StageProgress` - Visual stage progression
- `ActionModal` - Approve/reject modal with comment

**Transmittal Components:**
- `TransmittalList` - List of sent/received transmittals
- `TransmittalForm` - Create/edit transmittal

**User & Role Components:**
- `UserTable` - User list with role assignment
- `RoleList` - Custom role management
- `PermissionGate` - Conditional rendering based on permissions

**Audit Components:**
- `AuditLogTable` - Operational audit trail with filters
- `VaultTable` - Compliance vault entries (read-only)

**Search Components:**
- `GlobalSearchBar` - Full-text search with Cmd+K/Ctrl+K shortcut
- `SearchResults` - Result display with highlighting

**Layout Components:**
- `Header` - Top navigation bar
- `Sidebar` - Left navigation menu
- `NotificationDropdown` - Notification bell with dropdown
- `Footer` - Footer with links

**Auth Components:**
- `LoginForm` - Email input for magic link
- `AcceptInviteForm` - Name + password + role display

**Billing Components:**
- `PlanCard` - Plan tier display with features
- `UsageBar` - Storage usage visualization

**Onboarding Components:**
- `OnboardingChecklist` - Guided onboarding steps
- `OnboardingStep` - Individual step with status

**Offline Components:**
- `OfflineIndicator` - PWA offline status banner
- `SyncQueueStatus` - Offline sync queue status

### Custom Hooks

**1. usePermissions**
```typescript
const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

if (hasPermission(Permission.DELETE_DOCUMENT)) {
  // Show delete button
}
```

**2. useCurrentUser**
```typescript
const { user, company, role, isLoading } = useCurrentUser();
```

**3. useNotifications**
```typescript
const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
```

**4. useWatermarkStatus**
```typescript
const { status, progress } = useWatermarkStatus(jobId);
// Polls every 2s until COMPLETE or FAILED
```

**5. useMDRJobStatus**
```typescript
const { jobStatus, progress, results } = useMDRJobStatus(jobId);
```

**6. useSearch**
```typescript
const { results, isLoading, search } = useSearch();
// Debounced by 300ms
```

**7. useSyncQueue**
```typescript
const { queue, syncNow, clearQueue } = useSyncQueue();
// PWA offline sync queue
```

**8. useOfflineDownloadProgress**
```typescript
const { progress, isDownloading } = useOfflineDownloadProgress();
```

**9. useDebounce**
```typescript
const debouncedValue = useDebounce(value, 300);
```

**10. useToast**
```typescript
const { toast } = useToast();
toast({ title: "Success", description: "Document uploaded" });
```

---

## Business Logic

### packages/core/ (Shared Business Logic)

**audit.ts**
```typescript
logAuditEvent(params: {
  companyId: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  permissionsUsed?: Permission[];
  metadata?: Record<string, any>;
}): Promise<void>
```
- INSERT-only audit logging
- Never throws errors (logs to console on failure)
- Includes permission snapshot

**audit-vault.ts**
```typescript
writeVaultEntry(params: {
  companyId: string;
  eventType: AuditVaultEventType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  permissionsUsed?: Permission[];
  metadata?: Record<string, any>;
  documentFingerprint?: string;
}): Promise<AuditVaultEntry>
```
- IMMUTABLE compliance log
- SHA-256 hash with deterministic JSON serialization
- Hash chain: Each entry includes previous entry hash
- Database trigger prevents UPDATE/DELETE

**errors.ts**
```typescript
class DocuRouteError extends Error {
  category: "SYSTEM_ERROR" | "COMPLIANCE_VIOLATION";
  statusCode: number;
  code: string;
}

// Helper functions
notFound(resource: string): DocuRouteError
unauthorized(message?: string): DocuRouteError
forbidden(message?: string): DocuRouteError
validationError(message: string): DocuRouteError
legalHoldActive(): DocuRouteError
transmittalLinked(): DocuRouteError
seatLimitReached(): DocuRouteError
rateLimitExceeded(): DocuRouteError
undoWindowExpired(): DocuRouteError
complianceViolation(message: string): DocuRouteError
```

**permission-cache.ts**
```typescript
cachePermissions(
  companyId: string,
  roleId: string,
  version: number,
  permissions: Permission[]
): Promise<void>

getCachedPermissions(
  companyId: string,
  roleId: string,
  version: number
): Promise<Permission[] | null>

invalidatePermissionCache(
  companyId: string,
  roleId: string
): Promise<void>
```
- Redis-backed permission cache
- Key format: `permissions:{companyId}:{roleId}:v{version}`
- TTL: 30 days (matches JWT maxAge)
- Invalidation: Increment permissionVersion on role change

**qr-verification.ts**
```typescript
generateVerificationQRCode(
  documentId: string,
  revisionId?: string
): Promise<string>  // Base64-encoded PNG

buildVerificationStatus(
  document: Document,
  revision: DocumentRevision,
  project: Project
): QRVerificationStatus
```
- QR code links to `/verify/{documentId}`
- Field safety check: FOR_CONSTRUCTION + ACTIVE + no legal hold

**watermark.ts**
```typescript
watermarkInChildProcess(params: {
  pdfBuffer: Buffer;
  revisionCode: string;
  documentId: string;
  revisionId: string;
}): Promise<Buffer>
```
- **Worker pool:** 2 processes, 512MB each
- **File-based IPC:** Temp files instead of base64 (33% memory savings)
- Libraries: pdf-lib (text overlay), qrcode (QR image)
- Watermark includes:
  - Document code, revision code, issue purpose
  - QR code: `/verify/{documentId}`
  - Timestamp, company branding

**rate-limit.ts**
```typescript
checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }>
```
- Upstash Redis sliding window algorithm
- Key format: `ratelimit:{key}`
- TTL: 2× window duration

**notifications.ts**
```typescript
createNotification(params: {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<Notification>

createNotificationsForPermission(
  companyId: string,
  permission: Permission,
  notification: Omit<Notification, "userId">
): Promise<Notification[]>
```
- Broadcast notifications to all users with specific permission
- Uses GIN index on Role.permissions for fast lookup

**r2.ts** (Cloudflare R2 S3-compatible storage)
```typescript
getSignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn?: number  // Default: 900s (15 min)
): Promise<string>

getSignedDownloadUrl(
  fileKey: string,
  expiresIn?: number  // Default: 3600s (1 hour)
): Promise<string>

uploadFile(
  buffer: Buffer,
  fileKey: string,
  contentType?: string
): Promise<void>

getFileMetadata(fileKey: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
}>
```

**temp-file.ts**
```typescript
createTempFile(
  buffer: Buffer,
  prefix: string
): Promise<string>  // Returns path

readAndDeleteTempFile(path: string): Promise<Buffer>

cleanupTempFile(path: string): Promise<void>
```
- Secure temp file management (prevents race conditions)
- Auto-cleanup on process exit

**utils.ts**
```typescript
hashSHA256(input: string | Buffer): string

isDocumentSafeForConstruction(
  document: Document,
  revision: DocumentRevision
): boolean

sortObjectKeys(obj: any): any  // Deterministic JSON serialization
```

### lib/auth.ts (Permission Resolution)

```typescript
resolvePermissions(roleId: string): Promise<Permission[]>
// Fetches role permissions from Redis cache or DB

resolvePermissionsFromRole(role: Role): Permission[]
// Extracts permissions from role object (system or custom)

requirePermission(
  session: Session,
  permission: Permission
): void
// Throws 403 if user lacks permission

requireLivePermission(
  session: Session,
  permission: Permission
): Promise<void>
// Live DB check (for sensitive operations like role changes)

requireAllPermissions(
  session: Session,
  permissions: Permission[]
): void
// Throws 403 if user lacks any permission

requireAnyPermission(
  session: Session,
  permissions: Permission[]
): void
// Throws 403 if user lacks all permissions
```

**Permission Check Order:**
1. **Cached JWT permissions** - Fast, 99% of checks
2. **Live DB permissions** - Sensitive operations (role changes, ownership transfer)
3. **Invalidate cache** - On role permission change (increment permissionVersion)

---

## Technology Stack

### Frontend

**Framework:**
- **Next.js 15.3** - React framework with App Router
- **React 18.3** - UI library
- **TypeScript 5** - Type safety

**UI Libraries:**
- **Tailwind CSS 3.4** - Utility-first CSS
- **shadcn/ui** - Component library (Radix UI wrappers)
- **Radix UI** - Accessible primitives (Dialog, Dropdown, Tabs, etc.)
- **lucide-react 0.460** - Icon library (2,000+ icons)

**Forms & Validation:**
- **React Hook Form 7.54** - Form state management
- **Zod 3.25** - TypeScript-first schema validation
- **@hookform/resolvers** - Zod integration

**Data Fetching:**
- **SWR** - React Hooks for data fetching (optional)
- Native fetch with Next.js caching

**Utilities:**
- **date-fns 4.1** - Date manipulation
- **fuse.js 7.1** - Fuzzy search (client-side)
- **react-dropzone 15.0** - File drop zone

### Backend

**Runtime:**
- **Node.js 20+** - Backend runtime

**API:**
- **Next.js API Routes** - RESTful API endpoints

**Database:**
- **PostgreSQL** (Supabase) - Primary database
- **Prisma 5.22** - ORM with schema migrations
- **Prisma Client Extensions** - Company-scoped filtering

**Authentication:**
- **NextAuth v4.24** - Session management (stable, not beta)
- **Prisma Adapter** - Session persistence
- **JWT strategy** - 30-day sessions

**File Storage:**
- **Cloudflare R2** - S3-compatible object storage
- **AWS SDK v3** - S3 API client (@aws-sdk/client-s3)
- **Presigned URLs** - Direct client uploads

**Background Jobs:**
- **BullMQ 5.71** - Job queue (Redis-backed)
- **ioredis 5.10** - Redis client
- **workerpool 10.0** - Worker pool (2 processes, 512MB each)

**Caching & Rate Limiting:**
- **Upstash Redis** - Distributed Redis
- **@upstash/redis 1.37** - Redis client
- **@upstash/ratelimit 2.0** - Rate limiter

**Email:**
- **Resend 6.9** - Email delivery
- **React Email 5.2** - Email templates

**PDF Processing:**
- **pdf-lib 1.17** - PDF manipulation (watermarking)
- **pdfjs-dist 5.5** - PDF viewer
- **qrcode 1.5** - QR code generation

**Payments:**
- **Stripe 20.4** - Payment processing

**Utilities:**
- **slugify 1.6** - URL slug generation
- **jose 6.2** - JWT handling
- **exceljs 4.4** - Excel import/export

### PWA & Offline

- **@ducanh2912/next-pwa 10.2** - PWA plugin
- **Dexie 4.3** - IndexedDB wrapper
- **workbox-window 7.4** - Service worker communication

### Development

**Build Tools:**
- **pnpm 10.32** - Package manager
- **Turborepo 2.8** - Monorepo build system
- **tsx 4.19** - TypeScript execution (worker)

**Testing:**
- **Playwright 1.58** - E2E testing
- **Vitest 4.1** - Unit testing
- **MSW 2.12** - Mock Service Worker
- **@testing-library/react** - Component testing

**Code Quality:**
- **ESLint** - Code linting
- **Prettier 3.8** - Code formatting
- **TypeScript strict mode** - Type safety

---

## Deployment Architecture

### Production Stack

**Frontend & API (Vercel):**
- **Service:** Next.js 15 app
- **Region:** Global CDN
- **Environment variables:** 15+ (DATABASE_URL, R2 credentials, Stripe keys, etc.)
- **Cron jobs:** 6 scheduled tasks

**Worker (Render):**
- **Service:** BullMQ processor
- **Plan:** Standard (2GB RAM)
- **Memory limit:** 1536MB heap (75% of 2GB)
- **Health check:** `/health` endpoint
- **Cron jobs:** 2 scheduled tasks (retention, vault integrity)

**Database (Supabase):**
- **Service:** PostgreSQL 15
- **Extensions:** pg_trgm (fuzzy search)
- **Migrations:** 3 Prisma migration files
- **Indexes:** 12+ performance indexes

**File Storage (Cloudflare R2):**
- **Service:** S3-compatible object storage
- **Bucket:** docuroute-files
- **Access:** Presigned URLs (no public access)

**Redis (Upstash):**
- **Service:** Distributed Redis
- **Use cases:** Rate limiting, permission caching, BullMQ queue

**Email (Resend):**
- **Service:** Email delivery API
- **Templates:** React Email

**Payments (Stripe):**
- **Service:** Payment processing
- **Webhook:** `/api/webhooks/stripe`

### Cron Jobs

**Vercel (6 jobs):**
```yaml
- path: /api/cron/storage-meter
  schedule: "0 1 * * *"          # Daily 1 AM

- path: /api/cron/key-rotation
  schedule: "0 4 * * 0"          # Weekly Sunday 4 AM

- path: /api/cron/ownership-transfer
  schedule: "*/15 * * * *"       # Every 15 min

- path: /api/cron/key-expiry
  schedule: "0 9 * * *"          # Daily 9 AM

- path: /api/cron/watermark-cleanup
  schedule: "0 5 * * *"          # Daily 5 AM

- path: /api/cron/workflow-timeout
  schedule: "0 * * * *"          # Hourly
```

**Render (2 jobs):**
```yaml
- name: retention-policy
  schedule: "0 2 * * *"          # Daily 2 AM

- name: vault-integrity-check
  schedule: "0 3 * * *"          # Daily 3 AM
```

### Environment Variables

**Database:**
```env
DATABASE_URL=postgresql://...
```

**NextAuth:**
```env
NEXTAUTH_URL=https://app.docuroute.com
NEXTAUTH_SECRET=...
```

**Cloudflare R2:**
```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=docuroute-files
```

**Upstash Redis:**
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Resend:**
```env
RESEND_API_KEY=re_...
```

**Stripe:**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Worker:**
```env
WORKER_REDIS_URL=redis://...
```

### Post-Deployment Checklist

**1. Database Setup:**
```sql
-- Enable pg_trgm extension
CREATE EXTENSION pg_trgm;

-- Create GIN index for document search
CREATE INDEX idx_document_filename_gin ON "Document" USING gin(filename gin_trgm_ops);

-- Create GIN index for permission lookups
CREATE INDEX idx_role_permissions ON "Role" USING gin(permissions);

-- Create audit vault trigger
CREATE OR REPLACE FUNCTION prevent_audit_vault_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditVaultEntry is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_vault_immutable
BEFORE UPDATE OR DELETE ON "AuditVaultEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_vault_mutation();
```

**2. Seed System Roles:**
```bash
pnpm run seed
```
- Creates 6 system roles with pre-defined permissions

**3. Verify Cron Jobs:**
- Check Vercel dashboard: 6 cron jobs configured
- Check Render dashboard: 2 cron jobs configured

**4. Test Endpoints:**
```bash
curl https://app.docuroute.com/api/health
curl https://worker.docuroute.com/health
```

**5. Smoke Tests:**
- Login with magic link
- Upload document
- Verify watermark processing
- Check QR verification
- Test audit vault export

---

## Security & Compliance

### Security Features

**Authentication:**
- **Magic link login** - No password storage
- **JWT sessions** - 30-day expiry
- **MFA support** - TOTP (Time-based One-Time Password)
- **Session timeout** - Configurable (default: 30 days)

**Authorization:**
- **PBAC (Permission-Based Access Control)** - 41 granular permissions
- **Live permission checks** - Sensitive operations use DB checks (not cached)
- **Permission versioning** - Immediate revocation on role change

**Multi-Tenancy:**
- **Row-level security** - PostgreSQL RLS policies
- **Company-scoped queries** - All queries filtered by companyId
- **Fail-safe filtering** - Returns empty if companyId not set

**API Security:**
- **API key authentication** - Bearer tokens for service accounts
- **API key rotation** - Weekly cron job
- **API key expiry** - 90-day expiry (configurable)
- **Rate limiting** - Upstash Redis sliding window (3 invites/24h, etc.)

**File Security:**
- **Presigned URLs** - Time-limited (15 min upload, 1 hour download)
- **SHA-256 hashing** - File integrity verification
- **Virus scanning** - VirusScanStatus field (stub implementation)
- **No public access** - All files require authentication

**Data Protection:**
- **Encryption at rest** - PostgreSQL encryption (Supabase)
- **Encryption in transit** - HTTPS/TLS
- **Secure temp files** - Auto-cleanup, race condition prevention

### Compliance Features

**ISO 9001 / ISO 19650:**
- **Immutable audit vault** - Database trigger prevents tampering
- **Hash verification** - Daily cron job validates hash chain
- **Document watermarking** - Every construction document has QR code
- **Field verification** - QR codes link to public verification endpoint

**Audit Trail:**
- **Operational audit log** - All user actions logged
- **Compliance audit vault** - Critical events (document lifecycle, role changes, ownership transfer)
- **Permission snapshots** - Each log entry includes permissions used
- **User snapshots** - Vault entries include userEmail (not FK) for historical accuracy

**Legal Holds:**
- **Document retention** - Prevents deletion during legal hold
- **Audit trail** - Hold placement/lifting logged in vault
- **Permission required** - PLACE_LEGAL_HOLD, LIFT_LEGAL_HOLD

**Retention Policies:**
- **Automated deletion** - Daily cron job executes retention rules
- **Dry-run testing** - Preview what will be deleted
- **Grace period** - Configurable retention days per document type
- **Legal hold exception** - Documents on hold never deleted

**Data Residency:**
- **Configurable regions** - Supabase region selection
- **Data export** - Audit vault export for compliance audits

**Access Control:**
- **Least privilege** - System roles have minimal permissions
- **Custom roles** - Granular permission assignment
- **Deactivation** - User deactivation preserves audit trail

**SCIM Provisioning:**
- **Auto-provisioning** - SSO users auto-created via SCIM
- **Deprovisioning** - Deactivate users when removed from IdP
- **Role mapping** - Map IdP groups to DocuRoute roles

**Succession Planning:**
- **Ownership transfer** - Graceful company ownership transition
- **Approval workflow** - Current owner must approve
- **Emergency transfer** - PLATFORM_ADMIN can force transfer (logged in vault)

---

## Appendix

### File Counts

| Category | Count |
|----------|-------|
| TypeScript files (apps/web) | 203 |
| TypeScript files (apps/worker) | 5 |
| TypeScript files (packages/core) | 25+ |
| TypeScript files (packages/db) | 2 |
| React components | 76 |
| API routes | 67 |
| Prisma models | 11 |
| Permissions | 41 |
| System roles | 6 |
| Engineering disciplines | 12 |
| Issue purposes | 8 |
| Workflow templates | 3 |
| Cron jobs | 8 |

### Key Metrics

**Performance:**
- Document search: <500ms with 100K+ documents
- Permission check: <10ms (Redis cached)
- Audit log query: <100ms (indexed)
- Watermark processing: ~5-10s per PDF (varies by size/complexity)

**Scalability:**
- Database: Multi-tenant with RLS (tested to 10K companies)
- File storage: Unlimited (Cloudflare R2)
- Worker pool: 2 processes, 512MB each (handles 200MB PDFs)

**Compliance:**
- Audit vault: Immutable, hash-verified daily
- Document watermarking: 100% for FOR_CONSTRUCTION documents <200MB
- Legal holds: 100% deletion prevention during hold
- Retention policies: Automated daily execution

### Critical Files Reference

**Configuration:**
- `/pnpm-workspace.yaml` - Monorepo packages
- `/turbo.json` - Build tasks
- `/vercel.json` - Vercel deployment
- `/render.yaml` - Render deployment

**Database:**
- `/packages/db/prisma/schema.prisma` - Database schema (11 models)
- `/packages/db/src/client.ts` - Company-scoped Prisma client

**Types:**
- `/packages/types/index.ts` - 41 permissions, 6 system roles, enums

**Business Logic:**
- `/packages/core/src/audit-vault.ts` - Immutable compliance log
- `/packages/core/src/watermark.ts` - PDF watermarking pipeline
- `/packages/core/src/qr-verification.ts` - QR code generation
- `/packages/core/src/permission-cache.ts` - Redis permission caching
- `/packages/core/src/r2.ts` - Cloudflare R2 file storage

**Authentication:**
- `/apps/web/src/app/api/auth/[...nextauth]/route.ts` - NextAuth config
- `/apps/web/src/lib/auth.ts` - Permission resolution
- `/apps/web/src/middleware.ts` - Route protection

**Key API Routes:**
- `/apps/web/src/app/api/upload/presign/route.ts` - File upload presign
- `/apps/web/src/app/api/upload/confirm/route.ts` - File upload confirm
- `/apps/web/src/app/api/documents/[id]/verify/route.ts` - QR verification

**Worker:**
- `/apps/worker/src/index.ts` - Worker entry point
- `/apps/worker/src/workers/watermark.worker.ts` - BullMQ watermark processor

---

**Generated:** 2026-03-24
**Repository:** Fujiorange/DocuRoute
**Commit:** claude/delete-md-files-and-add-summary branch
**Purpose:** Complete repository summary for AI-assisted development and code review
