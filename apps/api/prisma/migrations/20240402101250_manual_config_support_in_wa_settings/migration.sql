/*
  Warnings:

  - Added the required column `appId` to the `WhatsappSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `WhatsappSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "appId" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "webhookPassword" TEXT;
