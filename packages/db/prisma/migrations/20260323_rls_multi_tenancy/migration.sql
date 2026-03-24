-- Enable Row Level Security for Multi-Tenancy
-- This migration addresses the critical security flaw where Prisma Client Extensions
-- fail inside interactive transactions, potentially causing cross-tenant data leakage.
--
-- Strategy: Move tenant isolation from application-level Prisma extensions to
-- database-level Row Level Security (RLS) policies.
--
-- The application will set the tenant context at the connection level using:
--   SET LOCAL app.current_company_id = '<companyId>';
--
-- RLS policies will automatically enforce tenant isolation for ALL queries,
-- including those inside transactions where Prisma extensions don't apply.

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditVaultEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransmittalCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyOnboarding" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
-- Policy: All operations restricted to current_company_id set by application

-- Role table
CREATE POLICY role_tenant_isolation ON "Role"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- User table
CREATE POLICY user_tenant_isolation ON "User"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- Project table
CREATE POLICY project_tenant_isolation ON "Project"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- Document table
CREATE POLICY document_tenant_isolation ON "Document"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- DocumentRevision table
CREATE POLICY document_revision_tenant_isolation ON "DocumentRevision"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- AuditLog table
CREATE POLICY audit_log_tenant_isolation ON "AuditLog"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- AuditVaultEntry table
CREATE POLICY audit_vault_tenant_isolation ON "AuditVaultEntry"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- Invitation table
CREATE POLICY invitation_tenant_isolation ON "Invitation"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- Notification table
CREATE POLICY notification_tenant_isolation ON "Notification"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- TransmittalCounter table
CREATE POLICY transmittal_counter_tenant_isolation ON "TransmittalCounter"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- CompanyOnboarding table
CREATE POLICY company_onboarding_tenant_isolation ON "CompanyOnboarding"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- Company table does NOT have RLS enabled
-- Company records are accessed via prismaAdmin for cross-tenant operations

-- IMPORTANT NOTES:
-- 1. The application must call SET LOCAL app.current_company_id = '<companyId>'
--    at the start of each transaction or query that requires tenant isolation.
--
-- 2. For operations that need cross-tenant access (auth, SCIM, platform admin),
--    use prismaAdmin without setting app.current_company_id.
--
-- 3. RLS policies automatically apply inside transactions, solving the
--    Prisma extension limitation.
--
-- 4. If app.current_company_id is not set, current_setting returns NULL
--    and NO rows will be returned (fail-safe default).
--
-- 5. SET LOCAL is transaction-scoped and automatically resets after
--    transaction commit/rollback.
