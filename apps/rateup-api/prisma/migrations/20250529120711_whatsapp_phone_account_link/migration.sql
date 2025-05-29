-- DropIndex
DROP INDEX "WhatsappSettings_orgId_key";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "whatsappSettingsPhoneId" TEXT;

-- AlterTable
ALTER TABLE "LoyaltyWaCommand" ADD COLUMN     "whatsappSettingsPhoneId" TEXT;

-- AlterTable
ALTER TABLE "WaAutomatedReply" ADD COLUMN     "whatsappSettingsPhoneId" TEXT;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_whatsappSettingsPhoneId_fkey" FOREIGN KEY ("whatsappSettingsPhoneId") REFERENCES "WhatsappSettings"("phoneId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAutomatedReply" ADD CONSTRAINT "WaAutomatedReply_whatsappSettingsPhoneId_fkey" FOREIGN KEY ("whatsappSettingsPhoneId") REFERENCES "WhatsappSettings"("phoneId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyWaCommand" ADD CONSTRAINT "LoyaltyWaCommand_whatsappSettingsPhoneId_fkey" FOREIGN KEY ("whatsappSettingsPhoneId") REFERENCES "WhatsappSettings"("phoneId") ON DELETE SET NULL ON UPDATE CASCADE;
