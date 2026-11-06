/*
  Warnings:

  - You are about to drop the column `whatsappSettingsId` on the `Rule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Rule" DROP CONSTRAINT "Rule_whatsappSettingsId_fkey";

-- AlterTable
ALTER TABLE "Rule" DROP COLUMN "whatsappSettingsId";
