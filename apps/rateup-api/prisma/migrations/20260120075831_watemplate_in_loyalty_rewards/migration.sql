-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "waTemplateId" UUID;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
