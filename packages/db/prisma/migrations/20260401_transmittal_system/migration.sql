-- CreateTable: Transmittal System
-- Phase 2 (Pilot-ready system)
-- Adds three tables for document transmittal tracking with revision locking

-- Transmittal: Main transmittal record
CREATE TABLE "Transmittal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transmittal_pkey" PRIMARY KEY ("id")
);

-- TransmittalDocument: Links documents to transmittals with LOCKED revisionId
CREATE TABLE "TransmittalDocument" (
    "id" TEXT NOT NULL,
    "transmittalId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransmittalDocument_pkey" PRIMARY KEY ("id")
);

-- TransmittalRecipient: Recipient tracking with unique tokens for public access
CREATE TABLE "TransmittalRecipient" (
    "id" TEXT NOT NULL,
    "transmittalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "viewedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransmittalRecipient_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "Transmittal_companyId_number_key" ON "Transmittal"("companyId", "number");
CREATE UNIQUE INDEX "TransmittalDocument_transmittalId_documentId_key" ON "TransmittalDocument"("transmittalId", "documentId");
CREATE UNIQUE INDEX "TransmittalRecipient_token_key" ON "TransmittalRecipient"("token");

-- Performance Indexes
CREATE INDEX "Transmittal_companyId_status_idx" ON "Transmittal"("companyId", "status");
CREATE INDEX "Transmittal_companyId_createdAt_idx" ON "Transmittal"("companyId", "createdAt");
CREATE INDEX "TransmittalDocument_transmittalId_idx" ON "TransmittalDocument"("transmittalId");
CREATE INDEX "TransmittalDocument_documentId_idx" ON "TransmittalDocument"("documentId");
CREATE INDEX "TransmittalRecipient_transmittalId_idx" ON "TransmittalRecipient"("transmittalId");
CREATE INDEX "TransmittalRecipient_token_idx" ON "TransmittalRecipient"("token");
CREATE INDEX "TransmittalRecipient_email_idx" ON "TransmittalRecipient"("email");

-- Foreign Keys with Cascade Delete
ALTER TABLE "TransmittalDocument" ADD CONSTRAINT "TransmittalDocument_transmittalId_fkey" FOREIGN KEY ("transmittalId") REFERENCES "Transmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransmittalRecipient" ADD CONSTRAINT "TransmittalRecipient_transmittalId_fkey" FOREIGN KEY ("transmittalId") REFERENCES "Transmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) Policies
-- Enable RLS on all transmittal tables
ALTER TABLE "Transmittal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransmittalDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransmittalRecipient" ENABLE ROW LEVEL SECURITY;

-- Policy: Transmittal table - tenant isolation
CREATE POLICY "Transmittal tenant isolation"
  ON "Transmittal"
  USING ("companyId" = current_setting('app.current_company_id', true));

-- Policy: TransmittalDocument table - tenant isolation via Transmittal
-- No direct companyId column, so we join through Transmittal
CREATE POLICY "TransmittalDocument tenant isolation"
  ON "TransmittalDocument"
  USING (
    EXISTS (
      SELECT 1 FROM "Transmittal"
      WHERE "Transmittal"."id" = "TransmittalDocument"."transmittalId"
        AND "Transmittal"."companyId" = current_setting('app.current_company_id', true)
    )
  );

-- Policy: TransmittalRecipient table - tenant isolation via Transmittal
CREATE POLICY "TransmittalRecipient tenant isolation"
  ON "TransmittalRecipient"
  USING (
    EXISTS (
      SELECT 1 FROM "Transmittal"
      WHERE "Transmittal"."id" = "TransmittalRecipient"."transmittalId"
        AND "Transmittal"."companyId" = current_setting('app.current_company_id', true)
    )
  );

-- Comments for documentation
COMMENT ON TABLE "Transmittal" IS 'Document transmittals sent to external recipients. Status: DRAFT (being created) → SENT (locked, sent to recipients) → ACKNOWLEDGED/RETURNED (recipient response).';
COMMENT ON TABLE "TransmittalDocument" IS 'Documents included in transmittals. revisionId is LOCKED at send time and never changes even if new revision uploaded.';
COMMENT ON TABLE "TransmittalRecipient" IS 'Recipients of transmittals. Each gets unique token for passwordless public access. Status: PENDING → VIEWED → ACKNOWLEDGED.';
COMMENT ON COLUMN "TransmittalDocument"."revisionId" IS 'CRITICAL: This is LOCKED when transmittal is sent and NEVER changes, even if document gets new revision. Ensures recipients always see the exact version that was transmitted.';
COMMENT ON COLUMN "TransmittalRecipient"."token" IS 'Secure random token (64 chars) for public access at /acknowledge/{transmittalId}?token=xxx. NO LOGIN REQUIRED.';
