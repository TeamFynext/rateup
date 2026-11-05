-- Contact identities, per-channel tickets, contact merge (rateup/contact-identity-plan.md).
-- Data backfills (Conversation.channelId, ContactIdentity, business portfolio) run from the
-- Update Center, not here, so this stays quick on large tables.

-- CreateEnum
CREATE TYPE "ContactIdentityKind" AS ENUM ('PHONE', 'EMAIL', 'WA_BSUID', 'IG_SCOPED', 'FB_PSID', 'WEBCHAT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ContactIdentitySource" AS ENUM ('INBOUND', 'META_LINK', 'HANDOFF', 'CUSTOMER', 'AGENT', 'IMPORT');

-- DropIndex
DROP INDEX "Conversation_contactId_idx";

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "businessPortfolioId" TEXT,
ADD COLUMN     "businessPortfolioName" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "channelId" UUID;

-- CreateTable
CREATE TABLE "ContactIdentity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "kind" "ContactIdentityKind" NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL,
    "source" "ContactIdentitySource" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "channelId" UUID,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMerge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "sourceContactId" UUID NOT NULL,
    "targetContactId" UUID NOT NULL,
    "mergedBy" UUID,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMerge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMergeSuggestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "contactAId" UUID NOT NULL,
    "contactBId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMergeSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactIdentity_orgId_kind_value_idx" ON "ContactIdentity"("orgId", "kind", "value");

-- CreateIndex
CREATE INDEX "ContactIdentity_contactId_kind_idx" ON "ContactIdentity"("contactId", "kind");

-- CreateIndex
CREATE INDEX "ContactIdentity_channelId_idx" ON "ContactIdentity"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactIdentity_orgId_kind_scope_value_key" ON "ContactIdentity"("orgId", "kind", "scope", "value");

-- CreateIndex
CREATE INDEX "ContactMerge_orgId_createdAt_idx" ON "ContactMerge"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMerge_targetContactId_idx" ON "ContactMerge"("targetContactId");

-- CreateIndex
CREATE INDEX "ContactMerge_sourceContactId_idx" ON "ContactMerge"("sourceContactId");

-- CreateIndex
CREATE INDEX "ContactMergeSuggestion_orgId_status_createdAt_idx" ON "ContactMergeSuggestion"("orgId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContactMergeSuggestion_contactAId_idx" ON "ContactMergeSuggestion"("contactAId");

-- CreateIndex
CREATE INDEX "ContactMergeSuggestion_contactBId_idx" ON "ContactMergeSuggestion"("contactBId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactMergeSuggestion_orgId_contactAId_contactBId_key" ON "ContactMergeSuggestion"("orgId", "contactAId", "contactBId");

-- CreateIndex
CREATE INDEX "WhatsappSettings_businessPortfolioId_idx" ON "WhatsappSettings"("businessPortfolioId");

-- CreateIndex
CREATE INDEX "ContactCustomFieldValue_fieldId_idx" ON "ContactCustomFieldValue"("fieldId");

-- Dedupe custom field values before the unique index: one value per contact and field,
-- keeping the newest (what the contact sheet already showed, since it read the last write).
DELETE FROM "ContactCustomFieldValue" v
USING "ContactCustomFieldValue" newer
WHERE v."contactId" = newer."contactId"
  AND v."fieldId" = newer."fieldId"
  AND (v."createdAt", v."id") < (newer."createdAt", newer."id");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCustomFieldValue_contactId_fieldId_key" ON "ContactCustomFieldValue"("contactId", "fieldId");

-- CreateIndex
CREATE INDEX "Conversation_contactId_channelId_createdAt_idx" ON "Conversation"("contactId", "channelId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Conversation_channelId_idx" ON "Conversation"("channelId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMerge" ADD CONSTRAINT "ContactMerge_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMergeSuggestion" ADD CONSTRAINT "ContactMergeSuggestion_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

