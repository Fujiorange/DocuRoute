-- CreateTable: CompanyTransmittalConfig
-- Adds company-level configuration for transmittal customization

CREATE TABLE "CompanyTransmittalConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numberPrefix" TEXT NOT NULL DEFAULT 'TR',
    "numberPadding" INTEGER NOT NULL DEFAULT 3,
    "columns" JSONB NOT NULL DEFAULT '{"documentCode": {"enabled": true, "label": "Document Code", "order": 0}, "title": {"enabled": true, "label": "Title", "order": 1}, "revisionCode": {"enabled": true, "label": "Revision", "order": 2}, "status": {"enabled": false, "label": "Status", "order": 3}, "discipline": {"enabled": false, "label": "Discipline", "order": 4}}',
    "headerFields" JSONB NOT NULL DEFAULT '{"projectName": {"enabled": false, "label": "Project Name"}, "attentionTo": {"enabled": false, "label": "Attention To"}, "subject": {"enabled": true, "label": "Subject"}}',
    "footerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTransmittalConfig_pkey" PRIMARY KEY ("id")
);

-- Unique Constraint
CREATE UNIQUE INDEX "CompanyTransmittalConfig_companyId_key" ON "CompanyTransmittalConfig"("companyId");

-- Performance Index
CREATE INDEX "CompanyTransmittalConfig_companyId_idx" ON "CompanyTransmittalConfig"("companyId");

-- Row Level Security (RLS) Policy
ALTER TABLE "CompanyTransmittalConfig" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CompanyTransmittalConfig tenant isolation"
  ON "CompanyTransmittalConfig"
  USING ("companyId" = current_setting('app.current_company_id', true));

-- Comments for documentation
COMMENT ON TABLE "CompanyTransmittalConfig" IS 'Company-level configuration for transmittal customization. Controls number format, columns, header fields, and footer text.';
COMMENT ON COLUMN "CompanyTransmittalConfig"."numberPrefix" IS 'Prefix for transmittal numbers (e.g., "TR", "SHP", "BLD"). Default: "TR"';
COMMENT ON COLUMN "CompanyTransmittalConfig"."numberPadding" IS 'Number of digits for padding (e.g., 3 = "001", 4 = "0001"). Default: 3';
COMMENT ON COLUMN "CompanyTransmittalConfig"."columns" IS 'JSON configuration for transmittal document table columns. Each column has: enabled (boolean), label (string), order (number)';
COMMENT ON COLUMN "CompanyTransmittalConfig"."headerFields" IS 'JSON configuration for transmittal header fields. Each field has: enabled (boolean), label (string)';
COMMENT ON COLUMN "CompanyTransmittalConfig"."footerText" IS 'Optional custom footer text displayed on transmittals';
