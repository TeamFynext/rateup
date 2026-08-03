/*
  Warnings:

  - Added the required column `businessName` to the `BookDemo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `BookDemo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `BookDemo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "WaAutomationProgressStatus" ADD VALUE 'failed';

-- AlterTable
ALTER TABLE "BookDemo" ADD COLUMN     "businessName" TEXT NOT NULL,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "phoneNumber" DROP NOT NULL,
ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "teamSize" DROP NOT NULL,
ALTER COLUMN "preferredTime" DROP NOT NULL,
ALTER COLUMN "primaryUseCase" DROP NOT NULL,
ALTER COLUMN "additionalInfo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CustomerLoyaltyAccount" ADD COLUMN     "lastBirthdayGreetedAt" TIMESTAMP(3),
ADD COLUMN     "lastInactivityReminderAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BookDemo_createdAt_idx" ON "BookDemo"("createdAt");
