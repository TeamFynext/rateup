-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "stats" JSONB DEFAULT '{"failed": "","sent": "","delivered": "" ,"read": ""}';

-- CreateTable
CREATE TABLE "WaMessageCampaginParticipantMap" (
    "campaignParticipantId" UUID NOT NULL,
    "waMessageId" UUID NOT NULL,

    CONSTRAINT "WaMessageCampaginParticipantMap_pkey" PRIMARY KEY ("campaignParticipantId","waMessageId")
);

-- AddForeignKey
ALTER TABLE "WaMessageCampaginParticipantMap" ADD CONSTRAINT "WaMessageCampaginParticipantMap_campaignParticipantId_fkey" FOREIGN KEY ("campaignParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessageCampaginParticipantMap" ADD CONSTRAINT "WaMessageCampaginParticipantMap_waMessageId_fkey" FOREIGN KEY ("waMessageId") REFERENCES "WaMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
