-- CreateTable: ClassSocietySubmission
-- Tracks package submissions to classification societies (ABS, DNV, LR, BV)
-- Phase 3 ready: Extensible for API submission and webhook status updates
CREATE TABLE "ClassSocietySubmission" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "societyCode" TEXT NOT NULL,
    "packageTitle" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "documentIds" TEXT[],
    "pdfPackageKey" TEXT,
    "coverLetterKey" TEXT,
    "zipPackageKey" TEXT,
    "generatedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "manuallySubmittedAt" TIMESTAMP(3),
    "classReferenceNumber" TEXT,
    "webhookReceivedAt" TIMESTAMP(3),
    "webhookPayload" JSONB,
    "lastStatusCheckAt" TIMESTAMP(3),
    "statusCheckCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSocietySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSocietySubmission_companyId_status_idx" ON "ClassSocietySubmission"("companyId", "status");

-- CreateIndex
CREATE INDEX "ClassSocietySubmission_companyId_societyCode_idx" ON "ClassSocietySubmission"("companyId", "societyCode");

-- CreateIndex
CREATE INDEX "ClassSocietySubmission_status_lastStatusCheckAt_idx" ON "ClassSocietySubmission"("status", "lastStatusCheckAt");

-- CreateIndex
CREATE INDEX "ClassSocietySubmission_classReferenceNumber_idx" ON "ClassSocietySubmission"("classReferenceNumber");

-- AddForeignKey
ALTER TABLE "ClassSocietySubmission" ADD CONSTRAINT "ClassSocietySubmission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSocietySubmission" ADD CONSTRAINT "ClassSocietySubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS on ClassSocietySubmission table
ALTER TABLE "ClassSocietySubmission" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see submissions from their company
CREATE POLICY "ClassSocietySubmission_select_policy" ON "ClassSocietySubmission"
  FOR SELECT
  USING ("companyId" = current_setting('app.current_company_id', true)::text);

CREATE POLICY "ClassSocietySubmission_insert_policy" ON "ClassSocietySubmission"
  FOR INSERT
  WITH CHECK ("companyId" = current_setting('app.current_company_id', true)::text);

CREATE POLICY "ClassSocietySubmission_update_policy" ON "ClassSocietySubmission"
  FOR UPDATE
  USING ("companyId" = current_setting('app.current_company_id', true)::text);

CREATE POLICY "ClassSocietySubmission_delete_policy" ON "ClassSocietySubmission"
  FOR DELETE
  USING ("companyId" = current_setting('app.current_company_id', true)::text);

-- Enforce companyId trigger (same pattern as other tenant-scoped tables)
CREATE TRIGGER enforce_company_id_class_society_submission
  BEFORE INSERT ON "ClassSocietySubmission"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_id();
