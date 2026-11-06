/*
  Warnings:

  - You are about to drop the column `backgroundImage` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `surveyId` on the `MenuLanding` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MenuLanding" DROP CONSTRAINT "MenuLanding_surveyId_fkey";

-- AlterTable
ALTER TABLE "Menu" DROP COLUMN "backgroundImage";

-- AlterTable
ALTER TABLE "MenuLanding" DROP COLUMN "surveyId",
ALTER COLUMN "surveyTeamMapId" DROP NOT NULL;
