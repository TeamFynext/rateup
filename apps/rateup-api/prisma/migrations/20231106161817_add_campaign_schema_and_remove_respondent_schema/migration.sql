/*
  Warnings:

  - You are about to drop the column `waCustomerId` on the `SurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the `WaCustomer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WaCustomerGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WaCustomerGroupMap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WaCustomerGroupSurveySendHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WaCustomerSurveySendHistory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[campaignParticipantId]` on the table `WaSession` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_waCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomer" DROP CONSTRAINT "WaCustomer_teamId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroup" DROP CONSTRAINT "WaCustomerGroup_teamId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroupMap" DROP CONSTRAINT "WaCustomerGroupMap_waCustomerGroupId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroupMap" DROP CONSTRAINT "WaCustomerGroupMap_waCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" DROP CONSTRAINT "WaCustomerGroupSurveySendHistory_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" DROP CONSTRAINT "WaCustomerGroupSurveySendHistory_templateId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" DROP CONSTRAINT "WaCustomerGroupSurveySendHistory_waCustomerGroupId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" DROP CONSTRAINT "WaCustomerSurveySendHistory_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" DROP CONSTRAINT "WaCustomerSurveySendHistory_templateId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" DROP CONSTRAINT "WaCustomerSurveySendHistory_waCustomerId_fkey";

-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "waCustomerId",
ADD COLUMN     "contactId" UUID;

-- AlterTable
ALTER TABLE "WaSession" ADD COLUMN     "campaignParticipantId" UUID;

-- DropTable
DROP TABLE "WaCustomer";

-- DropTable
DROP TABLE "WaCustomerGroup";

-- DropTable
DROP TABLE "WaCustomerGroupMap";

-- DropTable
DROP TABLE "WaCustomerGroupSurveySendHistory";

-- DropTable
DROP TABLE "WaCustomerSurveySendHistory";

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "teamId" UUID NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "teamId" UUID NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroupMap" (
    "contactId" UUID NOT NULL,
    "contactGroupId" UUID NOT NULL,

    CONSTRAINT "ContactGroupMap_pkey" PRIMARY KEY ("contactId","contactGroupId")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "type" TEXT NOT NULL,
    "teamId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "waTemplateId" UUID,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "campaignId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "contactGroupId" UUID,
    "responseId" UUID,

    CONSTRAINT "CampaignParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_teamId_key" ON "Contact"("phone", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_teamId_key" ON "Contact"("email", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_name_teamId_key" ON "ContactGroup"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipant_campaignId_contactId_key" ON "CampaignParticipant"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "WaSession_campaignParticipantId_key" ON "WaSession"("campaignParticipantId");

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_campaignParticipantId_fkey" FOREIGN KEY ("campaignParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupMap" ADD CONSTRAINT "ContactGroupMap_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupMap" ADD CONSTRAINT "ContactGroupMap_contactGroupId_fkey" FOREIGN KEY ("contactGroupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_contactGroupId_fkey" FOREIGN KEY ("contactGroupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
