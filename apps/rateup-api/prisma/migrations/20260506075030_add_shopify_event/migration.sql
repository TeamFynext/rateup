/*
  Warnings:

  - You are about to drop the column `isEnabled` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the column `matchType` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the column `sendOnceIn24Hours` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappSettingsPhoneIds` on the `WaAutomatedReply` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TriggerEvent" ADD VALUE 'SHOPIFY_EVENT';

-- AlterTable
ALTER TABLE "WaAutomatedReply" DROP COLUMN "isEnabled",
DROP COLUMN "matchType",
DROP COLUMN "sendOnceIn24Hours",
DROP COLUMN "whatsappSettingsPhoneIds";
