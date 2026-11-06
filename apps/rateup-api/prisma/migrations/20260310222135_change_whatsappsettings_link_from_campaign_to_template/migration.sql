/*
  Warnings:

  - You are about to drop the column `whatsappSettingsPhoneId` on the `Campaign` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_whatsappSettingsPhoneId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "whatsappSettingsPhoneId";

-- AlterTable
ALTER TABLE "WaTemplate" ADD COLUMN     "whatsappSettingsPhoneId" TEXT;

-- AddForeignKey
ALTER TABLE "WaTemplate" ADD CONSTRAINT "WaTemplate_whatsappSettingsPhoneId_fkey" FOREIGN KEY ("whatsappSettingsPhoneId") REFERENCES "WhatsappSettings"("phoneId") ON DELETE SET NULL ON UPDATE CASCADE;
