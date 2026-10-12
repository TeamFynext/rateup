-- AlterTable
ALTER TABLE "DripStepSetting" ADD COLUMN "whatsapp" JSONB;
ALTER TABLE "DripStepSetting" RENAME COLUMN "emailUpdatedAt" TO "editedAt";
ALTER TABLE "DripStepSetting" RENAME COLUMN "emailUpdatedBy" TO "editedBy";
