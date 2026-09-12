-- Settle every channel identifier on one spelling: digits.
--
-- NOT a migration. See ./README.md — run this by hand, after
-- `2026-09-12-fix-echo-source-identifier.sql`.
--
-- `WaMessage.sourceIdentifier` holds at least four spellings of the same number,
-- because several paths wrote it from different sources: the campaign worker
-- stored `WhatsappSettings.phone` verbatim (`+9655-033-4145`, or `+965 5033 4145`
-- where the display string carries spaces), the inbox send path stripped only the
-- `+`, and the webhook stores Meta's `display_phone_number`. Every `=` between two
-- of those is a coin flip.
--
-- Messages written from 2026-09-12 are already digits (`normalizeSourceIdentifier`,
-- applied in `handleWaMessages`). This converges the rows written before that, so
-- the code can stop carrying a list of spellings to compare against.
--
-- Batched on purpose: the single-statement form ran for over five minutes on a
-- 4.3M-row table and holds a lock on "WaMessage" the whole time, which blocks the
-- inbox. Each batch is its own transaction, so this can be interrupted and
-- re-run — it only ever touches rows that still hold a non-digit spelling, so
-- re-running it is a no-op once it has finished.
--
-- Watch it with:
--   SELECT count(*) FROM "WaMessage"
--   WHERE "sourcePlatform" = 'WHATSAPP' AND "sourceIdentifier" ~ '[^0-9]';

DO $$
DECLARE
  batch_size CONSTANT integer := 20000;
  touched integer;
  total bigint := 0;
BEGIN
  LOOP
    WITH batch AS (
      SELECT id
      FROM "WaMessage"
      WHERE "sourcePlatform" = 'WHATSAPP'
        AND "sourceIdentifier" ~ '[^0-9]'
        -- Only rows that are a phone number written with formatting. An
        -- identifier that is not a number at all (a phone id, say) would be
        -- invented rather than tidied by stripping it to its digits.
        AND "sourceIdentifier" ~ '^[+[:space:]().-]*[0-9][0-9[:space:]().-]*$'
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "WaMessage" m
    SET "sourceIdentifier" = regexp_replace(m."sourceIdentifier", '\D', '', 'g')
    FROM batch
    WHERE m.id = batch.id;

    GET DIAGNOSTICS touched = ROW_COUNT;
    total := total + touched;
    RAISE NOTICE 'normalised % rows (% total)', touched, total;
    EXIT WHEN touched = 0;
    COMMIT;
  END LOOP;
END $$;

-- The denormalised copy on the contact, same treatment.
UPDATE "Contact"
SET "lastMessageSourceIdentifier" = regexp_replace("lastMessageSourceIdentifier", '\D', '', 'g')
WHERE "lastMessageSourceIdentifier" ~ '[^0-9]'
  AND "lastMessageSourceIdentifier" ~ '^[+[:space:]().-]*[0-9][0-9[:space:]().-]*$';
