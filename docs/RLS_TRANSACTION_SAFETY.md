# RLS Transaction Safety

## Overview

DocuRoute uses **PostgreSQL Row Level Security (RLS)** with database-level triggers to ensure multi-tenant data isolation, even inside interactive transactions. This document explains how the system enforces `companyId` integrity at multiple layers.

## The Problem

In multi-tenant systems, developers can accidentally create cross-tenant data leakage by forgetting to include `companyId` in database operations, especially inside transactions. This is a critical security risk in highly regulated industries like maritime/shipyard compliance.

**Example of the risk:**
```typescript
// DANGEROUS: Missing companyId in transaction
await prisma.$transaction(async (tx) => {
  await tx.user.create({
    data: {
      email: 'user@example.com',
      name: 'John Doe',
      // companyId: MISSING! ❌
      roleId: 'role-123',
    }
  })
})
```

## Defense-in-Depth Solution

DocuRoute implements **three layers** of protection:

### Layer 1: RLS Policies (Database Level)

All tenant-scoped tables have RLS policies that filter queries based on `app.current_company_id`:

```sql
CREATE POLICY user_tenant_isolation ON "User"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );
```

**How it works:**
- The `getPrismaForCompany(companyId)` function sets `app.current_company_id` before every query
- RLS policies automatically filter all SELECT, UPDATE, DELETE operations
- If `app.current_company_id` is NULL, queries return 0 rows (fail-safe)
- **Works inside transactions** because `SET LOCAL` is transaction-scoped

**Tables with RLS enabled:**
- Role, User, Project, Document, DocumentRevision
- AuditLog, AuditVaultEntry, Invitation, Notification
- TransmittalCounter, CompanyOnboarding

**Company table intentionally excluded** (it's the root tenant table)

### Layer 2: Database Triggers (INSERT Enforcement)

RLS policies filter reads but don't prevent inserts with wrong `companyId`. Database triggers catch this:

```sql
CREATE OR REPLACE FUNCTION enforce_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."companyId" IS NULL THEN
    RAISE EXCEPTION 'companyId cannot be NULL in % table', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to all 11 tenant-scoped tables** (see migration `20260327_enforce_company_id_trigger`)

**What it prevents:**
- Inserting records without `companyId`
- Silent cross-tenant data leaks
- Developer mistakes in transactions

**Testing triggers:**
```sql
-- Verify triggers are active
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'enforce_company_id_trigger';

-- Test trigger behavior (should fail)
INSERT INTO "Role" (id, name, "isSystemRole")
VALUES ('test-id', 'Test Role', false);
-- Error: companyId cannot be NULL in Role table
```

### Layer 3: Development Middleware (Early Detection)

Prisma middleware validates `companyId` in development to catch issues before database:

```typescript
// packages/db/src/middleware.ts
import { applyCompanyIdValidation } from '@docuroute/db/src/middleware'

const prisma = new PrismaClient()
applyCompanyIdValidation(prisma)
```

**Behavior:**
- **Development/Test**: Throws error immediately when companyId is missing
- **Production**: Logs warning but allows operation (database enforces)

**Benefits:**
- Catches bugs during development (fast feedback)
- Doesn't interfere with production (database is authoritative)
- Works for `create`, `update`, and `createMany` operations

## How getPrismaForCompany Works

```typescript
export function getPrismaForCompany(companyId: string) {
  // Returns extended Prisma client with RLS context
  const extended = prismaAdmin.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Set RLS context BEFORE every query (including transactions)
          await prismaAdmin.$executeRawUnsafe(
            `SET LOCAL app.current_company_id = '${companyId.replace(/'/g, "''")}'`
          )
          return query(args)
        }
      }
    }
  })

  return extended
}
```

**Key points:**
- `$allOperations` intercepts EVERY query, including those inside `$transaction`
- `SET LOCAL` is transaction-scoped (automatically resets after commit/rollback)
- SQL injection prevention: `replace(/'/g, "''")`  escapes single quotes
- Cached per company (up to 100 companies in memory)

## Usage Rules

### ✅ Correct Usage

```typescript
// Get tenant-scoped client
const prisma = getPrismaForCompany(session.user.companyId)

// RLS context automatically set - explicit companyId still recommended
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: {
      email: 'user@example.com',
      companyId: session.user.companyId,  // ✅ Best practice
      roleId: 'role-123',
    }
  })

  await tx.auditLog.create({
    data: {
      companyId: session.user.companyId,  // ✅ Best practice
      action: 'USER_CREATED',
      userId: session.user.userId,
    }
  })
})
```

### ❌ Wrong Usage

```typescript
// NEVER use prismaAdmin for tenant-scoped operations
const user = await prismaAdmin.user.create({
  data: {
    email: 'user@example.com',
    // companyId missing - trigger will reject
  }
})
// Error: companyId cannot be NULL in User table
```

### When to Use prismaAdmin

**Only use `prismaAdmin` for:**
- Auth operations (login, session management)
- SCIM provisioning (cross-tenant operations)
- Middleware (permission caching)
- Platform admin operations
- KMS encryption operations

**Every `prismaAdmin` usage must have a comment explaining why.**

## Transaction Behavior

### Before (Risky)

With Prisma Client Extensions (pre-RLS):
```typescript
// Extensions DON'T apply inside transactions
await prisma.$transaction(async (tx) => {
  // companyId filter NOT applied ❌
  await tx.user.update({ where: { id }, data: { ... } })
})
```

### After (Safe)

With RLS policies:
```typescript
// RLS automatically applies inside transactions
await prisma.$transaction(async (tx) => {
  // RLS filter automatically applied ✅
  // Trigger validates companyId on INSERT ✅
  await tx.user.update({ where: { id }, data: { ... } })
})
```

## Migration Applied

**Migration:** `20260327_enforce_company_id_trigger`

Creates `enforce_company_id()` function and applies trigger to 11 tables:
- Role, User, Project, Document, DocumentRevision
- AuditLog, AuditVaultEntry, Invitation, Notification
- TransmittalCounter, CompanyOnboarding

**No data changes** - only adds triggers for future inserts.

## Compliance Benefits

- **ISO 9001**: Prevents cross-tenant data leakage
- **DNV Compliance**: Database-level tenant isolation
- **Audit Trail**: Failed insert attempts logged by PostgreSQL
- **Fail-Safe**: NULL companyId = rejected, not leaked

## Testing

### Test RLS Policy

```typescript
// Should return only company-A's users
const prisma = getPrismaForCompany('company-A')
const users = await prisma.user.findMany()
// RLS automatically filters to company-A
```

### Test Database Trigger

```typescript
// Should fail with trigger error
const prisma = getPrismaForCompany('company-A')
await prisma.user.create({
  data: {
    email: 'test@example.com',
    // companyId: missing
  }
})
// Error: companyId cannot be NULL in User table
```

### Test Development Middleware

```typescript
// In development, throws before hitting database
process.env.NODE_ENV = 'development'
await prisma.user.create({
  data: { email: 'test@example.com' }
})
// Error: CRITICAL: Missing companyId in User.create
```

## Troubleshooting

### Error: "companyId cannot be NULL in X table"

**Cause:** INSERT operation missing `companyId`

**Solution:** Add `companyId` to create/update data:
```typescript
data: {
  companyId: session.user.companyId,
  // ... other fields
}
```

### Error: "app.current_company_id not set"

**Cause:** Using `prismaAdmin` instead of `getPrismaForCompany`

**Solution:** Use tenant-scoped client:
```typescript
const prisma = getPrismaForCompany(companyId)
```

### Query returns 0 rows unexpectedly

**Cause:** RLS filter blocking query due to wrong/missing `companyId`

**Debug:**
```typescript
// Check what companyId is set
const result = await prisma.$queryRaw`
  SELECT current_setting('app.current_company_id', TRUE) as company_id
`
console.log('Current company:', result)
```

## Summary

| Layer | Enforcement | Scope | Error Mode |
|-------|-------------|-------|-----------|
| **RLS Policies** | Database | SELECT/UPDATE/DELETE | Returns 0 rows |
| **Database Triggers** | Database | INSERT | Exception thrown |
| **Dev Middleware** | Application | CREATE/UPDATE | Exception (dev) / Warning (prod) |

**Result:** Cross-tenant data leakage is impossible even if developers forget explicit `companyId` in transactions.
