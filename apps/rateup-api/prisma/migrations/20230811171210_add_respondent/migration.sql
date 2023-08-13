/*
  Warnings:

  - You are about to drop the column `phone` on the `SurveyResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "phone",
ADD COLUMN     "respondentId" UUID;

-- AlterTable
ALTER TABLE "WaSession" ALTER COLUMN "currentQuestionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Respondent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "teamId" UUID,

    CONSTRAINT "Respondent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "RGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespondentGroupRelation" (
    "respondentId" UUID NOT NULL,
    "rgroupId" UUID NOT NULL,

    CONSTRAINT "RespondentGroupRelation_pkey" PRIMARY KEY ("respondentId","rgroupId")
);

-- CreateTable
CREATE TABLE "RespondentSurveySendHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "respondentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespondentSurveySendHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RGroupSurveySendHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rgroupId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RGroupSurveySendHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Respondent_phone_teamId_key" ON "Respondent"("phone", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "RGroup_name_teamId_key" ON "RGroup"("name", "teamId");

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respondent" ADD CONSTRAINT "Respondent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RGroup" ADD CONSTRAINT "RGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentGroupRelation" ADD CONSTRAINT "RespondentGroupRelation_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentGroupRelation" ADD CONSTRAINT "RespondentGroupRelation_rgroupId_fkey" FOREIGN KEY ("rgroupId") REFERENCES "RGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentSurveySendHistory" ADD CONSTRAINT "RespondentSurveySendHistory_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentSurveySendHistory" ADD CONSTRAINT "RespondentSurveySendHistory_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RGroupSurveySendHistory" ADD CONSTRAINT "RGroupSurveySendHistory_rgroupId_fkey" FOREIGN KEY ("rgroupId") REFERENCES "RGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RGroupSurveySendHistory" ADD CONSTRAINT "RGroupSurveySendHistory_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
