# P0/P1 Monorepo Scaffold Summary

## What Was Done

This document summarizes the complete production-grade monorepo scaffold created for DocuRoute — a document management SaaS for regulated heavy industries.

## Repository Structure

```
DocuRoute/
  apps/
    web/          ← Next.js 15 App Router (Vercel deployment target)
    worker/       ← Node.js BullMQ worker process
  packages/
    core/         ← Shared business logic (zero framework imports)
    db/           ← Prisma schema, client, migrations
    types/        ← Shared TypeScript types, Permission enum, enums
    emails/       ← React Email templates
  pnpm-workspace.yaml
  turbo.json
  package.json
  .gitignore
  README.md
  docs/
    tests/P0P1_Test.md
    summaries/P0P1_Summary.md
```

## Key Decisions

### Package Manager: pnpm with Workspaces
- `pnpm-workspace.yaml` defines `apps/*` and `packages/*` as workspace packages
- Each package uses `workspace:*` to reference sibling packages

### Build System: Turborepo
- `turbo.json` pipeline: build depends on `^build` (build dependencies first)
- Dev mode is persistent and uncached
- Build outputs: `.next/**` and `dist/**`

### Authorization Model: Hybrid PBAC + System Roles
The core authorization design is in `packages/types/src/index.ts` and `packages/core/src/index.ts`:

1. **Permission enum** (27 permissions) — the single source of truth for all authorization checks
2. **SystemRole enum** (6 roles) — immutable, hardcoded, ISO 9001 compliant
3. **SYSTEM_ROLE_PERMISSIONS** — maps each system role to its permission set
4. **UserRole discriminated union** — either `{ type: "system", role: SystemRole }` or `{ type: "custom", permissions: Permission[] }`

Authorization functions in `packages/core`:
- `resolvePermissions(role)` — get all permissions for a role
- `hasPermission(role, permission)` — check single permission
- `requirePermission(role, permission)` — throw if missing (server-side guard)
- `hasAllPermissions(role, permissions[])` — check all permissions
- `hasAnyPermission(role, permissions[])` — check any permission

### packages/core: Zero Framework Imports
The `packages/core` package contains ONLY pure TypeScript business logic with NO imports from Next.js, React, or react-dom. This ensures it can be safely used in:
- Next.js server components and API routes
- BullMQ worker processes
- Any future services (microservices, CLI tools, etc.)

### apps/web: Next.js 15 App Router
- Full shadcn/ui component library (21 components)
- Tailwind CSS with CSS variables for theming
- Dark mode support via `darkMode: ["class"]`
- TypeScript strict mode
- Path aliases: `@/*` → `./src/*`

### apps/worker: BullMQ Worker
- TypeScript with CommonJS output (Node.js compatible)
- BullMQ for job queue processing
- ioredis for Redis connection

### packages/db: Prisma
- PostgreSQL with Supabase as target
- Models: Company, User, CustomRole, UserCustomRole
- SystemRole enum in database mirrors TypeScript enum
- Compound unique constraint on CustomRole(companyId, name)

### packages/emails: React Email
- WelcomeEmail template as starting point
- JSX compiled with `jsx: "react"` (not preserve, as this is not Next.js)

## Prisma Schema Design

The multi-tenant schema supports:
- **Company** — top-level tenant
- **User** — belongs to company, has one system role
- **CustomRole** — company-defined roles with permission arrays (stored as String[])
- **UserCustomRole** — many-to-many join table (users can have multiple custom roles)

## Tech Stack
- **Frontend**: Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes / Server Actions, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Storage**: Cloudflare R2 (planned)
- **Auth**: NextAuth v5 (planned)
- **Email**: Resend + React Email
- **Payments**: Stripe (planned)
- **Queue**: BullMQ + ioredis
- **PDF**: workerpool (planned)
- **Build**: Turborepo + pnpm workspaces
- **Deployment**: Vercel (web), separate Node.js process (worker)
