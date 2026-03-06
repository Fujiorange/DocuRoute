-- AlterTable
ALTER TABLE "Document" ADD COLUMN "encryptionIV" TEXT;
ALTER TABLE "Document" ADD COLUMN "encryptionAuthTag" TEXT;
