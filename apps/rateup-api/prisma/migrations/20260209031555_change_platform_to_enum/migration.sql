/*
  Warnings:

  - The `platform` column on the `WaAutomatedReply` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "WaAutomatedReply" DROP COLUMN "platform",
ADD COLUMN     "platform" "PlatformType" NOT NULL DEFAULT 'WHATSAPP';
