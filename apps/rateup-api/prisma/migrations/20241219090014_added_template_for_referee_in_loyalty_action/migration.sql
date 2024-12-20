-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "refereeWaTemplateId" UUID;

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_refereeWaTemplateId_fkey" FOREIGN KEY ("refereeWaTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
