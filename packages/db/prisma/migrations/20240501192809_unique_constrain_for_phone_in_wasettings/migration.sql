/*
  Warnings:

  - A unique constraint covering the columns `[phoneId]` on the table `WhatsappSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `WhatsappSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSettings_phoneId_key" ON "WhatsappSettings"("phoneId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSettings_phone_key" ON "WhatsappSettings"("phone");
