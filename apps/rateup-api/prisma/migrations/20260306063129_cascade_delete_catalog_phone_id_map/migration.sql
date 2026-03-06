-- DropForeignKey
ALTER TABLE "CatalogPhoneIdMap" DROP CONSTRAINT "CatalogPhoneIdMap_whatsappSettingsPhoneId_fkey";

-- AddForeignKey
ALTER TABLE "CatalogPhoneIdMap" ADD CONSTRAINT "CatalogPhoneIdMap_whatsappSettingsPhoneId_fkey" FOREIGN KEY ("whatsappSettingsPhoneId") REFERENCES "WhatsappSettings"("phoneId") ON DELETE CASCADE ON UPDATE CASCADE;
