-- RLS Transaction Safety: Enforce companyId at Database Level
-- This migration adds a trigger to reject INSERT operations with NULL companyId
-- on all tenant-scoped tables, preventing silent cross-tenant data leakage.
--
-- RATIONALE:
-- While RLS policies filter queries based on app.current_company_id, they don't
-- prevent INSERT operations with incorrect or NULL companyId values. This trigger
-- provides defense-in-depth by validating companyId at the database layer.
--
-- This is critical for transactions where developers might forget to pass companyId
-- explicitly. The trigger catches these errors at the database level before they
-- cause data integrity issues.

-- Create function to check companyId on INSERT
CREATE OR REPLACE FUNCTION enforce_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."companyId" IS NULL THEN
    RAISE EXCEPTION 'CRITICAL SECURITY ERROR: companyId cannot be NULL in % table. This violates multi-tenant isolation rules.', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tenant-scoped tables
-- These are the tables that have RLS policies and require companyId

-- Role table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "Role";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "Role"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- User table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "User";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- Project table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "Project";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "Project"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- Document table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "Document";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "Document"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- DocumentRevision table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "DocumentRevision";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "DocumentRevision"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- AuditLog table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "AuditLog";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- AuditVaultEntry table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "AuditVaultEntry";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "AuditVaultEntry"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- Invitation table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "Invitation";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "Invitation"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- Notification table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "Notification";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "Notification"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- TransmittalCounter table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "TransmittalCounter";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "TransmittalCounter"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- CompanyOnboarding table
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "CompanyOnboarding";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "CompanyOnboarding"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- NOTE: Company table does NOT have this trigger because it's the root tenant table
-- and doesn't have a companyId foreign key (it IS the company).

-- TESTING:
-- To verify triggers are active, run:
--   SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'enforce_company_id_trigger';
--
-- To test trigger behavior:
--   SET LOCAL app.current_company_id = 'test-company-id';
--   INSERT INTO "Role" (id, name, "isSystemRole") VALUES ('test-id', 'Test Role', false);
--   -- Should fail with: "companyId cannot be NULL in Role table"
