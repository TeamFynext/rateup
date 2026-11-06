/*
  Warnings:

  - The primary key for the `WaMessageCampaginParticipantMap` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[waMessageId]` on the table `WaMessageCampaginParticipantMap` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CampaignMessageQueueStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "WaMessageCampaginParticipantMap" DROP CONSTRAINT "WaMessageCampaginParticipantMap_pkey";

-- CreateTable
CREATE TABLE "CampaignStats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "totalRead" INTEGER NOT NULL DEFAULT 0,
    "totalSend" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" UUID NOT NULL,

    CONSTRAINT "CampaignStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMessageQueue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignParticipantId" UUID NOT NULL,
    "status" "CampaignMessageQueueStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignStats_campaignId_key" ON "CampaignStats"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "WaMessageCampaginParticipantMap_waMessageId_key" ON "WaMessageCampaginParticipantMap"("waMessageId");

-- AddForeignKey
ALTER TABLE "CampaignStats" ADD CONSTRAINT "CampaignStats_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessageQueue" ADD CONSTRAINT "CampaignMessageQueue_campaignParticipantId_fkey" FOREIGN KEY ("campaignParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
