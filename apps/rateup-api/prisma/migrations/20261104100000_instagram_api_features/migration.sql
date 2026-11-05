-- CreateEnum
CREATE TYPE "MetaLoginType" AS ENUM ('FACEBOOK_PAGE', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "InstagramMentionKind" AS ENUM ('STORY', 'MEDIA', 'COMMENT');

-- CreateEnum
CREATE TYPE "InstagramMentionStatus" AS ENUM ('PENDING', 'AWARDED', 'SKIPPED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "TriggerEvent" ADD VALUE 'INSTAGRAM_STORY_REPLY';

-- AlterEnum
ALTER TYPE "LoyaltyEventType" ADD VALUE 'INSTAGRAM_MENTION_REWARDED';

-- AlterTable
ALTER TABLE "MetaChannelSettings" ADD COLUMN     "loginType" "MetaLoginType" NOT NULL DEFAULT 'FACEBOOK_PAGE',
ADD COLUMN     "reconnectRequiredAt" TIMESTAMP(3),
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenRefreshedAt" TIMESTAMP(3),
ALTER COLUMN "fbPageId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "igBlockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "adThreadUntil" TIMESTAMP(3),
ADD COLUMN     "sourceMediaId" TEXT;

-- CreateTable
CREATE TABLE "InstagramMention" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "ibaId" TEXT NOT NULL,
    "kind" "InstagramMentionKind" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "mediaId" TEXT,
    "permalink" TEXT,
    "igsId" TEXT,
    "username" TEXT,
    "contactId" UUID,
    "status" "InstagramMentionStatus" NOT NULL DEFAULT 'PENDING',
    "points" INTEGER,
    "transactionId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "InstagramMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramMention_orgId_status_createdAt_idx" ON "InstagramMention"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InstagramMention_orgId_username_idx" ON "InstagramMention"("orgId", "username");

-- CreateIndex
CREATE INDEX "InstagramMention_contactId_createdAt_idx" ON "InstagramMention"("contactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMention_orgId_kind_sourceId_key" ON "InstagramMention"("orgId", "kind", "sourceId");

-- CreateIndex
CREATE INDEX "Conversation_orgId_sourceMediaId_idx" ON "Conversation"("orgId", "sourceMediaId");

-- AddForeignKey
ALTER TABLE "InstagramMention" ADD CONSTRAINT "InstagramMention_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMention" ADD CONSTRAINT "InstagramMention_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

