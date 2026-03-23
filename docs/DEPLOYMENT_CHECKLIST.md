# DocuRoute Deployment Checklist

This document tracks all post-deployment SQL commands and manual steps required after deploying schema migrations to production.

## Phase 1  Database Schema

### CRITICAL: Row Level Security (RLS) Migration

**SECURITY FIX (2026-03-23)**: The multi-tenancy architecture has been upgraded from application-level Prisma Client Extensions to database-level Row Level Security (RLS).

**Why this change is critical:**
- Previous approach: Prisma extensions injected `companyId` into queries, but extensions DO NOT apply inside interactive transactions
- Risk: One forgotten `companyId` in a transaction = cross-tenant data leakage
- New approach: RLS policies enforce tenant isolation at the database level, including inside transactions
- Benefit: Fail-safe default - if `companyId` is not set, queries return NOTHING (not another tenant's data)

**Migration file:** `packages/db/prisma/migrations/20260323_rls_multi_tenancy/migration.sql`

This migration must be run BEFORE deploying the updated application code. Run it manually in Supabase SQL Editor:

```bash
# Copy the SQL from the migration file and execute in Supabase SQL Editor
cat packages/db/prisma/migrations/20260323_rls_multi_tenancy/migration.sql
```

**Verification:**
```sql
-- Verify RLS is enabled on all tenant-scoped tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('Role', 'User', 'Project', 'Document', 'DocumentRevision', 'AuditLog', 'AuditVaultEntry', 'Invitation', 'Notification', 'TransmittalCounter', 'CompanyOnboarding')
ORDER BY tablename;
-- Expected: All tables should have rowsecurity = TRUE

-- Verify RLS policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: One policy per tenant-scoped table (11 policies total)
```

### Post-Migration SQL Commands

After running the RLS migration and Phase 1 migration (`npx prisma migrate deploy`), execute the following SQL commands in the Supabase SQL Editor:

#### 1. GIN Index for Role Permissions (REQUIRED)

```sql
-- Creates a GIN index for efficient permission array queries
-- REQUIRED for createNotificationsForPermission() to avoid full-table scans
CREATE INDEX IF NOT EXISTS idx_role_permissions ON "Role" USING GIN (permissions);
```

**Verification:**
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'Role' AND indexname = 'idx_role_permissions';
-- Expected: 1 row returned with indexname = 'idx_role_permissions'
```

#### 2. Audit Vault Immutability Trigger

```sql
-- Ensures AuditVaultEntry records cannot be modified or deleted
-- This enforces compliance requirements at the database level
CREATE OR REPLACE FUNCTION prevent_audit_vault_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditVaultEntry is INSERT ONLY. Tampering detected.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_vault_immutable
BEFORE UPDATE OR DELETE ON "AuditVaultEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_vault_mutation();
```

**Verification:**
```sql
SELECT tgname FROM pg_trigger WHERE tgrelid = '"AuditVaultEntry"'::regclass;
-- Expected: 1 row returned with tgname = 'audit_vault_immutable'
```

#### 3. pg_trgm Extension for Full-Text Search

```sql
-- Enables trigram-based fuzzy text search for document names and metadata
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Verification:**
```sql
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
-- Expected: 1 row returned with extname = 'pg_trgm'
```

### Post-Migration Verification Checklist

- [ ] RLS enabled on all tenant-scoped tables (11 tables total)
- [ ] RLS policies created (11 policies total)
- [ ] GIN index `idx_role_permissions` created and verified
- [ ] Audit vault trigger `audit_vault_immutable` created and verified
- [ ] `pg_trgm` extension enabled and verified
- [ ] Prisma client regenerated: `pnpm --filter @docuroute/db prisma generate`
- [ ] Application restarted to use new Prisma client
- [ ] Smoke test: Create a test company, role, and user
- [ ] Smoke test: Attempt to update an AuditVaultEntry (should fail with error)
- [ ] Smoke test: Verify tenant isolation - query without setting companyId should return no rows

## Phase 2  (Reserved for future migrations)

---

**TRANSACTION ISOLATION - RLS APPROACH:**

With Row Level Security (RLS) enabled, tenant isolation is enforced at the database level for ALL queries, including inside transactions.

The application sets the tenant context using `SET LOCAL app.current_company_id = '<companyId>'` which is automatically executed by the Prisma Client Extension in `getPrismaForCompany()`.

**RLS Benefits:**
- No manual `companyId` injection required in transactions
- Database enforces isolation automatically
- Forgotten `companyId` = query returns nothing (fail-safe)
- Works with interactive transactions: `$transaction(async tx => {...})`

**Legacy Code:**
Existing code that explicitly passes `companyId` in transactions will continue to work (no breaking changes). The RLS policies will filter based on `current_setting('app.current_company_id')` AND the explicit `companyId` in the query.

**Example:**
```typescript
await prisma.$transaction(async (tx) => {
  // RLS automatically filters by current_setting('app.current_company_id')
  // No explicit companyId needed (but you can still pass it if you want)
  await tx.document.create({
    data: {
      filename: 'test.pdf',
      // companyId will be enforced by RLS even if not explicitly passed
    }
  })
})
```
