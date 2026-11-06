-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_teamId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_surveyTeamMapId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyStats" DROP CONSTRAINT "SurveyStats_surveyTeamMapId_fkey";

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyStats" ADD CONSTRAINT "SurveyStats_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
