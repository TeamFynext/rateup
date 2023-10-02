/*
  Warnings:

  - You are about to drop the column `whatsappAccessToken` on the `Org` table. All the data in the column will be lost.
  - You are about to drop the column `respondentId` on the `SurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `WaTemplate` table. All the data in the column will be lost.
  - You are about to drop the `RGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RGroupSurveySendHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Respondent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RespondentGroupRelation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RespondentSurveySendHistory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone,orgId]` on the table `WaSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orgId` to the `WaSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orgId` to the `WaTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RGroup" DROP CONSTRAINT "RGroup_teamId_fkey";

-- DropForeignKey
ALTER TABLE "RGroupSurveySendHistory" DROP CONSTRAINT "RGroupSurveySendHistory_rgroupId_fkey";

-- DropForeignKey
ALTER TABLE "RGroupSurveySendHistory" DROP CONSTRAINT "RGroupSurveySendHistory_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "RGroupSurveySendHistory" DROP CONSTRAINT "RGroupSurveySendHistory_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Respondent" DROP CONSTRAINT "Respondent_teamId_fkey";

-- DropForeignKey
ALTER TABLE "RespondentGroupRelation" DROP CONSTRAINT "RespondentGroupRelation_respondentId_fkey";

-- DropForeignKey
ALTER TABLE "RespondentGroupRelation" DROP CONSTRAINT "RespondentGroupRelation_rgroupId_fkey";

-- DropForeignKey
ALTER TABLE "RespondentSurveySendHistory" DROP CONSTRAINT "RespondentSurveySendHistory_respondentId_fkey";

-- DropForeignKey
ALTER TABLE "RespondentSurveySendHistory" DROP CONSTRAINT "RespondentSurveySendHistory_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "RespondentSurveySendHistory" DROP CONSTRAINT "RespondentSurveySendHistory_templateId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_respondentId_fkey";

-- DropForeignKey
ALTER TABLE "WaTemplate" DROP CONSTRAINT "WaTemplate_teamId_fkey";

-- DropIndex
DROP INDEX "WaSession_phone_key";

-- AlterTable
ALTER TABLE "Org" DROP COLUMN "whatsappAccessToken";

-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "respondentId",
ADD COLUMN     "waCustomerId" UUID;

-- AlterTable
ALTER TABLE "WaSession" ADD COLUMN     "orgId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "WaTemplate" DROP COLUMN "teamId",
ADD COLUMN     "orgId" UUID NOT NULL;

-- DropTable
DROP TABLE "RGroup";

-- DropTable
DROP TABLE "RGroupSurveySendHistory";

-- DropTable
DROP TABLE "Respondent";

-- DropTable
DROP TABLE "RespondentGroupRelation";

-- DropTable
DROP TABLE "RespondentSurveySendHistory";

-- CreateTable
CREATE TABLE "WhatsappSettings" (
    "orgId" UUID NOT NULL,
    "accessToken" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,
    "webhookPassword" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WaCustomer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "teamId" UUID NOT NULL,

    CONSTRAINT "WaCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaCustomerGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "WaCustomerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaCustomerGroupMap" (
    "waCustomerId" UUID NOT NULL,
    "waCustomerGroupId" UUID NOT NULL,

    CONSTRAINT "WaCustomerGroupMap_pkey" PRIMARY KEY ("waCustomerId","waCustomerGroupId")
);

-- CreateTable
CREATE TABLE "WaCustomerSurveySendHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "waCustomerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaCustomerSurveySendHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaCustomerGroupSurveySendHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "waCustomerGroupId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaCustomerGroupSurveySendHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSettings_orgId_key" ON "WhatsappSettings"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "WaCustomer_phone_teamId_key" ON "WaCustomer"("phone", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WaCustomerGroup_name_teamId_key" ON "WaCustomerGroup"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WaSession_phone_orgId_key" ON "WaSession"("phone", "orgId");

-- AddForeignKey
ALTER TABLE "WhatsappSettings" ADD CONSTRAINT "WhatsappSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_waCustomerId_fkey" FOREIGN KEY ("waCustomerId") REFERENCES "WaCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomer" ADD CONSTRAINT "WaCustomer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroup" ADD CONSTRAINT "WaCustomerGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupMap" ADD CONSTRAINT "WaCustomerGroupMap_waCustomerId_fkey" FOREIGN KEY ("waCustomerId") REFERENCES "WaCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupMap" ADD CONSTRAINT "WaCustomerGroupMap_waCustomerGroupId_fkey" FOREIGN KEY ("waCustomerGroupId") REFERENCES "WaCustomerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" ADD CONSTRAINT "WaCustomerSurveySendHistory_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" ADD CONSTRAINT "WaCustomerSurveySendHistory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" ADD CONSTRAINT "WaCustomerSurveySendHistory_waCustomerId_fkey" FOREIGN KEY ("waCustomerId") REFERENCES "WaCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" ADD CONSTRAINT "WaCustomerGroupSurveySendHistory_waCustomerGroupId_fkey" FOREIGN KEY ("waCustomerGroupId") REFERENCES "WaCustomerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" ADD CONSTRAINT "WaCustomerGroupSurveySendHistory_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" ADD CONSTRAINT "WaCustomerGroupSurveySendHistory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaTemplate" ADD CONSTRAINT "WaTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
