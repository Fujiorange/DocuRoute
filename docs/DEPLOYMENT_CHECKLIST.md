# DocuRoute Deployment Checklist

This document tracks all post-deployment SQL commands and manual steps required after deploying schema migrations to production.

## Phase 1  Database Schema

### Post-Migration SQL Commands

After running the Phase 1 migration (`npx prisma migrate deploy`), execute the following SQL commands in the Supabase SQL Editor:

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

- [ ] GIN index `idx_role_permissions` created and verified
- [ ] Audit vault trigger `audit_vault_immutable` created and verified
- [ ] `pg_trgm` extension enabled and verified
- [ ] Prisma client regenerated: `pnpm --filter @docuroute/db prisma generate`
- [ ] Application restarted to use new Prisma client
- [ ] Smoke test: Create a test company, role, and user
- [ ] Smoke test: Attempt to update an AuditVaultEntry (should fail with error)

## Phase 2  (Reserved for future migrations)

---

**CRITICAL TRANSACTION RULE:**

Prisma interactive transactions (`tx` client) do NOT inherit the companyId extension from `getPrismaForCompany()`. Always pass `companyId` explicitly in every `tx.model.create/update/upsert` call inside a transaction callback.

Example:
```typescript
await prisma.$transaction(async (tx) => {
  // WRONG: companyId not passed, extension won't apply
  await tx.document.create({ data: { filename: 'test.pdf' } })

  // CORRECT: companyId passed explicitly
  await tx.document.create({
    data: {
      companyId: session.companyId,  // EXPLICIT
      filename: 'test.pdf'
    }
  })
})
```
