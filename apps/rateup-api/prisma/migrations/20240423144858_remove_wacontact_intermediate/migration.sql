/*
  Warnings:

  - You are about to drop the column `surveyTeamMapId` on the `Campaign` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_surveyTeamMapId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "surveyTeamMapId";

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "contactId" UUID,
ALTER COLUMN "waContactId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
