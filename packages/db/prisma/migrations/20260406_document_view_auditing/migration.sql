-- Document View Auditing Migration
-- Adds DocumentView table for ITAR/export-control compliance
-- Tracks all document access (view, preview, download, QR scan)

-- Create ViewType enum
CREATE TYPE "ViewType" AS ENUM ('DETAIL_PAGE', 'PREVIEW', 'DOWNLOAD', 'QR_SCAN');

-- Create DocumentView table
CREATE TABLE "DocumentView" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT NOT NULL,
    "viewType" "ViewType" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,

    CONSTRAINT "DocumentView_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient queries
CREATE INDEX "DocumentView_documentId_idx" ON "DocumentView"("documentId");
CREATE INDEX "DocumentView_userId_idx" ON "DocumentView"("userId");
CREATE INDEX "DocumentView_companyId_idx" ON "DocumentView"("companyId");
CREATE INDEX "DocumentView_viewedAt_idx" ON "DocumentView"("viewedAt");
CREATE INDEX "DocumentView_sessionId_idx" ON "DocumentView"("sessionId");
CREATE INDEX "DocumentView_companyId_documentId_viewedAt_idx" ON "DocumentView"("companyId", "documentId", "viewedAt");

-- Add viewLogRetentionDays to Company table
ALTER TABLE "Company" ADD COLUMN "viewLogRetentionDays" INTEGER NOT NULL DEFAULT 90;

-- Enable Row Level Security on DocumentView
ALTER TABLE "DocumentView" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view logs within their company
CREATE POLICY "documentview_tenant_isolation" ON "DocumentView"
  USING (
    "companyId" = current_setting('app.current_company_id', TRUE)
  );

-- RLS Policy: Platform admins can see all view logs (for compliance investigations)
-- Note: Platform admins use prismaAdmin which bypasses RLS, so this is primarily
-- for defense-in-depth and explicit documentation of access rules
CREATE POLICY "documentview_platform_admin_access" ON "DocumentView"
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      JOIN "Role" r ON u."roleId" = r.id
      WHERE u.id = current_setting('app.current_user_id', TRUE)
      AND r."systemRoleKey" = 'PLATFORM_ADMIN'
    )
  );

-- Comment on table for documentation
COMMENT ON TABLE "DocumentView" IS 'View access log for ITAR/export-control compliance. Records every document view, preview, download, and QR scan.';
COMMENT ON COLUMN "DocumentView"."viewType" IS 'Type of view: DETAIL_PAGE (opened details), PREVIEW (previewed PDF), DOWNLOAD (downloaded file), QR_SCAN (public verification)';
COMMENT ON COLUMN "DocumentView"."sessionId" IS 'Groups multiple views in same user session for analytics';
