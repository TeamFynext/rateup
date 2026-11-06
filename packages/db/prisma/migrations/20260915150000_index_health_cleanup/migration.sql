-- Index health cleanup, driven by pg_stat_user_indexes on production.
--
-- NOTE: plain (non-CONCURRENT) DROP/CREATE INDEX, because Prisma runs each
-- migration inside a transaction and CONCURRENTLY is not allowed there. Dropping
-- or building an index on "WaMessage" takes a lock that blocks writes. On
-- production, run the CONCURRENTLY variants below by hand *before* deploying;
-- the IF [NOT] EXISTS guards then make this migration a no-op.
--
--   DROP INDEX CONCURRENTLY IF EXISTS "WaMessage_contactId_sourceIdentifier_idx";
--   ...one statement per DROP below, same names...
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "ContactGroupMap_contactGroupId_idx" ON "ContactGroupMap"("contactGroupId");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "WaMessageOrgTeamMap_messageId_idx" ON "WaMessageOrgTeamMap"("messageId");

-- Reaction lookups on messageBody JSON paths (20250806093107_index_on_wamessage).
-- No query reads these paths any more; ~290 MB with zero scans.
DROP INDEX IF EXISTS "idx_wamessage_body_reaction_msgid_1";
DROP INDEX IF EXISTS "idx_wamessage_body_reaction_msgid_2";
DROP INDEX IF EXISTS "idx_wamessage_body_reaction_msgid_3";
DROP INDEX IF EXISTS "idx_wamessage_body_reaction_msgid_4";

-- Zero scans. (sourceIdentifier, contactId) stays and is used; sourceIdentifier
-- is compared on digits, never with `=`, so a btree on the raw column adds little.
DROP INDEX IF EXISTS "WaMessage_contactId_sourceIdentifier_idx";

-- errorCode is only ever read after joining on WaMessage.id; nothing filters by
-- it. (WaMessage_meteredConversationId_idx also shows zero scans but stays: an
-- org delete cascades to MeteredConversation and its foreign-key check needs it.)
DROP INDEX IF EXISTS "WaMessage_errorCode_idx";

-- Name search is ILIKE '%...%' / contains, which a btree cannot serve.
DROP INDEX IF EXISTS "Contact_name_idx";

-- Left over from the contact-grained inbox list.
DROP INDEX IF EXISTS "Contact_orgId_blockedOnWhatsApp_lastReceivedMessageTimeStam_idx";

-- Low-cardinality columns the planner never picks.
DROP INDEX IF EXISTS "WaMessageOrgTeamMap_type_idx";
DROP INDEX IF EXISTS "WaMessageOrgTeamMap_externalApi_idx";

-- ContactGroupMap's primary key (contactId, contactGroupId) already covers
-- contactId lookups, but group-scoped reads (WHERE contactGroupId IN (...))
-- could use neither and sequentially scanned the table.
DROP INDEX IF EXISTS "ContactGroupMap_contactId_idx";
CREATE INDEX IF NOT EXISTS "ContactGroupMap_contactGroupId_idx" ON "ContactGroupMap"("contactGroupId");

-- WaMessageOrgTeamMap is joined on messageId and cascades from WaMessage deletes,
-- but messageId had no index.
CREATE INDEX IF NOT EXISTS "WaMessageOrgTeamMap_messageId_idx" ON "WaMessageOrgTeamMap"("messageId");

-- Conversation analytics now scope by the denormalized Conversation."orgId"
-- instead of joining Contact. Every create path sets it, but backfill any row
-- that predates that so no conversation silently drops out of the stats.
UPDATE "Conversation" c
SET "orgId" = ct."orgId"
FROM "Contact" ct
WHERE ct.id = c."contactId"
  AND c."orgId" IS NULL;
