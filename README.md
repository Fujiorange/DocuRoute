# DocuRoute
Document management SaaS for regulated heavy industries.

## Authorization Model
Hybrid PBAC + System Roles:
- Permission enum drives ALL authorization checks
- System roles (hardcoded): COMPANY_OWNER, COMPANY_ADMIN, DOCUMENT_CONTROLLER,
  AUDITOR, BILLING_CONTACT, PLATFORM_ADMIN — immutable, ISO 9001 compliant
- Custom roles (DB-driven): companies create roles with any Permission subset

## Tech Stack
Next.js 15, TypeScript, Tailwind, shadcn/ui, Prisma, PostgreSQL (Supabase),
Cloudflare R2, NextAuth v5 (stable), Resend, Stripe, BullMQ + ioredis,
workerpool (PDF processing), qrcode (field safety verification)

## Running Locally
1. pnpm install
2. Copy .env.example files to .env.local in apps/web and apps/worker
3. pnpm dev
