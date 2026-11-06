/*
  Warnings:

  - You are about to drop the column `appId` on the `WhatsappSettings` table. All the data in the column will be lost.
  - You are about to drop the column `businessId` on the `WhatsappSettings` table. All the data in the column will be lost.
  - You are about to drop the column `webhookPassword` on the `WhatsappSettings` table. All the data in the column will be lost.
  - Added the required column `accessToken_iv` to the `WhatsappSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `WhatsappSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wabaId` to the `WhatsappSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WhatsappSettings" DROP COLUMN "appId",
DROP COLUMN "businessId",
DROP COLUMN "webhookPassword",
ADD COLUMN     "accessToken_iv" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "wabaId" TEXT NOT NULL;
