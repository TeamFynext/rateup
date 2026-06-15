-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "isConversionApiActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "conversionData" JSONB,
ADD COLUMN     "conversionsApiDatasetId" TEXT;
