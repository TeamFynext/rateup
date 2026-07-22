-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "allChannels" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TeamWhatsappChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamWhatsappChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamWhatsappChannel_channelId_idx" ON "TeamWhatsappChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamWhatsappChannel_teamId_channelId_key" ON "TeamWhatsappChannel"("teamId", "channelId");

-- AddForeignKey
ALTER TABLE "TeamWhatsappChannel" ADD CONSTRAINT "TeamWhatsappChannel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWhatsappChannel" ADD CONSTRAINT "TeamWhatsappChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WhatsappSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
