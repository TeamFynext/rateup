/*
  Warnings:

  - You are about to drop the column `locationCoordinates` on the `SurveyResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "locationCoordinates",
ADD COLUMN     "location" JSONB;
