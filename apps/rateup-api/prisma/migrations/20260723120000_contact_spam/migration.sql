-- Spam moves from a conversation status onto the contact.

-- AlterTable
ALTER TABLE "Contact"
  ADD COLUMN "isSpam" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "spamMarkedAt" TIMESTAMP(3),
  ADD COLUMN "spamMarkedBy" UUID;

-- CreateIndex
CREATE INDEX "Contact_orgId_isSpam_idx" ON "Contact"("orgId", "isSpam");

-- Backfill: every contact that was itself marked SPAM, or that owns a ticket
-- closed as SPAM, becomes a spam contact.
UPDATE "Contact" c
SET "isSpam" = true,
    "spamMarkedAt" = COALESCE(c."closedAt", NOW()),
    "spamMarkedBy" = c."closedBy"
WHERE c."waMessageAssignStatus" = 'SPAM'
   OR EXISTS (
     SELECT 1 FROM "Conversation" conv
     WHERE conv."contactId" = c.id AND conv."status" = 'SPAM'
   );

-- Retire SPAM as a stored status. Those tickets were closed; the reason is what
-- carries the spam signal from here on, and the contact flag above carries the
-- state. `closedAt` must be set or the inbox reads the ticket as still open.
UPDATE "Conversation"
SET "status" = 'CLOSED',
    "closeReason" = 'SPAM',
    "closedAt" = COALESCE("closedAt", NOW())
WHERE "status" = 'SPAM';

UPDATE "Contact"
SET "waMessageAssignStatus" = 'CLOSED',
    "closedAt" = COALESCE("closedAt", NOW())
WHERE "waMessageAssignStatus" = 'SPAM';
