-- AlterTable Document: Add documentCode and title fields for document register
ALTER TABLE "Document" ADD COLUMN "documentCode" TEXT;
ALTER TABLE "Document" ADD COLUMN "title" TEXT;

-- Create unique constraint on projectId + documentCode
-- This ensures document codes are unique within a project
CREATE UNIQUE INDEX "Document_projectId_documentCode_key" ON "Document"("projectId", "documentCode");
