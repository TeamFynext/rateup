/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `LoyaltyRedeem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "message" JSONB;

-- AlterTable
ALTER TABLE "LoyaltyRedeem" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "rewardType" TEXT,
ADD COLUMN     "rewardValue" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyRedeem_code_key" ON "LoyaltyRedeem"("code");
