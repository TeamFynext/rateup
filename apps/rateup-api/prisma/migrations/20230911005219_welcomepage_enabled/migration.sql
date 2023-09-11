/*
  Warnings:

  - You are about to drop the column `getLocation` on the `Survey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "getLocation",
ADD COLUMN     "welcomePageEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SurveyLanding" ADD COLUMN     "welcomePageEnabled" BOOLEAN NOT NULL DEFAULT false;
