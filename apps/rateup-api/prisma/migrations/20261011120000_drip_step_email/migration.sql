-- AlterTable
ALTER TABLE "DripStepSetting" ADD COLUMN     "email" JSONB,
ADD COLUMN     "emailUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "emailUpdatedBy" TEXT;
