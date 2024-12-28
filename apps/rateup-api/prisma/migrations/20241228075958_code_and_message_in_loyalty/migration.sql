/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `LoyaltyRedeem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `message` to the `LoyaltyAction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "message" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "LoyaltyRedeem" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "rewardType" TEXT,
ADD COLUMN     "rewardValue" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyRedeem_code_key" ON "LoyaltyRedeem"("code");
