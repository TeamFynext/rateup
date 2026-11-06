-- Private notes move out of "WaMessage" into their own table, one ticket each.
-- Rows keep their ids, so ids already held by clients and "InboxMention" still resolve.
-- Legacy rows are matched on `exchangeProcess`: rows written before Jan 2026 were not
-- marked INTERNAL. Notes that never belonged to a ticket are legacy and are dropped
-- rather than guessed onto one. One transaction, so a failure leaves nothing half-moved.

BEGIN;

-- CreateTable
CREATE TABLE "InboxNote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "authorId" UUID,
    "body" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,

    CONSTRAINT "InboxNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxNote_conversationId_createdAt_idx" ON "InboxNote"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InboxNote_contactId_createdAt_idx" ON "InboxNote"("contactId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TEMP TABLE "_note_rows" AS
SELECT wm.*
FROM "WaMessage" wm
WHERE wm."messageBody"->>'exchangeProcess' = 'privateNote';

DO $$
DECLARE dropped INTEGER;
BEGIN
  SELECT COUNT(*) INTO dropped FROM "_note_rows" WHERE "conversationId" IS NULL;
  IF dropped > 0 THEN
    RAISE NOTICE 'inbox_notes: deleting % legacy notes with no ticket', dropped;
  END IF;
END $$;

-- `text.body` has always been written as a string; the jsonb text is a fallback so an
-- unexpected shape is kept rather than lost.
INSERT INTO "InboxNote" (
  "id", "orgId", "conversationId", "contactId", "authorId", "body", "clientId",
  "createdAt", "editedAt", "deletedAt", "deletedById"
)
SELECT
  r.id,
  c."orgId",
  conv.id,
  conv."contactId",
  author.id,
  CASE jsonb_typeof(r."messageBody"->'privateNote'->'text'->'body')
    WHEN 'string' THEN r."messageBody"->'privateNote'->'text'->>'body'
    WHEN 'null' THEN ''
    ELSE COALESCE((r."messageBody"->'privateNote'->'text'->'body')::text, '')
  END,
  r."messageId",
  COALESCE(r."waCreatedAt", r."createdAt"),
  NULL,
  r."deletedAt",
  NULL
FROM "_note_rows" r
JOIN "Conversation" conv ON conv.id = r."conversationId"
JOIN "Contact" c ON c.id = conv."contactId"
LEFT JOIN "User" author ON author.id = r."sendBy";

-- Mentions point at their note by foreign key instead of a bare message id, and at the
-- note's ticket.
ALTER TABLE "InboxMention" ADD COLUMN "noteId" UUID;

UPDATE "InboxMention" m
SET "noteId" = n.id, "conversationId" = n."conversationId"
FROM "InboxNote" n
WHERE n.id = m."messageId";

-- A mention whose note is gone (its ticket was deleted) would otherwise fall back to
-- the contact and badge every other ticket.
DELETE FROM "InboxMention" WHERE "noteId" IS NULL;

-- A note's mention list is now read from these rows. Notes written before the @Mentions
-- filter list theirs only in the body; they arrive already seen, so no one's filter fills
-- up with old mentions.
INSERT INTO "InboxMention" (
  "orgId", "contactId", "conversationId", "mentionedUserId", "noteId", "createdAt", "clearedAt"
)
SELECT DISTINCT ON (n.id, u.id)
  n."orgId", n."contactId", n."conversationId", u.id, n.id, n."createdAt", n."createdAt"
FROM "_note_rows" r
JOIN "InboxNote" n ON n.id = r.id
CROSS JOIN LATERAL jsonb_array_elements(
  CASE jsonb_typeof(r."messageBody"->'privateNote'->'mentionedUser')
    WHEN 'array' THEN r."messageBody"->'privateNote'->'mentionedUser'
    ELSE '[]'::jsonb
  END
) AS mentioned(value)
JOIN "User" u ON u.id::text = mentioned.value->>'id'
WHERE NOT EXISTS (
  SELECT 1 FROM "InboxMention" m WHERE m."noteId" = n.id AND m."mentionedUserId" = u.id
);

ALTER TABLE "InboxMention" DROP COLUMN "messageId";

-- CreateIndex
CREATE INDEX "InboxMention_noteId_idx" ON "InboxMention"("noteId");

-- AddForeignKey
ALTER TABLE "InboxMention" ADD CONSTRAINT "InboxMention_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "InboxNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The copied notes, and the legacy ones that had no ticket to go to.
DELETE FROM "WaMessage" wm USING "_note_rows" r WHERE wm.id = r.id;

DROP TABLE "_note_rows";

COMMIT;
