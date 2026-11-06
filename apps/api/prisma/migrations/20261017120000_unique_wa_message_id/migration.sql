-- One WaMessage per platform message id.
--
-- Dedupe used to be check-then-insert: read for the id, write if absent. Meta
-- redelivers webhooks, and with several API replicas two copies of one message
-- both passed the read and both were written — and both ran the automations.
-- A unique index makes the insert itself the check (see addNewWaMessage).
--
-- Partial (`WHERE "messageId" IS NOT NULL`) so the rows that never carry an id
-- (call logs, sends Meta rejected outright) stay out of it. Declared in
-- schema.prisma through the `partialIndexes` preview feature.
--
-- NOTE: plain (non-CONCURRENT) CREATE/DROP INDEX, because Prisma runs each
-- migration inside a transaction and CONCURRENTLY is not allowed there. Applied
-- as-is, this holds a lock on "WaMessage" that blocks every message write (reads
-- carry on) for the whole dedupe plus the index build. On production, run this
-- by hand *before* deploying instead:
--
--   -- 1. De-duplicate, without the table lock. Same block as below; the setting
--   --    skips its LOCK TABLE. Safe to re-run.
--   SET rateup.dedupe_wa_message_nolock = 'on';
--   DO $$ ... $$;            -- the second DO block below, verbatim
--   RESET rateup.dedupe_wa_message_nolock;
--
--   -- 2. Build the index without blocking writes.
--   CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "WaMessage_messageId_key"
--     ON "WaMessage"("messageId") WHERE "messageId" IS NOT NULL;
--
--      If it fails with a unique violation, a new duplicate was written between
--      steps 1 and 2 (the old code still races). It leaves an INVALID index
--      behind: `DROP INDEX CONCURRENTLY "WaMessage_messageId_key";` and repeat
--      from step 1.
--
--   -- 3. Drop what the new index replaces.
--   DROP INDEX CONCURRENTLY IF EXISTS "WaMessage_messageId_idx";
--   DROP INDEX CONCURRENTLY IF EXISTS "WaMessage_contactId_idx";
--
-- With the valid index in place, the dedupe block below returns at once and the
-- IF [NOT] EXISTS guards make the rest of this migration a no-op.

-- A failed CONCURRENTLY build leaves an INVALID index under this name, which the
-- IF NOT EXISTS below would accept as done while enforcing nothing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = 'WaMessage_messageId_key' AND NOT i.indisvalid
  ) THEN
    RAISE EXCEPTION 'Index "WaMessage_messageId_key" exists but is INVALID (a failed CONCURRENTLY build). '
      'Run DROP INDEX CONCURRENTLY "WaMessage_messageId_key"; then re-run the dedupe and the build.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = 'WaMessage_messageId_key' AND i.indisvalid
  ) THEN
    RAISE NOTICE 'WaMessage_messageId_key already built; nothing to de-duplicate';
    RETURN;
  END IF;

  -- Writes wait from here until the migration commits, so no duplicate can land
  -- between this dedupe and the index build that follows it. Reads carry on.
  IF current_setting('rateup.dedupe_wa_message_nolock', true) IS DISTINCT FROM 'on' THEN
    LOCK TABLE "WaMessage" IN SHARE ROW EXCLUSIVE MODE;
  END IF;

  -- An empty id is no id: nothing can ever match it, and as a key it would make
  -- every id-less row a duplicate of every other. The code now writes NULL.
  UPDATE "WaMessage" SET "messageId" = NULL WHERE "messageId" = '';

  -- Every row after the earliest of its messageId, beside the earliest (kept).
  --
  -- Not every such row is a redelivery. A row is deleted only when it is the
  -- same message as the one kept: same contact, platform and direction, and
  -- both or neither a reaction. Anything else keeps its history under a new id:
  --
  --   - INTERNAL events: the inbox writes several under one client-supplied id
  --     (a bulk assign hands the same id to every contact; a reassignment
  --     writes an "added" and a "removed" event).
  --   - Instagram reactions, which were stored under the id of the message
  --     they react to.
  --   - The same id on another contact (another org), which nothing here can
  --     prove is a copy.
  CREATE TEMP TABLE wa_message_dup ON COMMIT DROP AS
  WITH dup_ids AS (
    SELECT "messageId"
    FROM "WaMessage"
    WHERE "messageId" IS NOT NULL
    GROUP BY "messageId"
    HAVING COUNT(*) > 1
  ),
  ranked AS (
    SELECT
      m.id,
      first_value(m.id) OVER w AS keeper,
      row_number() OVER w AS rn
    FROM "WaMessage" m
    JOIN dup_ids d ON d."messageId" = m."messageId"
    WINDOW w AS (PARTITION BY m."messageId" ORDER BY m."createdAt", m.id)
  )
  SELECT
    r.id,
    r.keeper,
    NOT (
      m."sourcePlatform" IS DISTINCT FROM 'INTERNAL'
      AND m."sourcePlatform" IS NOT DISTINCT FROM k."sourcePlatform"
      AND m."contactId" IS NOT DISTINCT FROM k."contactId"
      AND (m."messageBody" ->> 'exchangeProcess') IS NOT DISTINCT FROM (k."messageBody" ->> 'exchangeProcess')
      AND (
        (m."messageBody" -> 'receive') ? 'reaction'
        OR (m."messageBody" -> 'send') ? 'reaction'
        OR (m."messageBody" -> 'send' -> 'payload') ? 'reaction'
      ) IS NOT DISTINCT FROM (
        (k."messageBody" -> 'receive') ? 'reaction'
        OR (k."messageBody" -> 'send') ? 'reaction'
        OR (k."messageBody" -> 'send' -> 'payload') ? 'reaction'
      )
    ) AS rekey
  FROM ranked r
  JOIN "WaMessage" m ON m.id = r.id
  JOIN "WaMessage" k ON k.id = r.keeper
  WHERE r.rn > 1;

  -- Distinct rows sharing an id: kept, under an id no webhook will match. Status
  -- receipts for the real id then land on the row kept above.
  UPDATE "WaMessage" m
  SET "messageId" = m."messageId" || '#dup-' || m.id::text
  FROM wa_message_dup d
  WHERE d.id = m.id AND d.rekey;

  -- True copies are deleted. First carry over what only the copy may hold.

  -- Delivery receipts: a status written to the copy alone (updates by id match
  -- an arbitrary one of them) is merged in where the kept row has none.
  UPDATE "WaMessage" k
  SET stats = COALESCE(k.stats, '{}'::jsonb) || s.merged || COALESCE(
    (
      SELECT jsonb_object_agg(e.key, e.value)
      FROM jsonb_each(COALESCE(k.stats, '{}'::jsonb)) e
      WHERE e.value NOT IN ('""'::jsonb, 'null'::jsonb)
    ),
    '{}'::jsonb
  )
  FROM (
    SELECT
      d.keeper,
      jsonb_strip_nulls(jsonb_build_object(
        'sent', MIN(NULLIF(m.stats ->> 'sent', '')),
        'delivered', MIN(NULLIF(m.stats ->> 'delivered', '')),
        'read', MIN(NULLIF(m.stats ->> 'read', '')),
        'failed', MIN(NULLIF(m.stats ->> 'failed', ''))
      )) AS merged
    FROM wa_message_dup d
    JOIN "WaMessage" m ON m.id = d.id
    WHERE NOT d.rekey AND jsonb_typeof(m.stats) = 'object'
    GROUP BY d.keeper
  ) s
  WHERE k.id = s.keeper
    AND s.merged <> '{}'::jsonb
    AND jsonb_typeof(COALESCE(k.stats, '{}'::jsonb)) = 'object';

  -- The campaign link (one per message; waMessageId is unique): moved to the
  -- kept row when it has none, so delivery receipts still reach the participant.
  -- The rest go with their copy (ON DELETE CASCADE).
  UPDATE "WaMessageCampaginParticipantMap" cpm
  SET "waMessageId" = moved.keeper
  FROM (
    SELECT DISTINCT ON (d.keeper) d.keeper, d.id
    FROM wa_message_dup d
    JOIN "WaMessageCampaginParticipantMap" x ON x."waMessageId" = d.id
    WHERE NOT d.rekey
      AND NOT EXISTS (
        SELECT 1 FROM "WaMessageCampaginParticipantMap" y WHERE y."waMessageId" = d.keeper
      )
    ORDER BY d.keeper, d.id
  ) moved
  WHERE cpm."waMessageId" = moved.id;

  -- The org/team attribution, likewise: one is moved when the kept row has none.
  -- Moving all of them would count one message as several sends in analytics.
  UPDATE "WaMessageOrgTeamMap" otm
  SET "messageId" = moved.keeper
  FROM (
    SELECT DISTINCT ON (d.keeper) d.keeper, x.id AS map_id
    FROM wa_message_dup d
    JOIN "WaMessageOrgTeamMap" x ON x."messageId" = d.id
    WHERE NOT d.rekey
      AND NOT EXISTS (SELECT 1 FROM "WaMessageOrgTeamMap" y WHERE y."messageId" = d.keeper)
    ORDER BY d.keeper, x."createdAt", x.id
  ) moved
  WHERE otm.id = moved.map_id;

  -- WaCall.logMessageId points at a WaMessage without a foreign key. Call logs
  -- carry no messageId, so this should touch nothing; it is here so a dangling
  -- id cannot result if one ever did.
  UPDATE "WaCall" c
  SET "logMessageId" = d.keeper
  FROM wa_message_dup d
  WHERE c."logMessageId" = d.id AND NOT d.rekey;

  -- addNewWaMessage counted every copy into its conversation.
  UPDATE "Conversation" c
  SET "messageCount" = GREATEST(c."messageCount" - n.copies, 0)
  FROM (
    SELECT m."conversationId", COUNT(*)::INTEGER AS copies
    FROM wa_message_dup d
    JOIN "WaMessage" m ON m.id = d.id
    WHERE NOT d.rekey AND m."conversationId" IS NOT NULL
    GROUP BY m."conversationId"
  ) n
  WHERE c.id = n."conversationId";

  DELETE FROM "WaMessage" m
  USING wa_message_dup d
  WHERE d.id = m.id AND NOT d.rekey;

  RAISE NOTICE 'WaMessage dedupe: % copies deleted, % distinct rows re-keyed',
    (SELECT COUNT(*) FROM wa_message_dup WHERE NOT rekey),
    (SELECT COUNT(*) FROM wa_message_dup WHERE rekey);

  DROP TABLE wa_message_dup;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "WaMessage_messageId_key"
  ON "WaMessage"("messageId") WHERE "messageId" IS NOT NULL;

-- Replaced by the unique index, which serves the same `= ANY(...)` lookups
-- (an equality implies NOT NULL, so the planner can use the partial index).
DROP INDEX IF EXISTS "WaMessage_messageId_idx";

-- Redundant: ("contactId", "waCreatedAt" DESC) and ("contactId", "conversationId")
-- both lead with contactId, and either serves a plain contactId lookup —
-- including the ON DELETE CASCADE from "Contact", whose per-row check is what a
-- foreign key's index is for. That stays covered.
DROP INDEX IF EXISTS "WaMessage_contactId_idx";
