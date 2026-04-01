-- Add documentCode and title fields to Document table
-- These fields support bulk import functionality for Phase 2

-- Add documentCode column (unique per project)
ALTER TABLE "Document" ADD COLUMN "documentCode" TEXT;

-- Add title column (human-readable document title)
ALTER TABLE "Document" ADD COLUMN "title" TEXT;

-- Create unique constraint for documentCode within a project
-- This allows NULL values (documents without codes can exist)
-- But ensures no duplicates within the same project
CREATE UNIQUE INDEX "Document_projectId_documentCode_key"
ON "Document"("projectId", "documentCode")
WHERE "documentCode" IS NOT NULL AND "projectId" IS NOT NULL;

-- Create index on documentCode for fast lookups
CREATE INDEX "Document_documentCode_idx" ON "Document"("documentCode");

-- Comment explaining the fields
COMMENT ON COLUMN "Document"."documentCode" IS 'Unique identifier within project (e.g., DWG-001, SPEC-A-001)';
COMMENT ON COLUMN "Document"."title" IS 'Human-readable title of the document';
