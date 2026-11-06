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

-- Data repair: pre-invariant closes stamped "closedAt"/"closedBy" on the
-- conversation but left "status" on a live value, so those tickets kept showing
-- up in the Open tab next to their own successor. A close stamp is the record of
-- a finished ticket, so the status is brought in line with it. Every current
-- writer goes through `conversationStatusData`, which sets both together.
--
-- Only rows that never recorded *how* they closed are touched — an existing
-- RESOLVED / UNRESOLVED / SPAM / CLOSED status is never overwritten. For the
-- rows in scope the close type is recovered from whatever survived, in order of
-- reliability: the resolution stamp, then the close reason, then the contact's
-- own status when this is its newest ticket (the pre-v2 close wrote the type
-- there). Plain CLOSED is the last resort — it means "closed, type unrecorded",
-- not "closed rather than resolved".
-- "updatedAt" is bumped with it so clients holding a cached copy of the row pick
-- the corrected status up instead of keeping the stale one.
UPDATE "Conversation" conv
SET "updatedAt" = NOW(),
  "status" = (
  CASE
    WHEN conv."resolvedAt" IS NOT NULL THEN 'RESOLVED'
    WHEN conv."closeReason" = 'SPAM' THEN 'SPAM'
    WHEN c."waMessageAssignStatus"::TEXT IN ('CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED')
      AND NOT EXISTS (
        SELECT 1 FROM "Conversation" newer
        WHERE newer."contactId" = conv."contactId"
          AND newer."createdAt" > conv."createdAt"
      )
      THEN c."waMessageAssignStatus"::TEXT
    ELSE 'CLOSED'
  END
)::"InboxStatus"
FROM "Contact" c
WHERE c.id = conv."contactId"
  AND conv."closedAt" IS NOT NULL
  AND conv."status" NOT IN ('CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');
