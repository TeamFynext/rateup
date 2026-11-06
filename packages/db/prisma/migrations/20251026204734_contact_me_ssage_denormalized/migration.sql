-- AlterTable
ALTER TABLE "public"."Contact" ADD COLUMN     "lastMessageBody" JSONB,
ADD COLUMN     "lastMessagePlatform" TEXT,
ADD COLUMN     "lastMessageSourceIdentifier" TEXT,
ADD COLUMN     "lastMessageWaCreatedAt" TIMESTAMP(3),
ADD COLUMN     "lastReceivedMetadata" JSONB,
ADD COLUMN     "lastSentMessageTimeStamp" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Contact_orgId_waMessageAssignStatus_lastReceivedMessageTime_idx" ON "public"."Contact"("orgId", "waMessageAssignStatus", "lastReceivedMessageTimeStamp" DESC);

-- CreateIndex
CREATE INDEX "Contact_orgId_blockedOnWhatsApp_lastReceivedMessageTimeStam_idx" ON "public"."Contact"("orgId", "blockedOnWhatsApp", "lastReceivedMessageTimeStamp" DESC);

-- CreateIndex
CREATE INDEX "Contact_orgId_lifecycleId_idx" ON "public"."Contact"("orgId", "lifecycleId");

-- CreateIndex
CREATE INDEX "Contact_name_idx" ON "public"."Contact"("name");

-- CreateIndex
CREATE INDEX "WaInboxAssign_contactId_teamId_idx" ON "public"."WaInboxAssign"("contactId", "teamId");

-- CreateIndex
CREATE INDEX "WaInboxAssign_assignedUserId_idx" ON "public"."WaInboxAssign"("assignedUserId");

-- CreateIndex
CREATE INDEX "WaInboxAssign_teamId_idx" ON "public"."WaInboxAssign"("teamId");

-- CreateIndex
CREATE INDEX "WaMessage_sourceIdentifier_contactId_idx" ON "public"."WaMessage"("sourceIdentifier", "contactId");

-- CreateIndex
CREATE INDEX "WaMessage_contactId_sourceIdentifier_idx" ON "public"."WaMessage"("contactId", "sourceIdentifier");
