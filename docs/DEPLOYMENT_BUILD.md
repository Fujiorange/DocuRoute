# Deployment Build Process

## Overview

This document outlines the build process for DocuRoute across different deployment platforms. The key requirement is ensuring `prisma generate` runs before building applications that depend on the Prisma client.

## Problem Statement

**Issue:** Stale Prisma client errors in production builds

**Cause:** Build commands were missing `prisma generate` step, causing TypeScript builds to use outdated or missing Prisma client types.

**Solution:** Add `prisma generate` to all build configurations before compiling TypeScript.

## Build Architecture

### Monorepo Structure

```
docuroute/
├── apps/
│   ├── web/          # Next.js application (Vercel)
│   ├── worker/       # BullMQ worker (Render)
│   └── pdf-worker/   # Go microservice (Render Docker)
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── core/         # Business logic
│   ├── types/        # TypeScript types
│   └── emails/       # React Email templates
└── package.json      # Root workspace config
```

### Build Dependencies

```mermaid
graph TD
    A[prisma generate] --> B[Build @docuroute/db]
    B --> C[Build @docuroute/core]
    B --> D[Build @docuroute/web]
    B --> E[Build @docuroute/worker]
    C --> D
    C --> E
```

**Critical Path:**
1. `prisma generate` (generates Prisma client)
2. Build `@docuroute/db` package
3. Build dependent packages and apps

## Deployment Platforms

### 1. Render.com

**Services:**
- BullMQ Worker
- Retention Cron Job
- Vault Integrity Cron Job
- PDF Worker (Docker)

**Build Configuration:** `render.yaml`

```yaml
# BullMQ Worker
- type: worker
  name: docuroute-worker
  runtime: node
  buildCommand: |
    pnpm install
    pnpm --filter @docuroute/db exec prisma generate
    pnpm --filter @docuroute/worker build
  startCommand: pnpm --filter @docuroute/worker start

# Retention Cron Job
- type: cron
  name: docuroute-retention-cron
  runtime: node
  schedule: "0 2 * * *"
  buildCommand: |
    pnpm install
    pnpm --filter @docuroute/db exec prisma generate
    pnpm --filter @docuroute/worker build
  startCommand: node apps/worker/dist/crons/retention.js

# Vault Integrity Cron Job
- type: cron
  name: docuroute-vault-integrity-cron
  runtime: node
  schedule: "0 3 * * *"
  buildCommand: |
    pnpm install
    pnpm --filter @docuroute/db exec prisma generate
    pnpm --filter @docuroute/worker build
  startCommand: node apps/worker/dist/crons/vault-integrity.js
```

**Key Points:**
- Use `|` for multi-line commands in YAML
- Run `prisma generate` before building worker
- Each cron job needs its own `prisma generate` step

### 2. Vercel

**Service:** Next.js Web Application

**Build Configuration:** `vercel.json`

```json
{
  "buildCommand": "pnpm install && pnpm --filter @docuroute/db exec prisma generate && pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

**Key Points:**
- Single-line command with `&&` chaining
- Install → Generate → Build sequence
- Vercel uses Node.js 20 by default

### 3. Docker

**Service:** Next.js Web Application (alternative to Vercel)

**Build Configuration:** `Dockerfile`

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10.32.1

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @docuroute/db exec prisma generate
RUN pnpm build

# Stage 2: Runner
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10.32.1

WORKDIR /app
COPY --from=builder /app/apps/web/.next /app/apps/web/.next
COPY --from=builder /app/apps/web/public /app/apps/web/public
COPY --from=builder /app/packages /app/packages

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
```

**Key Points:**
- Multi-stage build for smaller image size
- Generate Prisma client in builder stage
- Copy generated client to runner stage

### 4. Local Development

**Build Configuration:** `package.json`

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "prebuild": "pnpm --filter @docuroute/db exec prisma generate",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  }
}
```

**Key Points:**
- `prebuild` hook runs automatically before `build`
- Ensures Prisma client is always fresh
- Works with Turbo caching

## Build Commands Reference

### Generate Prisma Client

```bash
# From root
pnpm --filter @docuroute/db exec prisma generate

# From packages/db
cd packages/db
pnpm prisma generate
```

### Build Entire Monorepo

```bash
# From root (uses prebuild hook)
pnpm build

# Or explicitly
pnpm --filter @docuroute/db exec prisma generate
pnpm build
```

### Build Specific Package

```bash
# Web app
pnpm --filter web build

# Worker
pnpm --filter @docuroute/worker build
```

### Development Mode

```bash
# Start all services in dev mode
pnpm dev

# Start specific service
pnpm --filter web dev
pnpm --filter @docuroute/worker dev
```

## Troubleshooting

### Error: Cannot find module '@prisma/client'

**Cause:** Prisma client not generated

**Solution:**
```bash
pnpm --filter @docuroute/db exec prisma generate
```

### Error: Type errors in Prisma client

**Cause:** Schema changed but client not regenerated

**Solution:**
```bash
# Regenerate after schema changes
pnpm --filter @docuroute/db exec prisma generate

# Or run full build
pnpm build
```

### Error: Stale Prisma client in production

**Cause:** Build command missing `prisma generate`

**Solution:**
1. Check build configuration (render.yaml, vercel.json)
2. Ensure `prisma generate` runs before build
3. Redeploy with updated configuration

### Error: Build fails on Render/Vercel

**Checklist:**
- [ ] `pnpm-lock.yaml` is up to date
- [ ] `prisma generate` in build command
- [ ] Environment variables set (DATABASE_URL, etc.)
- [ ] Node.js version matches (20.x)
- [ ] Build command uses correct filter syntax

## Database Migrations

### Apply Migrations

```bash
# Development (with auto-create migrations)
pnpm --filter @docuroute/db exec prisma migrate dev

# Production (apply existing migrations)
pnpm --filter @docuroute/db exec prisma migrate deploy
```

### Migration Process

1. **Develop locally:**
   ```bash
   # Make schema changes
   vim packages/db/prisma/schema.prisma

   # Create migration
   pnpm --filter @docuroute/db exec prisma migrate dev --name add_classification_society
   ```

2. **Deploy to production:**
   ```bash
   # Migrations run automatically on Render/Vercel
   # Or manually via CLI
   pnpm --filter @docuroute/db exec prisma migrate deploy
   ```

3. **Post-migration SQL:**
   Some features require manual SQL execution (see `DEPLOYMENT_CHECKLIST.md`):
   - GIN indexes
   - Triggers (audit vault immutability)
   - Extensions (pg_trgm)

## Environment Variables

### Required for Build

```bash
# Prisma
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

# Node.js
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=1536
```

### Build-Time vs Runtime

| Variable | Build | Runtime | Notes |
|----------|-------|---------|-------|
| DATABASE_URL | Required | Required | Prisma needs it for generation |
| REDIS_URL | Optional | Required | Not needed for build |
| R2_* | Optional | Required | Not needed for build |
| NEXTAUTH_SECRET | Optional | Required | Not needed for build |

## Performance Optimization

### Turbo Caching

Turbo caches build outputs to speed up rebuilds:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

**Benefits:**
- Skips rebuilding unchanged packages
- Shares cache across team (with Turbo Remote Cache)
- Speeds up CI/CD pipelines

### Frozen Lockfile

Always use `--frozen-lockfile` in production:

```bash
pnpm install --frozen-lockfile
```

**Benefits:**
- Ensures reproducible builds
- Prevents surprise dependency updates
- Faster install (no resolution)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 10.32.1

      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm --filter @docuroute/db exec prisma generate

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test
```

## Best Practices

### 1. Always Generate Before Build

❌ **Don't:**
```bash
pnpm build  # Missing prisma generate
```

✅ **Do:**
```bash
pnpm --filter @docuroute/db exec prisma generate
pnpm build
```

Or use the `prebuild` hook (already configured).

### 2. Use Frozen Lockfile in Production

❌ **Don't:**
```bash
pnpm install  # Might update dependencies
```

✅ **Do:**
```bash
pnpm install --frozen-lockfile
```

### 3. Verify Build Locally First

Before deploying, test build locally:

```bash
# Clean build from scratch
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm -rf apps/*/.next apps/*/dist packages/*/dist

# Fresh install and build
pnpm install --frozen-lockfile
pnpm build
```

### 4. Check Prisma Client After Schema Changes

After modifying `schema.prisma`:

```bash
# Always regenerate
pnpm --filter @docuroute/db exec prisma generate

# Check TypeScript types
pnpm typecheck
```

### 5. Monitor Build Logs

Watch for warnings during build:

```bash
# Look for:
# - "Prisma Client not found"
# - "Module not found: @prisma/client"
# - Type errors in generated code
```

## Deployment Checklist

Before deploying to production:

- [ ] Schema changes committed to git
- [ ] Migrations created and tested locally
- [ ] `prisma generate` in build configuration
- [ ] Environment variables set on platform
- [ ] Build succeeds locally with `pnpm build`
- [ ] Tests pass with `pnpm test`
- [ ] Post-migration SQL ready (if needed)
- [ ] Rollback plan documented

## Related Documentation

- [Classification Society Webhooks](./CLASSIFICATION_SOCIETY_WEBHOOKS.md)
- [RLS Transaction Safety](./RLS_TRANSACTION_SAFETY.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- Prisma Documentation: https://www.prisma.io/docs
- Render Documentation: https://render.com/docs
- Vercel Documentation: https://vercel.com/docs

## Support

For build issues:
- Check build logs on Render/Vercel dashboard
- Run build locally to reproduce
- Verify `prisma generate` is in build command
- Check Node.js version matches (20.x)
- Ensure environment variables are set
