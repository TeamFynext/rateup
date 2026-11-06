/*
  Warnings:

  - A unique constraint covering the columns `[shortUrlId]` on the table `SurveyTeamMap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SurveyTeamMap" ADD COLUMN     "shortUrlId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SurveyTeamMap_shortUrlId_key" ON "SurveyTeamMap"("shortUrlId");
