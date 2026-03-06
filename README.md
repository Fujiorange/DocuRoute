# DocuRoute — Developer Guide

> **Looking for the marketing/product overview?** See [README.marketing.md](README.marketing.md)

**Enterprise document management platform for Singapore construction and engineering companies**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-teal)](https://www.prisma.io/)

---

## What is DocuRoute?

DocuRoute is a full-stack SaaS application built with Next.js 15 (App Router). It provides:
- Secure document storage (AWS S3 + AES-256-GCM encryption)
- Multi-tenant isolation (each company has a completely separate data space)
- Role-based access control (4 roles: IT Admin, Project Admin, Engineer, Client)
- Document approval workflows, version control, commenting, and full-text search
- PDPA-compliant data handling for Singapore businesses

This README is the **developer guide**. It explains how to set up the project locally, understand the architecture, and contribute code.

---

## Prerequisites

Before you start, install these tools:

- **Node.js 20+** — [Download from nodejs.org](https://nodejs.org/)
- **npm 10+** — Comes with Node.js
- **PostgreSQL 14+** — [Download from postgresql.org](https://www.postgresql.org/download/) OR use [Neon](https://neon.tech) (free, serverless PostgreSQL)
- **Git** — [Download from git-scm.com](https://git-scm.com/)
- **AWS Account** — [Sign up at aws.amazon.com](https://aws.amazon.com/) (for S3 file storage)
- **Resend Account** — [Sign up at resend.com](https://resend.com) (for email sending)

---

## Local Development Setup

Follow these steps **in order**:

### Step 1: Clone the repository
```bash
git clone https://github.com/Fujiorange/DocuRoute
cd DocuRoute
```

### Step 2: Install dependencies
```bash
npm install
```
This installs all packages listed in `package.json`. It will also automatically run `prisma generate`.

### Step 3: Set up environment variables
```bash
cp .env.example .env
```
Then open `.env` and fill in your values. See the [Environment Variables Reference](#environment-variables-reference) section below for what each variable does.

### Step 4: Set up the database

**Option A: Local PostgreSQL**
1. Create a new database: `createdb docuroute_dev`
2. Set `DATABASE_URL=postgresql://postgres:password@localhost:5432/docuroute_dev` in `.env`

**Option B: Neon (recommended for development)**
1. Go to [neon.tech](https://neon.tech), create a free account
2. Create a new project, copy the connection string
3. Set `DATABASE_URL=<your-neon-connection-string>` in `.env`

Then run migrations to create all tables:
```bash
npx prisma migrate dev
```
This reads `prisma/schema.prisma`, generates SQL, and runs it against your database. You'll see a list of tables created.

### Step 5: Generate the Prisma client
```bash
npx prisma generate
```
This generates the TypeScript types for your database queries.

### Step 6: Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). You should see the landing page.

### Step 7: Create your first account
Go to [http://localhost:3000/register](http://localhost:3000/register) and register. This creates both a Company and a User (IT Admin role).

---

## Environment Variables Reference

| Variable | Required | Description | Where to Get It | Example |
|----------|----------|-------------|-----------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | Your DB provider | `postgresql://user:pass@host/db` |
| `DIRECT_URL` | For Neon | Direct URL for migrations (bypasses pooler) | Neon dashboard | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens | Generate: `openssl rand -hex 32` | `abc123...` (64 hex chars) |
| `ENCRYPTION_KEY` | ✅ | 32-byte key for AES-256-GCM | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `0123...abcdef` (64 hex chars) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app's public URL | Your deployment URL | `https://app.docuroute.com` |
| `AWS_ACCESS_KEY_ID` | ✅ | AWS IAM access key | AWS Console → IAM | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS IAM secret key | AWS Console → IAM | `wJalrXUtnFEM...` |
| `AWS_REGION` | ✅ | AWS region for S3 | Use `ap-southeast-1` for Singapore | `ap-southeast-1` |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name | Your S3 bucket name | `docuroute-documents` |
| `RESEND_API_KEY` | ✅ | Resend API key for emails | [resend.com/api-keys](https://resend.com/api-keys) | `re_...` |
| `EMAIL_FROM` | ✅ | Sender email address | Your verified domain | `noreply@docuroute.com` |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis URL for rate limiting | [upstash.com](https://upstash.com) | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis token | Upstash console | `AX4...` |
| `SENTRY_DSN` | Optional | Sentry error tracking | [sentry.io](https://sentry.io) | `https://...@sentry.io/...` |

**Note:** If `UPSTASH_REDIS_REST_URL` is not set, the app falls back to in-memory rate limiting (fine for development).

---

## Project Structure

```
DocuRoute/
├── app/                        # Next.js App Router pages and API routes
│   ├── api/                    # All API endpoints
│   │   ├── auth/               # Login, register, logout, 2FA, password reset
│   │   ├── documents-v2/       # Document CRUD, comments, downloads, approvals
│   │   ├── projects/           # Project management
│   │   ├── team/               # Team members listing
│   │   ├── invitations/        # Team invitations
│   │   ├── analytics/          # Analytics data
│   │   ├── company/            # Company settings
│   │   ├── folders/            # Folder management
│   │   ├── search/             # Full-text search
│   │   ├── pdpa/               # PDPA data export/deletion
│   │   └── health/             # Health check endpoint
│   ├── dashboard/              # Authenticated dashboard pages
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── documents/          # Documents listing + detail page
│   │   ├── projects/           # Projects listing + detail
│   │   ├── team/               # Team management
│   │   ├── analytics/          # Analytics dashboard
│   │   └── settings/           # Account & company settings
│   ├── onboarding/             # First-run onboarding wizard
│   ├── pricing/                # Marketing pricing page
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── invite/                 # Invitation acceptance
│   ├── page.tsx                # Landing page (marketing)
│   ├── layout.tsx              # Root layout
│   ├── not-found.tsx           # 404 error page
│   ├── error.tsx               # Global error boundary
│   └── loading.tsx             # Global loading state
├── components/                 # Reusable React components
│   ├── ui/                     # shadcn/ui base components (Button, Input, etc.)
│   ├── document-upload.tsx     # Drag-and-drop upload component
│   ├── file-type-icon.tsx      # File type icon by MIME type
│   ├── status-badge.tsx        # Document status badge
│   └── skeleton-card.tsx       # Loading skeleton components
├── lib/                        # Server-side utility functions
│   ├── auth.ts                 # JWT sign/verify, getCurrentUser()
│   ├── auth-edge.ts            # JWT verification for Next.js middleware
│   ├── prisma.ts               # Prisma client singleton
│   ├── storage.ts              # AWS S3 upload/download with AES-256-GCM
│   ├── email.ts                # Resend email sending
│   ├── audit.ts                # Audit log creation
│   ├── permissions.ts          # RBAC permission checks
│   ├── tenant-guard.ts         # Multi-tenant isolation helpers
│   ├── rate-limit.ts           # Rate limiting with Redis/in-memory fallback
│   ├── two-factor.ts           # TOTP 2FA with speakeasy
│   ├── validation.ts           # Zod schemas for all API inputs
│   ├── errors.ts               # Custom error classes and catchAsync wrapper
│   ├── api-response.ts         # Standard API response helpers
│   └── pdpa.ts                 # PDPA compliance utilities
├── prisma/
│   ├── schema.prisma           # Database schema (10 models)
│   └── migrations/             # SQL migration files
├── store/
│   └── authStore.ts            # Zustand store for auth state
├── tests/                      # Integration tests (require a database)
│   ├── audit/                  # Audit log tests
│   ├── auth/                   # RBAC and permission tests
│   ├── documents/              # Document encryption tests
│   ├── isolation/              # Multi-tenant isolation tests
│   ├── security/               # Rate limiting tests
│   └── helpers/                # Test utilities and factories
├── __tests__/                  # Unit tests (no database required)
│   ├── lib/                    # Tests for lib/ utilities
│   ├── permissions.test.ts     # RBAC permission tests
│   └── two-factor.test.ts      # 2FA utility tests
├── types/
│   └── index.ts                # TypeScript type definitions
├── middleware.ts               # JWT auth middleware (protects /dashboard routes)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── vitest.config.ts            # Test configuration with coverage thresholds
├── render.yaml                 # Render.com deployment config
└── vercel.json                 # Vercel deployment config
```

---

## How the Auth System Works

1. **Registration:** User fills in form → `POST /api/auth/register` → password hashed with bcrypt → User + Company created in DB → JWT signed with `JWT_SECRET` → stored in httpOnly cookie (`auth_token`)

2. **Login:** User submits credentials → `POST /api/auth/login` → bcrypt compare → if 2FA enabled, prompt for TOTP → JWT signed and set as cookie

3. **Protected routes:** The Next.js middleware (`middleware.ts`) runs on every `/dashboard` request. It reads the `auth_token` cookie, verifies the JWT (using `lib/auth-edge.ts` which uses `jose` for Edge runtime compatibility), and redirects to `/login` if invalid.

4. **API routes:** Each API handler calls `getCurrentUser()` from `lib/auth.ts`. This reads the cookie, verifies the JWT with `jsonwebtoken`, and queries the database for the full user object with company data.

5. **Logout:** `POST /api/auth/logout` → clears the `auth_token` cookie.

---

## How Document Encryption Works

Every document uploaded to DocuRoute is encrypted **before** it's sent to AWS S3:

1. User uploads file → Next.js API route receives the file buffer
2. `lib/storage.ts` → `encrypt()` function generates a random 12-byte IV
3. `crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)` encrypts the file
4. The encrypted buffer, IV (hex string), and authentication tag are returned
5. Encrypted buffer uploaded to S3 · IV and auth tag stored in the `Document` Postgres record
6. On download: S3 returns encrypted buffer → `decrypt(buffer, iv, authTag)` → plaintext returned to user

**Key management:** The `ENCRYPTION_KEY` environment variable is a 64-character hex string (32 bytes). Every file uses the same key but a **unique IV** — this is cryptographically secure per AES-GCM mode.

---

## How Multi-Tenancy Works

Every database row that belongs to a company has a `companyId` field. The `getCurrentUser()` function always returns the user's `companyId`. All database queries are filtered by this `companyId`:

```ts
// ✅ Correct — tenant-isolated query
prisma.document.findMany({ where: { companyId: user.companyId } })

// ❌ Wrong — leaks data across tenants
prisma.document.findMany()
```

The `lib/tenant-guard.ts` provides helper functions to enforce this. All API routes must include `companyId: user.companyId` in their Prisma `where` clauses.

---

## Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run in watch mode (re-runs on file change)
npm run test:watch

# Run once without watch (for CI)
npm run test:run

# Run with coverage report
npm run test:coverage

# Run specific file
npx vitest run __tests__/permissions.test.ts
```

**Coverage thresholds** (defined in `vitest.config.ts`):
- Lines: 65% · Functions: 60% · Branches: 50% · Statements: 65%

**Note:** Integration tests in `tests/` require a running PostgreSQL database. Set `DATABASE_URL` in your `.env` before running them. Unit tests in `__tests__/` run without a database.

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set all environment variables from the [reference table above](#environment-variables-reference)
4. Vercel will auto-detect Next.js and deploy. The `vercel.json` in this repo configures it to use the Singapore region (`sin1`)

**Database for Vercel:** Use [Neon](https://neon.tech) (serverless PostgreSQL). Set both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) for Prisma migrations to work.

### Deploy to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and create a new Web Service
3. The `render.yaml` in this repo defines the full configuration
4. Set the environment variables marked `sync: false` in the Render dashboard

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ENCRYPTION_KEY must be a 64-character hex string` | Missing or wrong `ENCRYPTION_KEY` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PrismaClientInitializationError: Can't reach database server` | Wrong `DATABASE_URL` or DB not running | Check your connection string and make sure Postgres is running |
| `Error: Cannot find module '@prisma/client'` | Prisma client not generated | Run `npx prisma generate` |
| `Migration failed` | Schema out of sync with DB | Run `npx prisma migrate dev` |
| `Unauthorized` on all API routes | JWT_SECRET mismatch or expired token | Clear cookies and log in again; check `JWT_SECRET` hasn't changed |
| `Rate limiter unavailable, allowing request` | Redis not configured | This is a warning, not an error. Set `UPSTASH_REDIS_REST_URL` to enable Redis rate limiting |
| `Cannot read properties of null (reading 'companyId')` | User not logged in when calling API | Ensure `getCurrentUser()` returns a user before using it |

---

## How to Add a New Feature

1. **Schema change:** Edit `prisma/schema.prisma`, run `npx prisma migrate dev --name add_your_feature`
2. **API route:** Create `app/api/your-feature/route.ts`:
   - Call `getCurrentUser()` and return 401 if null
   - Validate input with `z.object({...}).safeParse(body)`
   - Filter all queries with `companyId: user.companyId`
   - Create audit log entry with `createAuditLog()`
3. **UI component:** Create `components/your-feature.tsx` with `"use client"` directive
4. **Page:** Create `app/dashboard/your-feature/page.tsx`
5. **Types:** Update `types/index.ts` with new interfaces
6. **Tests:** Add unit tests in `__tests__/` and integration tests in `tests/` as needed

---



### Core Features
- ✅ **Multi-Tenant SaaS Architecture** - Complete company isolation with JWT authentication
- ✅ **Secure Cloud Storage** - AWS S3 with AES-256 encryption at rest
- ✅ **Document Management** - Upload, organize, version, and manage documents up to 200 MB
- ✅ **Folder Organization** - Hierarchical folder structure with project-based organization
- ✅ **Full-Text Search** - Search documents by title, description, filename, tags, and project phase
- ✅ **Approval Workflows** - Draft → Pending → Approved status with email notifications
- ✅ **Commenting System** - Threaded comments on documents for collaboration
- ✅ **Version Control** - Track document versions with change notes

### Security & Compliance
- ✅ **Role-Based Access Control (RBAC)** - IT Admin, Project Admin, Engineer, Client roles
- ✅ **Two-Factor Authentication (2FA)** - TOTP with QR code setup
- ✅ **AES-256-GCM Encryption** - Authenticated encryption with random IV per file
- ✅ **Security Headers** - HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- ✅ **Immutable Audit Logging** - Complete audit trail with 7-year retention
- ✅ **Rate Limiting** - Protection against abuse (100 req/15min default)
- ✅ **Multi-Tenant Isolation** - Strict data segregation by company
- ✅ **PDPA/GDPR Compliance** - Data export and account deletion tools
- 📄 **Security Policy** - See [SECURITY.md](SECURITY.md) for full details

### Email & Notifications
- ✅ **Real Email System** - Resend integration for all notifications
- ✅ **User Invitations** - Email invites with secure tokens
- ✅ **Password Reset** - One-time reset links
- ✅ **Upload Notifications** - Notify team members of new documents
- ✅ **Approval Requests** - Alert approvers when action is needed

### Analytics & Reporting
- ✅ **Storage Analytics** - Per-company storage usage tracking
- ✅ **Activity Dashboard** - Recent activity and document statistics
- ✅ **Top Contributors** - Track most active users
- ✅ **Document Status Reports** - Breakdown by draft/pending/approved

---

## 🏗️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | PostgreSQL (Neon / Render) |
| **ORM** | Prisma v7 with PostgreSQL adapter |
| **Storage** | AWS S3 (or Backblaze B2) with encryption |
| **Email** | Resend (or SendGrid) |
| **Authentication** | JWT in httpOnly cookies, bcryptjs |
| **2FA** | Speakeasy (TOTP) |
| **Monitoring** | Sentry (error tracking) |
| **UI Components** | shadcn/ui, Radix UI |
| **State Management** | Zustand |

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js 20+** and **npm** installed
2. **PostgreSQL database** (local or cloud via Neon/Render)
3. **AWS S3 bucket** (or Backblaze B2) for document storage
4. **Resend account** for email (or SendGrid)
5. **Git** for version control

---

## 🚀 Quick Start (Development)

### 1. Clone the Repository

```bash
git clone https://github.com/Fujiorange/DocuRoute.git
cd DocuRoute
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required environment variables:**

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
JWT_SECRET="your-64-char-random-hex-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AWS S3 Storage
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="ap-southeast-1"
AWS_S3_BUCKET="your-bucket-name"

# Encryption (32 bytes / 64 hex chars)
ENCRYPTION_KEY="your-64-char-encryption-key"

# Email (Resend)
RESEND_API_KEY="re_your-resend-api-key"
EMAIL_FROM="noreply@yourdomain.com"

# Optional: Sentry
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project"
```

Generate secure secrets:

```bash
# Generate JWT_SECRET and ENCRYPTION_KEY
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up Database

Run Prisma migrations:

```bash
npx prisma migrate dev
```

This creates all necessary tables in your database.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create Your First Account

1. Go to `/register`
2. Fill in company name, your name, email, and password
3. You'll be registered as the **IT Admin** of your company
4. Start inviting team members!

---

## 🌐 Production Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

2. **Connect to Vercel**

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables**

   In Vercel dashboard → Settings → Environment Variables, add all production values:

   - `DATABASE_URL` (Neon PostgreSQL recommended)
   - `JWT_SECRET`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
   - `ENCRYPTION_KEY`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `SENTRY_DSN` (optional)
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g., `https://docuroute.vercel.app`)

4. **Deploy**

   Vercel automatically builds and deploys. Visit your production URL!

### Deploy to Render

1. **Create Web Service**

   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect your GitHub repo

2. **Configure Build**

   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

3. **Add Environment Variables**

   Same as Vercel (see above).

4. **Deploy**

   Render builds and deploys automatically.

---

## 🗄️ Database Migrations

### Create a New Migration

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

### Apply Migrations in Production

```bash
npx prisma migrate deploy
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

---

## 📧 Email Setup

### Using Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use resend.dev for testing)
3. Get your API key
4. Set `RESEND_API_KEY` in `.env.local`

### Using SendGrid (Alternative)

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get your API key
3. Update `lib/email.ts` to use SendGrid SDK
4. Set `SENDGRID_API_KEY` in `.env.local`

---

## 🔐 Security

DocuRoute implements production-grade security hardening for multi-tenant SaaS applications. See [SECURITY.md](SECURITY.md) for complete details.

### Core Security Features

✅ **AES-256-GCM Encryption**
- Authenticated encryption with Galois/Counter Mode
- Random 16-byte IV per file
- 16-byte authentication tag for integrity verification
- Detects tampering or wrong key decryption

✅ **Multi-Tenant Isolation**
- All resources scoped to `companyId`
- Database queries enforce company-level filtering
- No cross-tenant data access possible
- Tested with comprehensive isolation test suite

✅ **Immutable Audit Logging**
- All security-relevant operations logged
- No UPDATE/DELETE operations on audit logs
- 7-year retention for compliance
- IP address tracking with X-Forwarded-For support

✅ **Security Headers**
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `Strict-Transport-Security` - HSTS with 1-year max-age (production)
- `Content-Security-Policy` - Minimal CSP for XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts camera, microphone, geolocation

✅ **Authentication & Authorization**
- JWT tokens in httpOnly cookies (XSS protection)
- bcrypt password hashing (12 rounds)
- TOTP-based 2FA (Speakeasy)
- Role-based access control (IT_ADMIN, PROJECT_ADMIN, ENGINEER, CLIENT)

✅ **Rate Limiting**
- In-memory rate limiter with Redis backing (optional)
- 100 requests per 15 minutes per IP (public endpoints)
- Stricter limits on sensitive endpoints (login: 5/15min)
- Graceful fallback if Redis unavailable

✅ **Input Validation**
- Zod schemas for all API inputs (planned)
- File type validation with magic number checking (planned)
- Filename sanitization
- SQL injection prevention via Prisma ORM

### Security Checklist for Phase 2

Before moving to Phase 2, ensure:

- [x] AES-256-GCM encryption implemented with auth tags
- [x] Custom DecryptionError for graceful wrong-key handling
- [x] Security headers added to middleware
- [x] Multi-tenant isolation test suite (5 tests)
- [x] RBAC permission test suite (7 tests)
- [x] Encryption cycle tests with large files + wrong key scenarios
- [x] Immutable audit log tests
- [x] Rate limiting test suite (8 tests)
- [x] CI/CD pipeline with coverage enforcement (65% threshold)
- [x] SECURITY.md documentation
- [x] Zod validation on all API routes (login, register)
- [x] Comprehensive security test suite (28 tests)
- [x] SECURITY-TESTING.md guide for beginners
- [ ] File type magic number validation
- [ ] `/api/auth/logout` route with audit logging
- [ ] Upstash Redis integration for distributed rate limiting
- [ ] Third-party security audit

### 🧪 Testing Your Security Implementation

**New!** We've created a comprehensive security test suite that validates all implemented features.

📖 **[SECURITY-TESTING.md](SECURITY-TESTING.md)** - Complete testing guide (perfect for beginners!)

Quick test:
```bash
npm test tests/security-comprehensive.test.ts
```

See [Testing](#-testing) section for details.

### Reporting Security Issues

See [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

---

## 👥 Roles & Permissions

| Role | Permissions |
|------|------------|
| **IT Admin** | Full access: manage company, users, projects, documents, settings |
| **Project Admin** | Create/manage projects, invite users, approve documents |
| **Engineer** | Upload/edit documents, view all, comment, cannot delete |
| **Client** | View-only access to specific folders, download, comment |

---

## 📊 PDPA/GDPR Compliance

### Data Export

Users can export all their data:

```
GET /api/pdpa/export?format=json  // or format=csv
```

Exports:
- User profile
- Documents metadata
- Comments
- Audit logs (last 1000)

### Account Deletion

Request deletion with 30-day grace period:

```
POST /api/pdpa/delete-account
```

User is deactivated immediately, permanent deletion after 30 days.

### Data Retention

- Documents: 7 years (Singapore construction industry standard)
- Audit logs: 7 years
- Configurable via `DATA_RETENTION_DAYS`

---

## 🧪 Testing

### Quick Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 🔒 Security Testing (NEW)

We've implemented comprehensive security tests for all critical features. **Perfect for beginners!**

#### Run Security Tests

```bash
# Run comprehensive security test suite
npm test tests/security-comprehensive.test.ts
```

#### What Gets Tested

✅ **6 Security Test Suites** covering:
1. **AES-256-GCM Encryption** - 12-byte IV, auth tags, tamper detection (5 tests)
2. **Zod Input Validation** - Email, password, SQL injection, XSS protection (6 tests)
3. **Rate Limiting** - IP-based limiting, Redis fallback, time windows (4 tests)
4. **JWT Authentication** - Token signing, verification, expiry, tampering (4 tests)
5. **Password Hashing** - bcrypt with salts, verification, fake hash detection (5 tests)
6. **Multi-Tenant Isolation** - Company data segregation, no cross-tenant leaks (4 tests)

**Total: 28 security tests** ensuring production-ready security

#### Expected Results

✅ **All tests passing** = Secure implementation
```
✓ tests/security-comprehensive.test.ts (28)
Test Files  1 passed (1)
     Tests  28 passed (28)
```

❌ **Tests failing** = Security vulnerabilities detected
```
✗ should use 12-byte IV for GCM mode (CRITICAL)
Test Files  1 failed (1)
     Tests  1 failed, 27 passed (28)
```

#### Detailed Testing Guide

For step-by-step instructions, expected results, and fixing common failures:

📖 **[Read SECURITY-TESTING.md](SECURITY-TESTING.md)** - Complete guide for beginners

This guide includes:
- Prerequisites and setup
- How to run each test suite
- What each test means
- Expected passing/failing results
- How to fix common issues
- Advanced testing techniques

#### Integration Tests

```bash
# Run existing integration tests (requires database)
npm test tests/documents/encryption.test.ts
npm test tests/auth/permissions.test.ts
npm test tests/isolation/tenant-isolation.test.ts
npm test tests/security/rate-limiting.test.ts
npm test tests/audit/audit-logging.test.ts
```

**Note:** Integration tests require PostgreSQL database. See [Database Setup](#4-set-up-database).

---

## 📁 Project Structure

```
DocuRoute/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication (login, register, 2FA, password reset)
│   │   ├── documents-v2/     # S3-based document management
│   │   ├── folders/          # Folder management
│   │   ├── pdpa/             # PDPA compliance (export, delete)
│   │   ├── search/           # Full-text search
│   │   └── analytics/        # Analytics and reporting
│   ├── dashboard/            # Dashboard pages
│   ├── login/                # Login page
│   └── register/             # Registration page
├── components/               # React components
│   └── ui/                   # shadcn/ui components
├── lib/                      # Utility libraries
│   ├── auth.ts               # JWT auth helpers
│   ├── prisma.ts             # Prisma client
│   ├── storage.ts            # S3 storage with encryption
│   ├── email.ts              # Email service (Resend)
│   ├── two-factor.ts         # TOTP 2FA
│   ├── permissions.ts        # RBAC permissions
│   ├── audit.ts              # Audit logging
│   ├── rate-limit.ts         # Rate limiting
│   ├── errors.ts             # Error handling
│   └── pdpa.ts               # PDPA compliance tools
├── prisma/                   # Database
│   └── schema.prisma         # Database schema
├── public/                   # Static assets
├── .env.example              # Environment variables template
├── package.json              # Dependencies
└── README.md                 # This file
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
npx prisma db pull
```

If it fails, verify `DATABASE_URL` in `.env.local`.

### S3 Upload Failures

- Check AWS credentials are correct
- Verify bucket exists and region matches
- Ensure IAM user has `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions

### Email Not Sending

- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for domain verification
- In development, emails are logged to console if `RESEND_API_KEY` is missing

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

---

## 📝 API Documentation

### Authentication

- `POST /api/auth/register` - Register new company + admin user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (clear cookie)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm password reset
- `POST /api/auth/2fa/setup` - Generate 2FA secret + QR code
- `POST /api/auth/2fa/verify` - Verify 2FA token and enable

### Documents

- `GET /api/documents-v2` - List documents (with filters)
- `POST /api/documents-v2` - Upload document to S3
- `GET /api/documents-v2/[id]/download` - Get signed download URL
- `POST /api/documents-v2/[id]/approval` - Change approval status
- `GET /api/documents-v2/[id]/comments` - Get comments
- `POST /api/documents-v2/[id]/comments` - Add comment

### Folders

- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder

### Search

- `GET /api/search?q=query` - Full-text search documents

### Analytics

- `GET /api/analytics` - Get company analytics (IT Admin only)

### PDPA

- `GET /api/pdpa/export?format=json` - Export user data
- `POST /api/pdpa/delete-account` - Request account deletion

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Prisma](https://www.prisma.io/)
- Email by [Resend](https://resend.com/)
- Storage by [AWS S3](https://aws.amazon.com/s3/)

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [https://github.com/Fujiorange/DocuRoute/issues](https://github.com/Fujiorange/DocuRoute/issues)
- **Email**: support@docuroute.com

---

**Made with ❤️ for Singapore construction and engineering companies**
