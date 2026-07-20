-- Conversation sessions: audit columns, orgId NOT NULL, and the DB-level
-- invariant behind the whole session model — at most ONE open conversation
-- (closedAt IS NULL) per contact. The lifecycle service relies on this index:
-- its P2002 handler is what makes concurrent webhook opens race-safe.

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "openTrigger" TEXT,
ADD COLUMN     "openedBy" UUID;

-- ---------------------------------------------------------------------------
-- 1. orgId backfill, then NOT NULL. Rows created before the denormalization
--    (or by paths that skipped it) inherit their contact's org.
-- ---------------------------------------------------------------------------
UPDATE "Conversation" c
SET "orgId" = ct."orgId"
FROM "Contact" ct
WHERE c."orgId" IS NULL AND ct."id" = c."contactId";

ALTER TABLE "Conversation" ALTER COLUMN "orgId" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Repair drift before declaring the invariant.
-- ---------------------------------------------------------------------------

-- 2a. status/closedAt lockstep: a terminal status must carry a close stamp.
UPDATE "Conversation"
SET "closedAt" = COALESCE("lastMessageAt", "updatedAt", "createdAt")
WHERE "closedAt" IS NULL
  AND "status" IN ('CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

-- 2b. One open conversation per contact: keep the newest open row, close the
--     rest (double-creations from the pre-index race window). closeReason is
--     left NULL — these are repairs, not real closes.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "contactId" ORDER BY "createdAt" DESC, id DESC) AS rn
  FROM "Conversation"
  WHERE "closedAt" IS NULL
)
UPDATE "Conversation" c
SET "closedAt" = COALESCE(c."lastMessageAt", c."createdAt"),
    "status" = 'CLOSED',
    "closedByAutomation" = TRUE
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 3. The invariant. Partial unique indexes are not expressible in the Prisma
--    schema language; this migration is their home. Any code path that opens
--    conversations MUST create rows via the lifecycle service, which resolves
--    unique violations by adopting the winner's row.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "Conversation_open_per_contact_key"
ON "Conversation" ("contactId")
WHERE "closedAt" IS NULL;
