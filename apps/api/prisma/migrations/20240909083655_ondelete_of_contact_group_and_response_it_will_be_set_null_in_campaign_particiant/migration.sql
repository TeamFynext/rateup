-- DropForeignKey
ALTER TABLE "CampaignParticipant" DROP CONSTRAINT "CampaignParticipant_contactGroupId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignParticipant" DROP CONSTRAINT "CampaignParticipant_responseId_fkey";

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_contactGroupId_fkey" FOREIGN KEY ("contactGroupId") REFERENCES "ContactGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
