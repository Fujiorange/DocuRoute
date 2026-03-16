-- Add metadata field to Document table for watermark skip tracking
ALTER TABLE "Document" ADD COLUMN "metadata" JSONB;
