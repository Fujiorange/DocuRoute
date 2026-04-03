# DocuRoute Setup & Usage Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [External Services Setup](#external-services-setup)
7. [Running the Application](#running-the-application)
8. [Initial System Setup](#initial-system-setup)
9. [Navigating DocuRoute](#navigating-docuroute)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**DocuRoute** is a document management SaaS platform designed for regulated heavy industries (marine, engineering, construction). It provides ISO 9001-compliant document control with multi-tenant architecture, role-based access control, and comprehensive audit logging.

**Key Features:**
- Document lifecycle management with revision control
- PDF watermarking with QR code verification
- Document transmittals for controlled exchange
- Workflow approvals with multi-stage reviews
- Legal holds and retention policies
- PWA support for offline access
- Comprehensive audit logging

**Technology Stack:**
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, NextAuth v4
- **Database:** PostgreSQL (with Row-Level Security for multi-tenancy)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Resend
- **Queue:** BullMQ with Redis
- **Build System:** pnpm workspaces + Turborepo

---

## Prerequisites

Before installing DocuRoute, ensure you have the following installed:

### Required Software

1. **Node.js** (v20 or higher)
   ```bash
   # Check version
   node --version
   ```

2. **pnpm** (v10.32.1 or higher)
   ```bash
   # Install pnpm globally
   npm install -g pnpm@10.32.1

   # Check version
   pnpm --version
   ```

3. **PostgreSQL** (v14 or higher)
   ```bash
   # Check if PostgreSQL is installed
   psql --version
   ```

   **Note:** You can use a managed PostgreSQL service like Supabase instead of local installation.

4. **Redis** (for BullMQ background jobs and rate limiting)
   ```bash
   # Check if Redis is installed
   redis-cli --version
   ```

   **Note:** You can use Upstash Redis (managed service) for development.

### External Services (Required)

You'll need accounts with the following services:

1. **Supabase** (or self-hosted PostgreSQL)
   - Sign up at https://supabase.com
   - Create a new project
   - Note down: `DATABASE_URL` (pooled/port 6543) and `DIRECT_URL` (direct/port 5432)

2. **Cloudflare R2** (S3-compatible object storage)
   - Sign up at https://dash.cloudflare.com
   - Navigate to R2 Object Storage
   - Create a bucket
   - Generate API tokens

3. **Resend** (Email delivery)
   - Sign up at https://resend.com
   - Create API key
   - Verify your sending domain

4. **Upstash Redis** (Managed Redis)
   - Sign up at https://upstash.com
   - Create a Redis database
   - Note down: `REDIS_URL` and REST API credentials

5. **Stripe** (Payment processing - optional for pilot)
   - Sign up at https://stripe.com
   - Get test API keys from dashboard

6. **AWS KMS** (Key Management - optional for pilot)
   - Can use `LOCAL_KMS_MODE=true` for development
   - For production: Create KMS key in AWS

7. **VirusTotal** (File scanning)
   - Sign up at https://www.virustotal.com
   - Get API key from account settings

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Fujiorange/DocuRoute.git
cd DocuRoute
```

### 2. Install Dependencies

```bash
# Install all dependencies for all workspaces
pnpm install
```

This will install dependencies for:
- `apps/web` (Next.js frontend)
- `apps/worker` (Background job processor)
- `packages/core` (Business logic)
- `packages/db` (Prisma client)
- `packages/types` (Shared TypeScript types)
- `packages/emails` (React Email templates)

---

## Environment Configuration

DocuRoute requires environment variables for both the web app and the worker. You need to create `.env.local` files in both `apps/web` and `apps/worker`.

### 1. Web Application Environment (`apps/web/.env.local`)

```bash
# Navigate to web app directory
cd apps/web

# Copy the example file
cp .env.example .env.local

# Edit the file
nano .env.local  # or use your preferred editor
```

**Complete `.env.local` for `apps/web`:**

```bash
# ==========================================
# Database (Supabase or PostgreSQL)
# ==========================================
# PgBouncer pooled URL (port 6543) - for general queries
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true

# Direct connection (port 5432) - for migrations only
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# ==========================================
# Authentication (NextAuth)
# ==========================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-key-here

# Your application URL
NEXTAUTH_URL=http://localhost:3000

# ==========================================
# Cloudflare R2 (File Storage)
# ==========================================
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=docuroute-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# ==========================================
# AWS KMS (Encryption)
# ==========================================
# For development, use local mode
LOCAL_KMS_MODE=true

# For production, configure AWS KMS
# AWS_KMS_KEY_ARN=arn:aws:kms:region:account:key/xxx
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
# AWS_REGION=us-east-1

# ==========================================
# Email (Resend)
# ==========================================
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ==========================================
# Stripe (Payment Processing)
# ==========================================
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# ==========================================
# Redis (Rate Limiting - Upstash REST API)
# ==========================================
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# ==========================================
# Redis (BullMQ - Direct Protocol)
# ==========================================
# Use redis:// scheme for BullMQ worker connection
REDIS_URL=redis://default:password@xxx.upstash.io:6379

# ==========================================
# Cron Protection
# ==========================================
# Generate with: openssl rand -hex 32
CRON_SECRET=your-cron-secret

# ==========================================
# Application Configuration
# ==========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VERSION=0.1.0

# ==========================================
# Platform Admin
# ==========================================
# Email address for platform admin account
PLATFORM_ADMIN_EMAIL=admin@yourdomain.com

# ==========================================
# Pilot Seeding (Optional)
# ==========================================
PILOT_OWNER_EMAIL=pilot@yourdomain.com
PILOT_PROJECT_NAME=Pilot Project
PILOT_NAMING_MASK=PRJ-{YYYY}-{####}

# ==========================================
# Virus Scanning
# ==========================================
VIRUSTOTAL_API_KEY=your-virustotal-api-key

# ==========================================
# QR Verification
# ==========================================
# Must be publicly accessible (no login required)
QR_VERIFICATION_BASE_URL=http://localhost:3000
```

### 2. Worker Environment (`apps/worker/.env.local`)

```bash
# Navigate to worker directory
cd ../worker

# Copy the example file
cp .env.example .env.local

# Edit the file
nano .env.local
```

**Complete `.env.local` for `apps/worker`:**

```bash
# ==========================================
# Database
# ==========================================
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# ==========================================
# Cloudflare R2
# ==========================================
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=docuroute-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# ==========================================
# AWS KMS
# ==========================================
LOCAL_KMS_MODE=true
# AWS_KMS_KEY_ARN=arn:aws:kms:region:account:key/xxx
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
# AWS_REGION=us-east-1

# ==========================================
# Email (Resend)
# ==========================================
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ==========================================
# Redis (BullMQ)
# ==========================================
REDIS_URL=redis://default:password@xxx.upstash.io:6379

# ==========================================
# Cron Protection
# ==========================================
CRON_SECRET=your-cron-secret

# ==========================================
# Platform Admin
# ==========================================
PLATFORM_ADMIN_EMAIL=admin@yourdomain.com

# ==========================================
# QR Verification
# ==========================================
QR_VERIFICATION_BASE_URL=http://localhost:3000
```

---

## Database Setup

### 1. Enable PostgreSQL Extensions

If using Supabase, go to **Database > Extensions** and enable:
- `pg_trgm` (for fuzzy text search)

If using self-hosted PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2. Generate Prisma Client

```bash
# From the root directory
cd /home/runner/work/DocuRoute/DocuRoute

# Generate Prisma client
pnpm --filter @docuroute/db exec prisma generate
```

### 3. Run Database Migrations

```bash
# Run all migrations
pnpm --filter @docuroute/db exec prisma migrate deploy
```

This will create all necessary tables and apply Row-Level Security policies.

### 4. Verify Database Schema

Check that these tables were created:
- `Role` - System and custom roles
- `Company` - Tenant companies
- `User` - User accounts
- `Project` - Projects within companies
- `Document` - Document metadata
- `DocumentRevision` - Document revisions (A, B, C, etc.)
- `Transmittal` - Document transmittals
- `AuditLog` - Immutable audit trail
- `Notification` - User notifications
- `CompanyOnboarding` - Onboarding state
- `CompanyTransmittalConfig` - Transmittal configuration

---

## External Services Setup

### 1. Cloudflare R2 Setup

1. **Create R2 Bucket:**
   - Log in to Cloudflare Dashboard
   - Navigate to **R2 Object Storage**
   - Click **Create bucket**
   - Name it (e.g., `docuroute-files`)
   - Choose location

2. **Generate API Token:**
   - Go to **R2 > Manage R2 API Tokens**
   - Click **Create API token**
   - Permissions: **Object Read & Write**
   - Note: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`

3. **Get Public URL:**
   - The public URL format: `https://[account_id].r2.cloudflarestorage.com`
   - Or set up custom domain in R2 bucket settings

### 2. Resend Email Setup

1. **Sign up and verify domain:**
   - Go to https://resend.com
   - Add your domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification

2. **Create API Key:**
   - Go to **API Keys**
   - Click **Create API Key**
   - Copy the key to `RESEND_API_KEY`

3. **Test Email:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@yourdomain.com",
       "to": "test@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

### 3. Upstash Redis Setup

1. **Create Database:**
   - Go to https://upstash.com
   - Click **Create Database**
   - Choose region closest to your app
   - Select **Pay as you go** or **Free**

2. **Get Connection Strings:**
   - **For Rate Limiting:** Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - **For BullMQ:** Copy the Redis URL (format: `redis://default:password@host:6379`)

### 4. Stripe Setup (Optional)

1. **Get Test Keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy **Publishable key** and **Secret key**

2. **Configure Webhook:**
   - Go to **Developers > Webhooks**
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 5. VirusTotal Setup

1. **Sign up:**
   - Go to https://www.virustotal.com
   - Create account

2. **Get API Key:**
   - Go to **Profile > API Key**
   - Copy key to `VIRUSTOTAL_API_KEY`

---

## Running the Application

### Development Mode

You can run all services together or separately.

#### Option 1: Run Everything (Recommended)

From the root directory:

```bash
# Run web app, worker, and build watchers
pnpm dev
```

This starts:
- **Web app** on http://localhost:3000
- **Worker** (background jobs processor)
- All package build watchers

#### Option 2: Run Services Separately

**Terminal 1 - Web Application:**
```bash
cd apps/web
pnpm dev
```

**Terminal 2 - Worker:**
```bash
cd apps/worker
pnpm dev
```

### Production Mode

#### 1. Build the Application

```bash
# From root directory
pnpm build
```

This builds:
- All packages (`@docuroute/core`, `@docuroute/db`, etc.)
- Web application (Next.js)
- Worker

#### 2. Run in Production

**Web Application:**
```bash
cd apps/web
pnpm start
```

**Worker:**
```bash
cd apps/worker
node dist/index.js
```

### Verify Services

1. **Web App:** Open http://localhost:3000
2. **API Health:** http://localhost:3000/api/health
3. **Database Connection:** Check web app logs for successful connection

---

## Initial System Setup

### Step 1: Create Platform Admin Account

The platform admin is a special account for DocuRoute system administrators.

1. **Open the application:** http://localhost:3000
2. **Click "Sign in with Email"**
3. **Enter the email** specified in `PLATFORM_ADMIN_EMAIL`
4. **Check email** for magic link
5. **Click the link** to verify and log in

**Note:** The first user with the platform admin email automatically gets `PLATFORM_ADMIN` role.

### Step 2: Create Your First Company

After logging in as platform admin:

1. Navigate to **Settings > Platform** (only visible to platform admins)
2. Click **Create Company**
3. Fill in:
   - **Company Name:** e.g., "Acme Engineering"
   - **Slug:** e.g., "acme-engineering" (used in URLs)
   - **Plan Tier:** Choose "PILOT", "STANDARD", or "ENTERPRISE"
4. Click **Create**

The company will be created with:
- All 6 system roles (COMPANY_OWNER, COMPANY_ADMIN, etc.)
- Default settings
- Clean audit log

### Step 3: Create Company Owner

1. Navigate to **Settings > Users**
2. Click **Invite User**
3. Enter:
   - **Email:** Owner's email address
   - **Name:** Owner's full name
   - **Role:** Select "COMPANY_OWNER"
4. Click **Send Invitation**

The user will receive an email invitation with an accept link.

### Step 4: Accept Invitation (as new user)

1. **Check email** for invitation
2. **Click "Accept Invitation"** button
3. **Review permissions** shown on accept page
4. **Click "Accept & Sign In"**
5. **Sign in** with magic link sent to email

### Step 5: Create First Project

As a company owner or admin:

1. Navigate to **Projects** from sidebar
2. Click **Create Project**
3. Enter:
   - **Project Name:** e.g., "Vessel Hull 2026"
   - **Description:** Optional project description
4. Click **Create**

Projects are containers for documents. All documents must belong to a project.

### Step 6: Configure Document Settings (Optional)

1. Navigate to **Settings > Document Control**
2. Configure:
   - **Recycle Bin Retention:** Days before permanent deletion (default: 90)
   - **Bulk Operation Undo Window:** Minutes to undo bulk operations (default: 30)
   - **Naming Masks:** Document code patterns (e.g., `DWG-{YYYY}-{####}`)

### Step 7: Configure Transmittal Settings (Optional)

1. Navigate to **Settings > Transmittals**
2. Configure:
   - **Number Prefix:** e.g., "SHP" for shipyard transmittals
   - **Number Padding:** Digits in counter (default: 4 for 0001, 0002, etc.)
   - **Enabled Columns:** Select which document columns to show
   - **Header Fields:** Configure transmittal header information
3. **Reorder columns** using ↑↓ arrows
4. Click **Save Configuration**

---

## Navigating DocuRoute

### Main Navigation Structure

```
DocuRoute Dashboard
├── Dashboard (Home)
├── Documents
│   ├── All Documents (Register view)
│   ├── Document Details
│   └── Conflicts
├── Transmittals
│   ├── All Transmittals
│   ├── Create Transmittal
│   └── Transmittal Details
├── Projects
│   └── Project List
├── Approvals
│   ├── Pending Approvals
│   └── Completed Workflows
├── Search (Cmd+K / Ctrl+K)
├── Audit Log
├── Auditor Tools (for AUDITOR role)
└── Settings
    ├── Users
    ├── Roles
    ├── Security
    │   └── Identity & SSO
    ├── Service Accounts
    ├── Document Control
    ├── Naming Masks
    ├── Transmittals
    ├── Legal Holds
    ├── Retention Policies
    ├── Succession Planning
    ├── Billing
    └── Mobile/PWA
```

### Feature Walkthrough

#### 1. Document Management

**Upload a Document:**

1. Navigate to **Documents**
2. Click **Upload Document**
3. Drag & drop file or click to browse
4. Fill in metadata:
   - **Document Code:** e.g., "DWG-2026-0001"
   - **Title:** e.g., "Hull Section A - General Arrangement"
   - **Discipline:** Select from dropdown (Mechanical, Electrical, Civil, etc.)
   - **Project:** Select project
   - **Issue Purpose:** FOR_CONSTRUCTION, FOR_INFORMATION, etc.
5. Click **Upload**

The document will be:
- Uploaded to R2 storage
- Scanned for viruses (if VirusTotal configured)
- Watermarked with QR code (if <200MB and FOR_CONSTRUCTION)
- Created as Revision A (initial revision)
- Logged in audit trail

**View Document Register:**

1. Navigate to **Documents**
2. See table with columns:
   - Document Code
   - Title
   - Current Revision (A, B, C, etc.)
   - Discipline
   - Status
   - Last Modified
3. **Filter** by status, discipline, project
4. **Search** by document code or title
5. **Click row** to view document details

**View Document Details:**

1. Click any document in register
2. See document information:
   - Current revision highlighted
   - All revision history (A, B, C, etc.)
   - Metadata (code, title, discipline, etc.)
   - File size, upload date, uploader
3. **Download** current or any previous revision
4. **Upload New Revision** (creates revision B, C, etc.)
5. **View QR code** for field verification

**Upload New Revision:**

1. On document details page
2. Click **Upload New Revision**
3. Select new file
4. Add **Revision Notes** (required)
5. Click **Upload**

The system will:
- Mark previous revision as SUPERSEDED
- Increment revision code (A→B→C...Z→AA)
- Create new revision as CURRENT
- Log both REVISION_CREATED and REVISION_SUPERSEDED events

**Bulk Import from Excel:**

1. Navigate to **Documents**
2. Click **Bulk Import**
3. Download **Excel template** (if first time)
4. Fill in Excel with:
   - Column A: `documentCode` (required)
   - Column B: `title` (required)
   - Column C: `discipline` (optional)
5. Upload Excel file
6. Review preview
7. Click **Import**

Documents will be created with:
- Status: PENDING_METADATA
- Initial Revision: A
- Placeholder files (actual files uploaded later)

#### 2. Transmittals

**Create Transmittal:**

1. Navigate to **Transmittals**
2. Click **Create Transmittal**
3. Fill in:
   - **Recipient Company:** Company receiving documents
   - **Recipient Contact:** Contact person
   - **Project:** Select project
   - **Purpose:** Purpose of transmission
4. **Select Documents:** Add documents to transmittal
5. Review **transmittal preview** (uses configured template)
6. Click **Create Transmittal**

The transmittal will:
- Generate unique number (e.g., SHP-2026-0001)
- Create PDF cover sheet
- Log in audit trail

**View Transmittals:**

1. Navigate to **Transmittals**
2. See list of all transmittals
3. **Filter** by project, status, date range
4. **Click** to view details

**View Transmittal Details:**

1. Click any transmittal
2. See:
   - Transmittal number and metadata
   - List of documents included
   - Transmittal cover sheet (PDF)
   - Send history
3. **Download** transmittal package
4. **Send** via email (if configured)

#### 3. Workflows & Approvals

**Start Workflow:**

1. On document details page
2. Click **Start Workflow**
3. Select **workflow template**
4. Assign **reviewers** for each stage
5. Click **Start**

**Approve/Reject Document:**

1. Navigate to **Approvals**
2. See **Pending Approvals** assigned to you
3. Click document to review
4. View document and metadata
5. **Approve** or **Reject** with comments
6. Document advances to next stage or returns to submitter

**Force Unlock Workflow:**

For users with `FORCE_UNLOCK_WORKFLOW` permission:

1. Navigate to document in workflow
2. Click **Force Unlock**
3. Confirm action
4. Workflow is terminated and document unlocked

#### 4. Search

**Global Search (Cmd+K / Ctrl+K):**

1. Press **Cmd+K** (Mac) or **Ctrl+K** (Windows)
2. Type search query
3. Search looks in:
   - Document codes
   - Document titles
   - Document filenames
4. See **real-time results** (300ms debounce)
5. Click result to navigate

**Advanced Filters:**

On Documents page:

1. Use filter dropdowns:
   - **Status:** Current, Superseded, Archived
   - **Discipline:** Mechanical, Electrical, etc.
   - **Project:** Select specific project
2. Filters combine with search

#### 5. User Management

**Invite Users:**

1. Navigate to **Settings > Users**
2. Click **Invite User**
3. Enter email, name, role
4. Click **Send Invitation**

User receives email with:
- Company name
- Role and permissions
- Accept invitation link

**Manage User Roles:**

1. Navigate to **Settings > Users**
2. Click user
3. Click **Change Role**
4. Select new role
5. Confirm change

**Deactivate User:**

1. Navigate to **Settings > Users**
2. Click user
3. Click **Deactivate**
4. User loses access immediately
5. Sessions are invalidated

#### 6. Role Management

**Create Custom Role:**

1. Navigate to **Settings > Roles**
2. Click **Create Custom Role**
3. Enter:
   - **Role Name:** e.g., "Field Engineer"
   - **Description:** Role purpose
4. **Select Permissions:** Check boxes for 41 granular permissions
5. Click **Create**

**Edit Role Permissions:**

1. Navigate to **Settings > Roles**
2. Click custom role (system roles are immutable)
3. Click **Edit Permissions**
4. Check/uncheck permissions
5. Click **Save**

**Note:** Permission changes take effect immediately via Redis cache invalidation.

#### 7. Audit Log

**View Audit Log:**

1. Navigate to **Audit Log**
2. See chronological list of all actions:
   - User who performed action
   - Action type (DOCUMENT_UPLOADED, REVISION_CREATED, etc.)
   - Timestamp
   - IP address
   - Related entities (document ID, etc.)
3. **Filter** by:
   - User
   - Action type
   - Date range
   - Entity ID
4. **Search** by keyword

**Export Audit Vault:**

For users with `EXPORT_AUDIT_VAULT` permission:

1. Navigate to **Audit Log**
2. Click **Export**
3. Select:
   - Date range
   - Format (CSV or JSON)
4. Click **Generate Export**
5. Download exported file

**Note:** Audit log entries are **immutable** - they cannot be edited or deleted (enforced by database trigger).

#### 8. Settings & Configuration

**Document Control Settings:**

- **Recycle Bin Retention:** Days before permanent deletion
- **Bulk Operation Undo Window:** Minutes to undo
- **Naming Masks:** Define document code patterns

**Security Settings:**

- **SSO Configuration:** SAML/OIDC setup (Enterprise)
- **SCIM Provisioning:** User sync (Enterprise)
- **Service Accounts:** API keys for integrations
- **MFA Requirements:** Enforce multi-factor authentication

**Legal & Compliance:**

- **Legal Holds:** Place/lift holds on documents
- **Retention Policies:** Configure retention periods
- **Succession Planning:** Configure ownership transfer

**Billing:**

- View current plan
- Manage subscription
- View invoices
- Update payment method

#### 9. QR Code Verification

**Scan QR Code (Field Use):**

1. Open **any QR reader app** on smartphone
2. Scan QR code on printed document
3. Opens verification page (no login required)
4. See:
   - Document code and title
   - Current revision
   - Issue purpose (FOR_CONSTRUCTION, etc.)
   - Status (CURRENT, SUPERSEDED)
   - **Warning if SUPERSEDED** (red alert)

**Use Case:**
Field workers can verify they have the correct, current revision before construction/installation.

---

## Key Concepts & Terminology

### Multi-Tenancy
- Each **Company** is a separate tenant with isolated data
- Row-Level Security (RLS) enforces data isolation
- Users belong to one company
- Can't see data from other companies

### Authorization Model

**System Roles (Immutable):**
1. **PLATFORM_ADMIN** - DocuRoute staff only
2. **COMPANY_OWNER** - All permissions (39 permissions)
3. **COMPANY_ADMIN** - User/role management, documents (32 permissions)
4. **DOCUMENT_CONTROLLER** - Document lifecycle, workflows (14 permissions)
5. **AUDITOR** - Read-only audit access (3-4 permissions)
6. **BILLING_CONTACT** - Billing only (2 permissions)

**Custom Roles:**
- Created by companies with `MANAGE_CUSTOM_ROLES` permission
- Can have any subset of 41 permissions
- Examples: "Field Engineer", "Project Manager", "QA Inspector"

**41 Granular Permissions:**
- Document operations (UPLOAD_DOCUMENT, VIEW_DOCUMENT, etc.)
- Workflow (START_WORKFLOW, APPROVE_WORKFLOW, etc.)
- Transmittals (CREATE_TRANSMITTAL, SEND_TRANSMITTAL, etc.)
- Users & roles (INVITE_USERS, MANAGE_CUSTOM_ROLES, etc.)
- Legal & compliance (PLACE_LEGAL_HOLD, VIEW_AUDIT_LOG, etc.)
- Security (CONFIGURE_SSO, MANAGE_SCIM, etc.)
- Billing & ownership (MANAGE_BILLING, TRANSFER_OWNERSHIP, etc.)

### Document Lifecycle

**Statuses:**
- **CURRENT** - Active, latest approved revision
- **SUPERSEDED** - Replaced by newer revision
- **ARCHIVED** - Moved to archive, still retrievable
- **DELETED** - In recycle bin, recoverable within retention period
- **PURGED** - Permanently deleted
- **PENDING_METADATA** - Bulk imported, awaiting file upload

**Revisions:**
- Each document has multiple revisions (A, B, C, etc.)
- Only ONE revision can be CURRENT at a time
- Uploading new revision automatically supersedes previous
- Revision codes: A→B→C...→Z→AA→AB...→ZZ→AAA
- All revisions retained for audit trail

**Issue Purposes:**
- **FOR_CONSTRUCTION** - Approved for building/installation
- **FOR_APPROVAL** - Awaiting approval
- **FOR_INFORMATION** - Reference only
- **FOR_TENDER** - Bidding purposes
- **AS_BUILT** - Final as-constructed drawings

### Transmittals

A **transmittal** is a formal document exchange package containing:
- Cover sheet with transmittal number
- List of documents being transmitted
- Purpose and recipient information
- Metadata (date, sender, project, etc.)

**Transmittal Numbers:**
Format: `{PREFIX}-{YYYY}-{####}`
Example: `SHP-2026-0001`

**Configuration:**
- Number prefix (e.g., "SHP" for shipyard)
- Number padding (4 digits = 0001, 0002, etc.)
- Enabled columns (which document fields to show)
- Header fields (transmittal metadata)

### Workflows

**Workflow** = Multi-stage approval process for documents

**Stages:**
1. Document submitted
2. Reviewer 1 approves → advances to stage 2
3. Reviewer 2 approves → advances to stage 3
4. Final approver approves → document marked approved

**Rejection:**
If any reviewer rejects, document returns to submitter for corrections.

**Force Unlock:**
Users with `FORCE_UNLOCK_WORKFLOW` permission can terminate workflow and unlock document.

### Legal Holds

**Legal Hold** = Preservation requirement for legal/regulatory purposes

When placed:
- Document cannot be deleted
- Document cannot be archived
- All revisions preserved
- Audit log tracks hold placement and lifting

Use cases:
- Litigation
- Regulatory investigations
- Compliance audits

### Audit Trail

Every action in DocuRoute is logged to an **immutable audit vault**:
- User who performed action
- Action type (DOCUMENT_UPLOADED, USER_INVITED, etc.)
- Timestamp with millisecond precision
- IP address
- Related entity IDs
- Before/after values (for updates)

**Immutability:**
- Audit log entries cannot be edited
- Audit log entries cannot be deleted
- Enforced by PostgreSQL trigger
- Required for ISO 9001 compliance

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Fails

**Error:** `Can't reach database server`

**Solutions:**
- Check `DATABASE_URL` is correct
- Verify database is running
- Check firewall rules (Supabase: allow connections)
- Test connection:
  ```bash
  psql "postgresql://user:pass@host:5432/db"
  ```

#### 2. Prisma Client Out of Sync

**Error:** `Prisma Client has not been generated`

**Solution:**
```bash
pnpm --filter @docuroute/db exec prisma generate
```

#### 3. Redis Connection Fails

**Error:** `Redis connection timeout`

**Solutions:**
- Check `REDIS_URL` format: `redis://default:password@host:6379`
- Verify Redis is accessible
- Test with redis-cli:
  ```bash
  redis-cli -u redis://default:password@host:6379 PING
  ```

#### 4. R2 Upload Fails

**Error:** `AccessDenied` or `NoSuchBucket`

**Solutions:**
- Verify R2 credentials in `.env.local`
- Check bucket name is correct
- Verify API token has **Object Read & Write** permissions
- Test with AWS CLI:
  ```bash
  aws s3 ls --endpoint-url https://<account_id>.r2.cloudflarestorage.com
  ```

#### 5. Email Not Sending

**Error:** Magic link not received

**Solutions:**
- Check spam folder
- Verify `RESEND_API_KEY` is valid
- Check sending domain is verified in Resend
- Check Resend dashboard for delivery logs
- Test API key:
  ```bash
  curl https://api.resend.com/emails \
    -H "Authorization: Bearer YOUR_KEY"
  ```

#### 6. Permission Denied Errors

**Error:** `User does not have permission`

**Solutions:**
- Check user's role has required permission
- Verify JWT is not stale (refresh by logging out/in)
- Check Redis cache is accessible
- Review audit log for permission changes

#### 7. Build Fails

**Error:** TypeScript errors during build

**Solutions:**
```bash
# Clean build artifacts
rm -rf apps/*/dist apps/*/.next node_modules/.cache

# Reinstall dependencies
pnpm install

# Generate Prisma client
pnpm --filter @docuroute/db exec prisma generate

# Rebuild
pnpm build
```

#### 8. Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 pnpm dev
```

### Debug Mode

Enable verbose logging:

```bash
# In .env.local
DEBUG=docuroute:*
LOG_LEVEL=debug
```

### Getting Help

1. **Check logs:**
   - Web app: Console in browser + terminal
   - Worker: Check worker logs
   - Database: Check Supabase logs

2. **Review audit log:**
   - Navigate to Audit Log
   - Filter by action type and timeframe
   - Look for error events

3. **Check documentation:**
   - `/docs` directory in repository
   - `docs/DocuRouteP0P1.md` - Complete technical overview
   - `docs/Phase2Plan.md` - Future features

4. **Community:**
   - GitHub Issues: https://github.com/Fujiorange/DocuRoute/issues
   - Check existing issues for similar problems

---

## Next Steps

After completing setup:

1. **Invite team members:**
   - Create users with appropriate roles
   - Send invitation emails
   - Guide them through acceptance

2. **Create projects:**
   - Organize by vessel, facility, or contract
   - Assign documents to projects

3. **Configure settings:**
   - Document naming masks
   - Transmittal templates
   - Retention policies
   - Legal hold procedures

4. **Import existing documents:**
   - Use bulk import for document register
   - Upload files individually or in batches
   - Apply metadata and tags

5. **Set up workflows:**
   - Create workflow templates
   - Define approval stages
   - Assign default reviewers

6. **Train users:**
   - Document management procedures
   - QR code verification for field workers
   - Transmittal creation and sending
   - Audit log review

7. **Monitor system:**
   - Check audit log regularly
   - Review user activity
   - Monitor storage usage
   - Track workflow completion rates

---

## Production Deployment

For production deployment, consider:

1. **Use managed services:**
   - Supabase (database)
   - Upstash (Redis)
   - Cloudflare R2 (storage)
   - Resend (email)

2. **Deploy platforms:**
   - **Vercel** (web app) - See `vercel.json`
   - **Render** (worker + crons) - See `render.yaml`
   - Or self-host with Docker

3. **Security:**
   - Enable AWS KMS (set `LOCAL_KMS_MODE=false`)
   - Configure HTTPS
   - Set up proper firewall rules
   - Enable MFA for admin accounts
   - Rotate secrets regularly

4. **Monitoring:**
   - Set up error tracking (Sentry, etc.)
   - Monitor database performance
   - Track API response times
   - Alert on queue backlogs

5. **Backups:**
   - Enable automated database backups
   - Backup R2 storage
   - Export audit logs regularly
   - Test restore procedures

6. **Compliance:**
   - Review ISO 9001 requirements
   - Configure retention policies
   - Set up legal hold procedures
   - Train document controllers

---

## Summary

DocuRoute is now ready to use! You have:

✅ Installed all dependencies
✅ Configured environment variables
✅ Set up database with migrations
✅ Connected external services
✅ Created first company and users
✅ Understood navigation and features

**Key URLs:**
- **Application:** http://localhost:3000
- **API Health:** http://localhost:3000/api/health
- **Documents:** http://localhost:3000/documents
- **Transmittals:** http://localhost:3000/transmittals
- **Audit Log:** http://localhost:3000/audit-log

**Default Ports:**
- Web app: 3000
- Worker: N/A (background process)

For questions or issues, refer to the troubleshooting section or check the documentation in the `/docs` directory.

Happy document managing! 📄🚢
