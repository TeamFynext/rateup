-- DropForeignKey
ALTER TABLE "SurveyTeamMap" DROP CONSTRAINT "SurveyTeamMap_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyTeamMap" DROP CONSTRAINT "SurveyTeamMap_teamId_fkey";

-- AddForeignKey
ALTER TABLE "SurveyTeamMap" ADD CONSTRAINT "SurveyTeamMap_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyTeamMap" ADD CONSTRAINT "SurveyTeamMap_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
