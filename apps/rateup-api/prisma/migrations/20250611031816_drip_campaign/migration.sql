-- AlterTable
ALTER TABLE "WaMessageCampaginParticipantMap" ADD COLUMN     "campaignParticipantDripStageId" UUID;

-- AlterTable
ALTER TABLE "WaSession" ADD COLUMN     "campaignParticipantDripStageId" UUID;

-- CreateTable
CREATE TABLE "CampaignDripStage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delay" INTEGER NOT NULL,
    "delayUnit" TEXT NOT NULL,
    "sendAtTime" TEXT,
    "totalRead" INTEGER NOT NULL DEFAULT 0,
    "totalSend" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "campaignId" UUID NOT NULL,
    "waTemplateId" UUID NOT NULL,

    CONSTRAINT "CampaignDripStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipantDripStage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "participantId" UUID NOT NULL,
    "dripStageId" UUID NOT NULL,

    CONSTRAINT "CampaignParticipantDripStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipantDripStage_participantId_dripStageId_key" ON "CampaignParticipantDripStage"("participantId", "dripStageId");

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_campaignParticipantDripStageId_fkey" FOREIGN KEY ("campaignParticipantDripStageId") REFERENCES "CampaignParticipantDripStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDripStage" ADD CONSTRAINT "CampaignDripStage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDripStage" ADD CONSTRAINT "CampaignDripStage_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipantDripStage" ADD CONSTRAINT "CampaignParticipantDripStage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CampaignParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipantDripStage" ADD CONSTRAINT "CampaignParticipantDripStage_dripStageId_fkey" FOREIGN KEY ("dripStageId") REFERENCES "CampaignDripStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessageCampaginParticipantMap" ADD CONSTRAINT "WaMessageCampaginParticipantMap_campaignParticipantDripSta_fkey" FOREIGN KEY ("campaignParticipantDripStageId") REFERENCES "CampaignParticipantDripStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
