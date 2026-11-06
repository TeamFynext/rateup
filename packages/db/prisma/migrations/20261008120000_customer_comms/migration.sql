-- CreateEnum
CREATE TYPE "CustomerMessageChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CustomerMessageSource" AS ENUM ('DRIP', 'BROADCAST');

-- CreateEnum
CREATE TYPE "CustomerMessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EmailSuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'MANUAL');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingEmailOptOutAt" TIMESTAMP(3),
ADD COLUMN     "marketingWhatsappOptInAt" TIMESTAMP(3),
ADD COLUMN     "marketingWhatsappOptOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CustomerMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "channel" "CustomerMessageChannel" NOT NULL,
    "source" "CustomerMessageSource" NOT NULL,
    "key" TEXT NOT NULL,
    "broadcastId" UUID,
    "status" "CustomerMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "skipReason" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CustomerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "email" TEXT NOT NULL,
    "reason" "EmailSuppressionReason" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "DripStepSetting" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "email" JSONB,
    "whatsapp" JSONB,
    "editedAt" TIMESTAMP(3),
    "editedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DripStepSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "channels" "CustomerMessageChannel"[],
    "audience" JSONB NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "waTemplateName" TEXT,
    "waParams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdByStaffId" UUID NOT NULL,
    "createdByEmail" TEXT NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerMessage_orgId_createdAt_idx" ON "CustomerMessage"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerMessage_key_status_idx" ON "CustomerMessage"("key", "status");

-- CreateIndex
CREATE INDEX "CustomerMessage_broadcastId_status_idx" ON "CustomerMessage"("broadcastId", "status");

-- CreateIndex
CREATE INDEX "CustomerMessage_userId_sentAt_idx" ON "CustomerMessage"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMessage_userId_channel_key_key" ON "CustomerMessage"("userId", "channel", "key");

-- CreateIndex
CREATE INDEX "Broadcast_status_scheduledAt_idx" ON "Broadcast"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "CustomerMessage" ADD CONSTRAINT "CustomerMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMessage" ADD CONSTRAINT "CustomerMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMessage" ADD CONSTRAINT "CustomerMessage_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

