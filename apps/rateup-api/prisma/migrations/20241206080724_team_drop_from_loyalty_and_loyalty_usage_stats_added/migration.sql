/*
  Warnings:

  - You are about to drop the column `teamId` on the `LoyaltyAction` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `LoyaltyReward` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `LoyaltyTemplate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "LoyaltyAction" DROP CONSTRAINT "LoyaltyAction_teamId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyReward" DROP CONSTRAINT "LoyaltyReward_teamId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTemplate" DROP CONSTRAINT "LoyaltyTemplate_teamId_fkey";

-- AlterTable
ALTER TABLE "LoyaltyAction" DROP COLUMN "teamId";

-- AlterTable
ALTER TABLE "LoyaltyReward" DROP COLUMN "teamId";

-- AlterTable
ALTER TABLE "LoyaltyTemplate" DROP COLUMN "teamId";

-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "loyaltyActionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyCustomerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyRewardCount" INTEGER NOT NULL DEFAULT 0;
