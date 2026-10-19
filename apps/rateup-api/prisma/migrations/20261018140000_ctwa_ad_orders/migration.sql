-- AlterEnum
ALTER TYPE "TriggerEvent" ADD VALUE 'WHATSAPP_AD_REFERRAL';

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN "adConversionSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdReferral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "conversationId" UUID,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "headline" TEXT,
    "body" TEXT,
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "ctwaClid" TEXT,
    "phoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdReferral_contactId_createdAt_idx" ON "AdReferral"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "AdReferral_orgId_createdAt_idx" ON "AdReferral"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AdReferral_orgId_sourceId_idx" ON "AdReferral"("orgId", "sourceId");

-- AddForeignKey
ALTER TABLE "AdReferral" ADD CONSTRAINT "AdReferral_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReferral" ADD CONSTRAINT "AdReferral_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReferral" ADD CONSTRAINT "AdReferral_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
