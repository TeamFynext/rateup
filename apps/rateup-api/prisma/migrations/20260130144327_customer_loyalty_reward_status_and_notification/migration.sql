-- CreateEnum
CREATE TYPE "CustomerRewardStatus" AS ENUM ('ISSUED', 'REDEEMED');

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "autoApproveAdjustments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultCountryCode" TEXT NOT NULL DEFAULT 'IN',
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enablePointsExpiration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsActivityAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pointsExpirationMonths" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "whatsappNotifications" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "currencyCode" SET DEFAULT 'INR',
ALTER COLUMN "currencySymbol" SET DEFAULT '₹';

-- CreateTable
CREATE TABLE "CustomerReward" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shortCode" TEXT NOT NULL,
    "status" "CustomerRewardStatus" NOT NULL DEFAULT 'ISSUED',
    "rewardId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReward_shortCode_key" ON "CustomerReward"("shortCode");

-- CreateIndex
CREATE INDEX "CustomerReward_accountId_idx" ON "CustomerReward"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReward_rewardId_accountId_key" ON "CustomerReward"("rewardId", "accountId");

-- AddForeignKey
ALTER TABLE "CustomerReward" ADD CONSTRAINT "CustomerReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReward" ADD CONSTRAINT "CustomerReward_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
