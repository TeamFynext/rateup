-- Inbox conversation hardening:
--   1. Status becomes a first-class enum on both Conversation and Contact.
--   2. Close attribution (resolvedAt / closeReason / closedByAutomation).
--   3. Denormalized metrics on Conversation (orgId + message timestamps + counts).

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "InboxStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

CREATE TYPE "CloseReason" AS ENUM ('MANUAL', 'AUTOMATION_IDLE', 'RULE', 'SPAM');

-- ---------------------------------------------------------------------------
-- 2. Sanitize any value outside the enum vocabulary before casting.
--    The cast below hard-fails on a single stray row, so this must run first.
-- ---------------------------------------------------------------------------

UPDATE "Conversation"
SET "status" = 'UNASSIGNED'
WHERE "status" IS NULL
   OR "status" NOT IN ('UNASSIGNED', 'ASSIGNED', 'CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

UPDATE "Contact"
SET "waMessageAssignStatus" = 'UNASSIGNED'
WHERE "waMessageAssignStatus" IS NULL
   OR "waMessageAssignStatus" NOT IN ('UNASSIGNED', 'ASSIGNED', 'CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

-- ---------------------------------------------------------------------------
-- 3. Cast the columns. The default must be dropped and re-added around the
--    type change, since 'UNASSIGNED'::text is not assignable to the new type.
--    Indexes on these columns are rebuilt automatically by ALTER TYPE.
-- ---------------------------------------------------------------------------

ALTER TABLE "Conversation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "status" TYPE "InboxStatus" USING "status"::"InboxStatus";
ALTER TABLE "Conversation" ALTER COLUMN "status" SET DEFAULT 'UNASSIGNED';

ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" DROP DEFAULT;
ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" TYPE "InboxStatus" USING "waMessageAssignStatus"::"InboxStatus";
ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" SET DEFAULT 'UNASSIGNED';

-- ---------------------------------------------------------------------------
-- 4. Close attribution + denormalized metric columns.
--    "orgId" is NOT NULL in the schema but the table has rows, so it is added
--    nullable, backfilled from Contact, then constrained.
-- ---------------------------------------------------------------------------

ALTER TABLE "Conversation"
  ADD COLUMN "orgId"                 UUID,
  ADD COLUMN "resolvedAt"            TIMESTAMP(3),
  ADD COLUMN "closeReason"           "CloseReason",
  ADD COLUMN "closedByAutomation"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastMessageAt"         TIMESTAMP(3),
  ADD COLUMN "lastCustomerMessageAt" TIMESTAMP(3),
  ADD COLUMN "lastAgentMessageAt"    TIMESTAMP(3),
  ADD COLUMN "messageCount"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reopenCount"           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing rows: updatedAt has no meaningful history, seed it from createdAt.
UPDATE "Conversation" SET "updatedAt" = "createdAt";

-- ---------------------------------------------------------------------------
-- 5. Backfill orgId from the owning Contact, then enforce NOT NULL.
-- ---------------------------------------------------------------------------

UPDATE "Conversation" c
SET "orgId" = ct."orgId"
FROM "Contact" ct
WHERE ct."id" = c."contactId";

-- Conversation.contactId is NOT NULL with an FK to Contact, so every row is
-- covered by the update above. Guard anyway: a leftover NULL would otherwise
-- surface as an opaque constraint violation.
DO $$
DECLARE orphaned BIGINT;
BEGIN
  SELECT COUNT(*) INTO orphaned FROM "Conversation" WHERE "orgId" IS NULL;
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'Cannot set Conversation.orgId NOT NULL: % row(s) have no resolvable Contact.orgId', orphaned;
  END IF;
END $$;

ALTER TABLE "Conversation" ALTER COLUMN "orgId" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Backfill resolvedAt for conversations already in the RESOLVED state.
--    closeReason stays NULL for historical rows: the reason was never recorded
--    and inventing one would poison the analytics this column exists to serve.
-- ---------------------------------------------------------------------------

UPDATE "Conversation"
SET "resolvedAt" = "closedAt"
WHERE "status" = 'RESOLVED' AND "closedAt" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Backfill message metrics from WaMessage.
--    INTERNAL messages (system notes, private notes) carry a non-null "sendBy"
--    but are not agent replies, so they are excluded from every metric here --
--    counting them would inflate messageCount and corrupt lastAgentMessageAt.
--    Direction is inferred from "sendBy": NULL => inbound (customer).
-- ---------------------------------------------------------------------------

UPDATE "Conversation" c
SET "messageCount"          = m."messageCount",
    "lastMessageAt"         = m."lastMessageAt",
    "lastCustomerMessageAt" = m."lastCustomerMessageAt",
    "lastAgentMessageAt"    = m."lastAgentMessageAt"
FROM (
  SELECT
    "conversationId",
    COUNT(*)::INTEGER                                                       AS "messageCount",
    MAX(COALESCE("waCreatedAt", "createdAt"))                               AS "lastMessageAt",
    MAX(COALESCE("waCreatedAt", "createdAt")) FILTER (WHERE "sendBy" IS NULL)     AS "lastCustomerMessageAt",
    MAX(COALESCE("waCreatedAt", "createdAt")) FILTER (WHERE "sendBy" IS NOT NULL) AS "lastAgentMessageAt"
  FROM "WaMessage"
  WHERE "conversationId" IS NOT NULL
    AND ("sourcePlatform" IS NULL OR "sourcePlatform" <> 'INTERNAL')
  GROUP BY "conversationId"
) m
WHERE m."conversationId" = c."id";

-- ---------------------------------------------------------------------------
-- 8. Indexes for the denormalized analytics reads.
-- ---------------------------------------------------------------------------

CREATE INDEX "Conversation_orgId_status_idx" ON "Conversation"("orgId", "status");
CREATE INDEX "Conversation_orgId_createdAt_idx" ON "Conversation"("orgId", "createdAt");
CREATE INDEX "Conversation_orgId_lastMessageAt_idx" ON "Conversation"("orgId", "lastMessageAt" DESC);
