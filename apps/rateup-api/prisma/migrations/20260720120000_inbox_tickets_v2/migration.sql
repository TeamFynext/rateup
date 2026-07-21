-- Inbox Tickets v2: ticket identity on Conversation, the per-conversation
-- favourite flag, and the @mention signal table.

-- CreateEnum
CREATE TYPE "ResolutionResult" AS ENUM ('RESOLVED', 'ANSWERED', 'NO_RESPONSE', 'DUPLICATE');

-- AlterTable
-- The star lives on Conversation, not Contact, so one contact's tickets can be
-- starred independently.
ALTER TABLE "Conversation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "resolutionResult" "ResolutionResult",
ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "InboxMention" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "conversationId" UUID,
    "mentionedUserId" UUID NOT NULL,
    "messageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),

    CONSTRAINT "InboxMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxMention_orgId_mentionedUserId_clearedAt_idx" ON "InboxMention"("orgId", "mentionedUserId", "clearedAt");

-- CreateIndex
CREATE INDEX "InboxMention_contactId_mentionedUserId_clearedAt_idx" ON "InboxMention"("contactId", "mentionedUserId", "clearedAt");

-- CreateIndex
CREATE INDEX "InboxMention_conversationId_idx" ON "InboxMention"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_number_key" ON "Conversation"("number");

-- CreateIndex
CREATE INDEX "Conversation_orgId_isFavorite_idx" ON "Conversation"("orgId", "isFavorite");

-- AddForeignKey
ALTER TABLE "InboxMention" ADD CONSTRAINT "InboxMention_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMention" ADD CONSTRAINT "InboxMention_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMention" ADD CONSTRAINT "InboxMention_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMention" ADD CONSTRAINT "InboxMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
