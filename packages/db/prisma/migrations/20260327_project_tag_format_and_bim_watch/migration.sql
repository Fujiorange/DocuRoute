-- Project-Level Tag Format Override and BIM Watch Folder
-- This migration adds:
-- 1. EquipmentTagFormat model for company-level naming conventions
-- 2. Project.tagFormatId for project-level format overrides
-- 3. BIMWatchFolder model for automated CSV polling

-- Create Equipment Tag Format table
CREATE TABLE "EquipmentTagFormat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "description" TEXT,
  "rules" JSONB,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EquipmentTagFormat_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create BIM Watch Folder table
CREATE TABLE "BIMWatchFolder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL UNIQUE,
  "folderPath" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastPolledAt" TIMESTAMP(3),
  "lastImportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BIMWatchFolder_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BIMWatchFolder_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add tagFormatId to Project table
ALTER TABLE "Project" ADD COLUMN "tagFormatId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Project" ADD CONSTRAINT "Project_tagFormatId_fkey"
  FOREIGN KEY ("tagFormatId") REFERENCES "EquipmentTagFormat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create unique indexes
CREATE UNIQUE INDEX "EquipmentTagFormat_companyId_name_key" ON "EquipmentTagFormat"("companyId", "name");
CREATE UNIQUE INDEX "BIMWatchFolder_companyId_folderPath_key" ON "BIMWatchFolder"("companyId", "folderPath");

-- Create performance indexes
CREATE INDEX "EquipmentTagFormat_companyId_isDefault_idx" ON "EquipmentTagFormat"("companyId", "isDefault");
CREATE INDEX "Project_tagFormatId_idx" ON "Project"("tagFormatId");
CREATE INDEX "BIMWatchFolder_companyId_enabled_idx" ON "BIMWatchFolder"("companyId", "enabled");
CREATE INDEX "BIMWatchFolder_enabled_lastPolledAt_idx" ON "BIMWatchFolder"("enabled", "lastPolledAt");

-- Enable RLS on new tables
ALTER TABLE "EquipmentTagFormat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BIMWatchFolder" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY equipment_tag_format_tenant_isolation ON "EquipmentTagFormat"
  USING ("companyId" = current_setting('app.current_company_id', TRUE));

CREATE POLICY bim_watch_folder_tenant_isolation ON "BIMWatchFolder"
  USING ("companyId" = current_setting('app.current_company_id', TRUE));

-- Apply companyId enforcement triggers
DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "EquipmentTagFormat";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "EquipmentTagFormat"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

DROP TRIGGER IF EXISTS enforce_company_id_trigger ON "BIMWatchFolder";
CREATE TRIGGER enforce_company_id_trigger
  BEFORE INSERT ON "BIMWatchFolder"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();

-- Notes:
-- 1. EquipmentTagFormat allows different projects to use different naming conventions
--    (e.g., vessel projects vs FPSO projects)
-- 2. Project.tagFormatId is optional - if NULL, use company default format
-- 3. BIMWatchFolder enables automated polling of network folders for CSV imports
-- 4. One watch folder per project (enforced by UNIQUE constraint on projectId)
-- 5. RLS and triggers ensure multi-tenant data isolation
