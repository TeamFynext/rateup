-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "campaignSentAt" TIMESTAMP(3),
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "scheduledStatuses" TEXT[] DEFAULT ARRAY[]::TEXT[];
