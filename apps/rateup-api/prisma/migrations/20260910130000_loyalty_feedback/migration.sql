-- Loyalty feedback: a post-visit WhatsApp Flow per programme, one request row per ask.
--
-- LoyaltyFeedbackSetting is 1:1 with the programme and points at the ordinary
-- WaFlow/Survey pair that holds the questions (answers keep landing in SurveyResponse),
-- the UTILITY template with a FLOW button used outside the 24-hour service window, the
-- team whose Google review link happy customers are sent to, and the optional reward
-- granted once per customer when they tap that link.
--
-- LoyaltyFeedbackRequest.transactionId is unique so a single purchase can never
-- schedule two asks, whatever races between the cashier, the external API and Shopify.
--
-- WaFlow.categories stores what was picked at creation. Meta's own categories were never
-- persisted before; the RateUp-only LOYALTY_FEEDBACK category is how Feedback finds flows.

-- AlterTable
ALTER TABLE "WaFlow" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateEnum
CREATE TYPE "LoyaltyFeedbackRequestStatus" AS ENUM ('SCHEDULED', 'SENT', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "LoyaltyFeedbackSetting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "dbFlowId" UUID,
    "waTemplateId" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sendDelayMinutes" INTEGER NOT NULL DEFAULT 120,
    "cooldownDays" INTEGER NOT NULL DEFAULT 30,
    "rewardId" UUID,
    "happyMinRating" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyFeedbackSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyFeedbackRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "transactionId" UUID,
    "status" "LoyaltyFeedbackRequestStatus" NOT NULL DEFAULT 'SCHEDULED',
    "happy" BOOLEAN,
    "overallRating" INTEGER,
    "channel" TEXT,
    "failReason" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewClickedAt" TIMESTAMP(3),
    "rewardGrantedAt" TIMESTAMP(3),
    "customerRewardId" UUID,
    "surveyResponseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyFeedbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyFeedbackSetting_programId_key" ON "LoyaltyFeedbackSetting"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyFeedbackRequest_transactionId_key" ON "LoyaltyFeedbackRequest"("transactionId");

-- CreateIndex
CREATE INDEX "LoyaltyFeedbackRequest_programId_status_idx" ON "LoyaltyFeedbackRequest"("programId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyFeedbackRequest_programId_createdAt_idx" ON "LoyaltyFeedbackRequest"("programId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyFeedbackRequest_accountId_createdAt_idx" ON "LoyaltyFeedbackRequest"("accountId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_dbFlowId_fkey" FOREIGN KEY ("dbFlowId") REFERENCES "WaFlow"("dbFlowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LoyaltyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_customerRewardId_fkey" FOREIGN KEY ("customerRewardId") REFERENCES "CustomerReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

