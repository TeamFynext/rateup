/*
  Warnings:

  - A unique constraint covering the columns `[action_id,orgId]` on the table `LoyaltyAction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reward_id,orgId]` on the table `LoyaltyReward` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "action_id" TEXT,
ADD COLUMN     "refereeRewardId" UUID,
ADD COLUMN     "rewardId" UUID;

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "reward_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAction_action_id_orgId_key" ON "LoyaltyAction"("action_id", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReward_reward_id_orgId_key" ON "LoyaltyReward"("reward_id", "orgId");

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_refereeRewardId_fkey" FOREIGN KEY ("refereeRewardId") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
