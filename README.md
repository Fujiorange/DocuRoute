# DocuRoute - Production-Grade Document Management SaaS

**Enterprise document management platform for Singapore construction and engineering companies**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-teal)](https://www.prisma.io/)

---

## 🚀 Features

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
