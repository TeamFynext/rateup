-- CreateEnum
CREATE TYPE "LoyaltyEventType" AS ENUM ('POINTS_ISSUED', 'POINTS_ADJUSTED', 'REWARD_ISSUED', 'REWARD_REDEEMED', 'TIER_UPGRADED', 'BIRTHDAY', 'INACTIVITY_REMINDER');

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "whatsappSettingsId" TEXT;

-- CreateTable
CREATE TABLE "LoyaltyEventTrigger" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "eventType" "LoyaltyEventType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerDays" INTEGER,
    "waTemplateId" UUID,
    "rewardId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyEventTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyEventTrigger_programId_idx" ON "LoyaltyEventTrigger"("programId");

-- CreateIndex
CREATE INDEX "LoyaltyEventTrigger_eventType_idx" ON "LoyaltyEventTrigger"("eventType");

-- AddForeignKey
ALTER TABLE "LoyaltyEventTrigger" ADD CONSTRAINT "LoyaltyEventTrigger_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyEventTrigger" ADD CONSTRAINT "LoyaltyEventTrigger_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyEventTrigger" ADD CONSTRAINT "LoyaltyEventTrigger_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
