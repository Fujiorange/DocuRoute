-- Full-Text PDF Search Migration
-- Adds DocumentContent table with PostgreSQL tsvector for full-text search
-- Requires pg_trgm extension (should already exist from previous migrations)

-- Add hasSearchableContent flag to Document table
ALTER TABLE "Document"
  ADD COLUMN "hasSearchableContent" BOOLEAN NOT NULL DEFAULT false;

-- Create index on hasSearchableContent for filtering
CREATE INDEX "Document_companyId_hasSearchableContent_idx"
  ON "Document"("companyId", "hasSearchableContent");

-- Create DocumentContent table for storing extracted PDF text
CREATE TABLE "DocumentContent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "revisionCode" TEXT NOT NULL,
    "plainText" TEXT NOT NULL,
    "searchVector" tsvector,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageCount" INTEGER,
    "fileSize" INTEGER,

    CONSTRAINT "DocumentContent_pkey" PRIMARY KEY ("id")
);

-- Create unique index on documentId (one-to-one relation)
CREATE UNIQUE INDEX "DocumentContent_documentId_key" ON "DocumentContent"("documentId");

-- Create indexes for filtering and RLS
CREATE INDEX "DocumentContent_companyId_idx" ON "DocumentContent"("companyId");
CREATE INDEX "DocumentContent_companyId_documentId_idx" ON "DocumentContent"("companyId", "documentId");

-- Create GIN index on searchVector for fast full-text search
-- This is critical for sub-second search performance
CREATE INDEX "DocumentContent_searchVector_idx" ON "DocumentContent" USING GIN ("searchVector");

-- Add foreign key constraints
ALTER TABLE "DocumentContent" ADD CONSTRAINT "DocumentContent_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentContent" ADD CONSTRAINT "DocumentContent_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON UPDATE CASCADE;

-- Enable RLS on DocumentContent (similar to Document table)
ALTER TABLE "DocumentContent" ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Tenant isolation
-- Users can only see content from their own company
CREATE POLICY "DocumentContent_tenant_isolation" ON "DocumentContent"
  FOR ALL
  USING ("companyId" = current_setting('app.current_company_id', TRUE)::TEXT);

-- RLS Policy 2: Platform admin access
-- Platform admins can access all content for support
CREATE POLICY "DocumentContent_platform_admin" ON "DocumentContent"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      INNER JOIN "Role" r ON u."roleId" = r.id
      WHERE u.id = current_setting('app.current_user_id', TRUE)::TEXT
        AND r."systemRoleKey" = 'PLATFORM_ADMIN'
    )
  );

-- Create function to automatically update searchVector when plainText changes
-- This uses PostgreSQL's built-in text search with English dictionary
CREATE OR REPLACE FUNCTION update_document_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW."plainText", ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update searchVector on INSERT or UPDATE
CREATE TRIGGER document_content_search_vector_update
  BEFORE INSERT OR UPDATE OF "plainText"
  ON "DocumentContent"
  FOR EACH ROW
  EXECUTE FUNCTION update_document_content_search_vector();

-- Performance note: For large documents (>50 pages), consider truncating plainText
-- to first 1000 words + last 500 words in the extraction worker before insertion
-- to balance search coverage with index size.
