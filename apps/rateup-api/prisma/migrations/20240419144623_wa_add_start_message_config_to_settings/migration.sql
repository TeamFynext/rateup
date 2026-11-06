/*
  Warnings:

  - A unique constraint covering the columns `[surveyId,teamId]` on the table `SurveyTeamMap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "orgId" UUID;

-- AlterTable
ALTER TABLE "WaFlow" ADD COLUMN     "startMessageConfig" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "SurveyTeamMap_surveyId_teamId_key" ON "SurveyTeamMap"("surveyId", "teamId");

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
