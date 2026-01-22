/*
  Warnings:

  - You are about to drop the column `rewardId` on the `LoyaltyApiSettings` table. All the data in the column will be lost.
  - You are about to drop the column `expireAt` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `maxPerUser` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `orgId` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `reward_id` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `tnc` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `waTemplateId` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `actionId` on the `LoyaltyWaCommand` table. All the data in the column will be lost.
  - You are about to drop the `LoyaltyAction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyActionCustomerMap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyCustomer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyCustomerMap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyRedeem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyReferralCode` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `pointsCost` to the `LoyaltyReward` table without a default value. This is not possible if the table is not empty.
  - Added the required column `programId` to the `LoyaltyReward` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LoyaltyReward` table without a default value. This is not possible if the table is not empty.
  - Made the column `rewardType` on table `LoyaltyReward` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rewardValue` on table `LoyaltyReward` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'USED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalRequestType" AS ENUM ('REWARD_REDEMPTION', 'POINTS_ADJUSTMENT', 'TIER_OVERRIDE', 'ACCOUNT_SUSPENSION', 'ACCOUNT_REACTIVATION', 'BULK_OPERATION');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestedByType" AS ENUM ('CUSTOMER', 'STAFF', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_flowId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_refereeRewardId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_refereeWaTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_waTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" DROP CONSTRAINT "LoyaltyActionCustomerMap_actionId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" DROP CONSTRAINT "LoyaltyActionCustomerMap_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyApiSettings" DROP CONSTRAINT "LoyaltyApiSettings_actionId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyApiSettings" DROP CONSTRAINT "LoyaltyApiSettings_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCustomer" DROP CONSTRAINT "LoyaltyCustomer_contactId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCustomer" DROP CONSTRAINT "LoyaltyCustomer_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCustomerMap" DROP CONSTRAINT "LoyaltyCustomerMap_contactGroupId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyCustomerMap" DROP CONSTRAINT "LoyaltyCustomerMap_loyaltyCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyRedeem" DROP CONSTRAINT "LoyaltyRedeem_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyRedeem" DROP CONSTRAINT "LoyaltyRedeem_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyReferralCode" DROP CONSTRAINT "LoyaltyReferralCode_actionId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyReferralCode" DROP CONSTRAINT "LoyaltyReferralCode_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyReward" DROP CONSTRAINT "LoyaltyReward_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyReward" DROP CONSTRAINT "LoyaltyReward_waTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyWaCommand" DROP CONSTRAINT "LoyaltyWaCommand_actionId_fkey";

-- DropIndex
DROP INDEX "LoyaltyApiSettings_rewardId_key";

-- DropIndex
DROP INDEX "LoyaltyReward_reward_id_orgId_key";

-- DropIndex
DROP INDEX "LoyaltyWaCommand_actionId_key";

-- AlterTable
ALTER TABLE "LoyaltyApiSettings" DROP COLUMN "rewardId";

-- AlterTable
ALTER TABLE "LoyaltyReward" DROP COLUMN "expireAt",
DROP COLUMN "maxPerUser",
DROP COLUMN "orgId",
DROP COLUMN "points",
DROP COLUMN "reward_id",
DROP COLUMN "tnc",
DROP COLUMN "waTemplateId",
ADD COLUMN     "availableForTiers" TEXT[],
ADD COLUMN     "pointsCost" INTEGER NOT NULL,
ADD COLUMN     "programId" UUID NOT NULL,
ADD COLUMN     "redemptionRules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "stockQuantity" INTEGER,
ADD COLUMN     "stockRedeemed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "rewardType" SET NOT NULL,
ALTER COLUMN "rewardValue" SET NOT NULL;

-- AlterTable
ALTER TABLE "LoyaltyWaCommand" DROP COLUMN "actionId";

-- DropTable
DROP TABLE "LoyaltyAction";

-- DropTable
DROP TABLE "LoyaltyActionCustomerMap";

-- DropTable
DROP TABLE "LoyaltyCustomer";

-- DropTable
DROP TABLE "LoyaltyCustomerMap";

-- DropTable
DROP TABLE "LoyaltyRedeem";

-- DropTable
DROP TABLE "LoyaltyReferralCode";

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currencyName" TEXT NOT NULL DEFAULT 'Points',
    "currencyCode" TEXT NOT NULL DEFAULT 'AED',
    "currencySymbol" TEXT NOT NULL DEFAULT 'د.إ',
    "signupBonus" INTEGER NOT NULL DEFAULT 0,
    "referralBonus" INTEGER NOT NULL DEFAULT 0,
    "refereeBonus" INTEGER NOT NULL DEFAULT 0,
    "tiersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tierResetPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTier" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "pointsMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "color" TEXT NOT NULL DEFAULT '#999999',
    "benefitsDescription" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyEarningRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pointsPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "bonusPoints" INTEGER DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "allowedDays" TEXT[],
    "allowedTimeRanges" JSONB,
    "applicableToTiers" TEXT[],
    "minPurchaseAmount" DECIMAL(10,2),
    "maxPurchaseAmount" DECIMAL(10,2),
    "maxUsesPerCustomer" INTEGER,
    "maxTotalUses" INTEGER,
    "currentTotalUses" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,

    CONSTRAINT "LoyaltyEarningRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLoyaltyAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "currentTierId" UUID,
    "referralCode" TEXT NOT NULL,
    "referredById" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" UUID NOT NULL,
    "transactionType" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "earningRuleId" UUID,
    "earningRuleMultiplier" DECIMAL(4,2),
    "basePoints" INTEGER,
    "rewardId" UUID,
    "programId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "transactionId" UUID,
    "redemptionCode" VARCHAR(20) NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedContext" JSONB DEFAULT '{}',
    "rulesValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rulesValidationPassed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestType" "ApprovalRequestType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "accountId" UUID NOT NULL,
    "points" INTEGER,
    "reason" TEXT NOT NULL,
    "requestData" JSONB NOT NULL DEFAULT '{}',
    "requestedBy" UUID,
    "requestedByType" "RequestedByType" NOT NULL DEFAULT 'CUSTOMER',
    "requestedByName" VARCHAR(255),
    "reviewedBy" UUID,
    "reviewedByName" VARCHAR(255),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "redemptionId" UUID,
    "transactionId" UUID,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReferral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "referrerAccountId" UUID NOT NULL,
    "refereeContactId" UUID NOT NULL,
    "refereeAccountId" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referrerTransactionId" UUID,
    "refereeTransactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LoyaltyReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyProgram_orgId_key" ON "LoyaltyProgram"("orgId");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_orgId_idx" ON "LoyaltyProgram"("orgId");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_status_idx" ON "LoyaltyProgram"("status");

-- CreateIndex
CREATE INDEX "LoyaltyTier_programId_idx" ON "LoyaltyTier"("programId");

-- CreateIndex
CREATE INDEX "LoyaltyTier_programId_threshold_idx" ON "LoyaltyTier"("programId", "threshold");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTier_programId_name_key" ON "LoyaltyTier"("programId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTier_programId_threshold_key" ON "LoyaltyTier"("programId", "threshold");

-- CreateIndex
CREATE INDEX "LoyaltyEarningRule_programId_idx" ON "LoyaltyEarningRule"("programId");

-- CreateIndex
CREATE INDEX "LoyaltyEarningRule_status_idx" ON "LoyaltyEarningRule"("status");

-- CreateIndex
CREATE INDEX "LoyaltyEarningRule_programId_priority_idx" ON "LoyaltyEarningRule"("programId", "priority" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyEarningRule_validFrom_validUntil_idx" ON "LoyaltyEarningRule"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "LoyaltyEarningRule_programId_isDefault_idx" ON "LoyaltyEarningRule"("programId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyaltyAccount_referralCode_key" ON "CustomerLoyaltyAccount"("referralCode");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyAccount_programId_idx" ON "CustomerLoyaltyAccount"("programId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyAccount_programId_contactId_idx" ON "CustomerLoyaltyAccount"("programId", "contactId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyAccount_contactId_idx" ON "CustomerLoyaltyAccount"("contactId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyAccount_referralCode_idx" ON "CustomerLoyaltyAccount"("referralCode");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyAccount_currentTierId_idx" ON "CustomerLoyaltyAccount"("currentTierId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyAccount_referredById_idx" ON "CustomerLoyaltyAccount"("referredById");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyaltyAccount_programId_contactId_key" ON "CustomerLoyaltyAccount"("programId", "contactId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_accountId_idx" ON "LoyaltyTransaction"("accountId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_accountId_createdAt_idx" ON "LoyaltyTransaction"("accountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_transactionType_idx" ON "LoyaltyTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_referenceId_idx" ON "LoyaltyTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_earningRuleId_idx" ON "LoyaltyTransaction"("earningRuleId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_programId_idx" ON "LoyaltyTransaction"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_redemptions_transactionId_key" ON "loyalty_redemptions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_redemptions_redemptionCode_key" ON "loyalty_redemptions"("redemptionCode");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_accountId_idx" ON "loyalty_redemptions"("accountId");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_status_idx" ON "loyalty_redemptions"("status");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_redemptionCode_idx" ON "loyalty_redemptions"("redemptionCode");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_redemptionId_key" ON "approval_requests"("redemptionId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_transactionId_key" ON "approval_requests"("transactionId");

-- CreateIndex
CREATE INDEX "approval_requests_accountId_idx" ON "approval_requests"("accountId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_requestType_idx" ON "approval_requests"("requestType");

-- CreateIndex
CREATE INDEX "approval_requests_createdAt_idx" ON "approval_requests"("createdAt");

-- CreateIndex
CREATE INDEX "idx_approval_expires" ON "approval_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "LoyaltyReferral_programId_idx" ON "LoyaltyReferral"("programId");

-- CreateIndex
CREATE INDEX "LoyaltyReferral_referrerAccountId_idx" ON "LoyaltyReferral"("referrerAccountId");

-- CreateIndex
CREATE INDEX "LoyaltyReferral_refereeAccountId_idx" ON "LoyaltyReferral"("refereeAccountId");

-- CreateIndex
CREATE INDEX "LoyaltyReferral_status_idx" ON "LoyaltyReferral"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReferral_referrerAccountId_refereeContactId_key" ON "LoyaltyReferral"("referrerAccountId", "refereeContactId");

-- CreateIndex
CREATE INDEX "LoyaltyReward_programId_idx" ON "LoyaltyReward"("programId");

-- CreateIndex
CREATE INDEX "LoyaltyReward_status_idx" ON "LoyaltyReward"("status");

-- CreateIndex
CREATE INDEX "LoyaltyReward_pointsCost_idx" ON "LoyaltyReward"("pointsCost");

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyEarningRule" ADD CONSTRAINT "LoyaltyEarningRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyAccount" ADD CONSTRAINT "CustomerLoyaltyAccount_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyAccount" ADD CONSTRAINT "CustomerLoyaltyAccount_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyAccount" ADD CONSTRAINT "CustomerLoyaltyAccount_currentTierId_fkey" FOREIGN KEY ("currentTierId") REFERENCES "LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyAccount" ADD CONSTRAINT "CustomerLoyaltyAccount_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_earningRuleId_fkey" FOREIGN KEY ("earningRuleId") REFERENCES "LoyaltyEarningRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LoyaltyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "loyalty_redemptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LoyaltyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReferral" ADD CONSTRAINT "LoyaltyReferral_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReferral" ADD CONSTRAINT "LoyaltyReferral_referrerAccountId_fkey" FOREIGN KEY ("referrerAccountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReferral" ADD CONSTRAINT "LoyaltyReferral_refereeAccountId_fkey" FOREIGN KEY ("refereeAccountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
