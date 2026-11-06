/*
  Warnings:

  - You are about to drop the column `points` on the `LoyaltyCustomer` table. All the data in the column will be lost.
  - You are about to drop the `LCampaignRewardEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LCustomerRewardEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LcReferralCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LcReward` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyCampaign` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone]` on the table `LoyaltyCustomer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LCampaignRewardEvent" DROP CONSTRAINT "LCampaignRewardEvent_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LCampaignRewardEvent" DROP CONSTRAINT "LCampaignRewardEvent_loyaltyCampaignId_fkey";

-- DropForeignKey
ALTER TABLE "LCampaignRewardEvent" DROP CONSTRAINT "LCampaignRewardEvent_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "LCustomerRewardEvent" DROP CONSTRAINT "LCustomerRewardEvent_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LCustomerRewardEvent" DROP CONSTRAINT "LCustomerRewardEvent_lCampaignRewardEventId_fkey";

-- DropForeignKey
ALTER TABLE "LcReferralCode" DROP CONSTRAINT "LcReferralCode_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LcReferralCode" DROP CONSTRAINT "LcReferralCode_loyaltyCampaignId_fkey";

-- DropForeignKey
ALTER TABLE "LcReferralCode" DROP CONSTRAINT "LcReferralCode_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LcReward" DROP CONSTRAINT "LcReward_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCampaign" DROP CONSTRAINT "LoyaltyCampaign_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCampaign" DROP CONSTRAINT "LoyaltyCampaign_referrerRewardId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCampaign" DROP CONSTRAINT "LoyaltyCampaign_userRewardId_fkey";

-- DropIndex
DROP INDEX "LoyaltyCustomer_email_orgId_key";

-- DropIndex
DROP INDEX "LoyaltyCustomer_phone_orgId_key";

-- AlterTable
ALTER TABLE "LoyaltyCustomer" DROP COLUMN "points",
ADD COLUMN     "redeemedPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarnedPoints" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "LCampaignRewardEvent";

-- DropTable
DROP TABLE "LCustomerRewardEvent";

-- DropTable
DROP TABLE "LcReferralCode";

-- DropTable
DROP TABLE "LcReward";

-- DropTable
DROP TABLE "LoyaltyCampaign";

-- CreateTable
CREATE TABLE "LoyaltyAction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" UUID NOT NULL,

    CONSTRAINT "LoyaltyAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "tnc" TEXT NOT NULL,
    "maxPerUser" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" UUID NOT NULL,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyRedeem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rewardId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" UUID NOT NULL,

    CONSTRAINT "LoyaltyRedeem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyActionCustomerMap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "actionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyActionCustomerMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyActionCustomerMap_customerId_actionId_key" ON "LoyaltyActionCustomerMap"("customerId", "actionId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCustomer_phone_key" ON "LoyaltyCustomer"("phone");

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyRedeem" ADD CONSTRAINT "LoyaltyRedeem_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyRedeem" ADD CONSTRAINT "LoyaltyRedeem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" ADD CONSTRAINT "LoyaltyActionCustomerMap_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" ADD CONSTRAINT "LoyaltyActionCustomerMap_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
