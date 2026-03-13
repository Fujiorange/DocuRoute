# P0/P1 Monorepo Scaffold Test Guide

This document describes how to verify the DocuRoute monorepo scaffold is correctly set up.

## 1. Verify Monorepo Structure

Run the following command and confirm all directories and files exist:

```bash
find /home/runner/work/DocuRoute/DocuRoute -not -path '*/\.*' -not -path '*/node_modules/*' -type f | sort
```

Expected top-level structure:
- `apps/web/` — Next.js 14 App Router
- `apps/worker/` — Node.js BullMQ worker
- `packages/core/` — shared business logic
- `packages/db/` — Prisma schema and client
- `packages/types/` — shared TypeScript types
- `packages/emails/` — React Email templates
- `pnpm-workspace.yaml`
- `turbo.json`
- `package.json`
- `.gitignore`
- `README.md`

## 2. Verify pnpm Workspace Configuration

Check `/home/runner/work/DocuRoute/DocuRoute/pnpm-workspace.yaml`:
- Must contain `apps/*` and `packages/*` entries
- Must use YAML format

Check `/home/runner/work/DocuRoute/DocuRoute/package.json`:
- Must have `"private": true`
- Must have turbo scripts: `dev`, `build`, `lint`, `test`, `typecheck`

## 3. Verify Turbo Configuration

Check `/home/runner/work/DocuRoute/DocuRoute/turbo.json`:
- Must have `$schema` pointing to turbo build schema
- Must have `pipeline` with `build`, `dev`, `lint`, `typecheck`, `test`
- `build` must have `dependsOn: ["^build"]`
- `dev` must have `cache: false` and `persistent: true`

## 4. Verify apps/web Next.js Setup

Files to check:
- `apps/web/package.json` — name `@docuroute/web`, next@14.2.29 dependency
- `apps/web/tsconfig.json` — moduleResolution bundler, jsx preserve, paths `@/*`
- `apps/web/next.config.ts` — transpilePackages for all @docuroute/* packages
- `apps/web/tailwind.config.ts` — darkMode class, full color palette with CSS vars
- `apps/web/postcss.config.mjs` — tailwindcss and autoprefixer plugins
- `apps/web/components.json` — shadcn/ui config with rsc:true, tsx:true
- `apps/web/src/app/layout.tsx` — RootLayout with Inter font and metadata
- `apps/web/src/app/page.tsx` — Home page component
- `apps/web/src/app/globals.css` — Tailwind directives + CSS variables
- `apps/web/src/lib/utils.ts` — cn() utility using clsx + tailwind-merge

## 5. Verify apps/worker Setup

Files to check:
- `apps/worker/package.json` — name `@docuroute/worker`, bullmq and ioredis deps
- `apps/worker/tsconfig.json` — target ES2022, module commonjs
- `apps/worker/src/index.ts` — basic entry point

## 6. Verify packages

### packages/db
- `packages/db/package.json` — name `@docuroute/db`, @prisma/client dep
- `packages/db/tsconfig.json` — declaration:true, declarationMap:true
- `packages/db/src/index.ts` — exports PrismaClient and all prisma client exports
- `packages/db/prisma/schema.prisma` — Company, User, CustomRole, UserCustomRole models + SystemRole enum

### packages/types
- `packages/types/package.json` — name `@docuroute/types`
- `packages/types/src/index.ts` — Permission enum (27 values), SystemRole enum (6 values), SYSTEM_ROLE_PERMISSIONS map, UserRole union type
- Verify Permission enum includes: document, user, role, company, billing, audit, platform permissions
- Verify SystemRole includes: COMPANY_OWNER, COMPANY_ADMIN, DOCUMENT_CONTROLLER, AUDITOR, BILLING_CONTACT, PLATFORM_ADMIN

### packages/core
- `packages/core/package.json` — name `@docuroute/core`, depends on @docuroute/types
- `packages/core/src/index.ts` — ZERO imports from next/react/react-dom
- Must export: `resolvePermissions`, `hasPermission`, `requirePermission`, `hasAllPermissions`, `hasAnyPermission`
- `requirePermission` must throw `Error` with message containing the missing permission name

### packages/emails
- `packages/emails/package.json` — name `@docuroute/emails`, @react-email/components dep
- `packages/emails/tsconfig.json` — jsx: "react"
- `packages/emails/src/index.ts` — exports from welcome template
- `packages/emails/src/templates/welcome.tsx` — WelcomeEmail component using React Email components

## 7. Verify shadcn/ui Components

All components should exist in `apps/web/src/components/ui/`:
- `accordion.tsx` — uses @radix-ui/react-accordion
- `alert.tsx` — Alert, AlertTitle, AlertDescription
- `avatar.tsx` — uses @radix-ui/react-avatar
- `badge.tsx` — Badge with variants
- `button.tsx` — Button with CVA variants (default, destructive, outline, secondary, ghost, link)
- `card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `command.tsx` — uses cmdk
- `dialog.tsx` — uses @radix-ui/react-dialog
- `dropdown-menu.tsx` — uses @radix-ui/react-dropdown-menu
- `form.tsx` — uses react-hook-form
- `input.tsx` — basic input component
- `label.tsx` — uses @radix-ui/react-label
- `popover.tsx` — uses @radix-ui/react-popover
- `progress.tsx` — uses @radix-ui/react-progress
- `select.tsx` — uses @radix-ui/react-select
- `separator.tsx` — uses @radix-ui/react-separator
- `sheet.tsx` — uses @radix-ui/react-dialog (side panel)
- `skeleton.tsx` — animated loading placeholder
- `table.tsx` — Table with full set of sub-components
- `tabs.tsx` — uses @radix-ui/react-tabs
- `toast.tsx` — uses @radix-ui/react-toast
- `tooltip.tsx` — uses @radix-ui/react-tooltip

## 8. Verify .gitignore

Check `/home/runner/work/DocuRoute/DocuRoute/.gitignore`:
- Must ignore: `node_modules/`, `.next/`, `dist/`, `.env`, `.env.local`, `.turbo/`, `*.tsbuildinfo`

## 9. Verify README

Check `/home/runner/work/DocuRoute/DocuRoute/README.md`:
- Must contain Authorization Model section
- Must mention hybrid PBAC + System Roles
- Must list Tech Stack
- Must have Running Locally instructions with `pnpm install` and `pnpm dev`
