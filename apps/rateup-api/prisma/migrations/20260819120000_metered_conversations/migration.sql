-- CreateEnum
CREATE TYPE "WaConversationCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE');

-- CreateEnum
CREATE TYPE "WaPricingModel" AS ENUM ('PMP', 'CBP');

-- CreateTable
CREATE TABLE "MeteredConversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "channelId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" UUID,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "inboundCount" INTEGER NOT NULL DEFAULT 0,
    "outboundCount" INTEGER NOT NULL DEFAULT 0,
    "category" "WaConversationCategory",
    "pricingModel" "WaPricingModel",
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "pricingType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeteredConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeteredConversation_orgId_platform_channelId_customerId_open_key"
    ON "MeteredConversation"("orgId", "platform", "channelId", "customerId", "openedAt");

-- CreateIndex
CREATE INDEX "MeteredConversation_orgId_platform_channelId_customerId_expi_idx"
    ON "MeteredConversation"("orgId", "platform", "channelId", "customerId", "expiresAt");

-- CreateIndex
CREATE INDEX "MeteredConversation_orgId_openedAt_idx" ON "MeteredConversation"("orgId", "openedAt");

-- AddForeignKey
ALTER TABLE "MeteredConversation" ADD CONSTRAINT "MeteredConversation_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeteredConversation" ADD CONSTRAINT "MeteredConversation_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "meteredConversationId" UUID,
ADD COLUMN     "pricingCategory" "WaConversationCategory",
ADD COLUMN     "pricingModel" "WaPricingModel",
ADD COLUMN     "pricingBillable" BOOLEAN,
ADD COLUMN     "pricingType" TEXT;

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_meteredConversationId_fkey"
    FOREIGN KEY ("meteredConversationId") REFERENCES "MeteredConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
-- Status writes match on the Meta message id in bulkUpdateStatuses; without this
-- the batched `WHERE "messageId" = ANY(...)` degrades to a sequential scan.
--
-- NOTE: plain (non-CONCURRENT) CREATE INDEX, because Prisma runs each migration
-- inside a transaction and CONCURRENTLY is not allowed there. This takes a write
-- lock on "WaMessage" for the duration of the build. On a large production table,
-- build these two indexes manually with CREATE INDEX CONCURRENTLY *before*
-- deploying, then this migration is a no-op thanks to IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS "WaMessage_messageId_idx" ON "WaMessage"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WaMessage_meteredConversationId_idx" ON "WaMessage"("meteredConversationId");

-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "monthlyMeteredConversationsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "annualMeteredConversationsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "conversationLimitNotifiedAt" TIMESTAMP(3);
