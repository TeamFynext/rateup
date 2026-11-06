-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "encryptionKeys" JSONB;

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicKey" TEXT;

-- AlterTable
ALTER TABLE "SurveyResponse" ADD COLUMN     "encryptedResponses" TEXT,
ALTER COLUMN "responses" SET DEFAULT ARRAY[]::JSONB[];
