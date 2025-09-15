/*
  Warnings:

  - You are about to drop the column `isWhatsappConnected` on the `WhatsappCatalog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WhatsappCatalog" DROP COLUMN "isWhatsappConnected";

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "assets" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CatalogPhoneIdMap" (
    "whatsappSettingsPhoneId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogPhoneIdMap_whatsappSettingsPhoneId_key" ON "CatalogPhoneIdMap"("whatsappSettingsPhoneId");

-- CreateIndex
CREATE INDEX "CatalogPhoneIdMap_catalogId_idx" ON "CatalogPhoneIdMap"("catalogId");

-- AddForeignKey
ALTER TABLE "CatalogPhoneIdMap" ADD CONSTRAINT "CatalogPhoneIdMap_whatsappSettingsPhoneId_fkey" FOREIGN KEY ("whatsappSettingsPhoneId") REFERENCES "WhatsappSettings"("phoneId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogPhoneIdMap" ADD CONSTRAINT "CatalogPhoneIdMap_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "WhatsappCatalog"("catalogId") ON DELETE CASCADE ON UPDATE CASCADE;
