-- Repair the channel recorded on messages echoed back from the WhatsApp Business app.
--
-- `handleSMBMessageEchoes` stored `message.to` — the customer — as the channel the
-- message ran on, where every other path stores the business number. The inbox
-- reads the channel off the conversation's latest message, so any ticket last
-- touched by an echo named the customer's own number as the channel it arrived
-- on, and the reply box had no channel to resolve back to.
--
-- The echo payload carries the business number in `messageBody -> 'send' -> 'from'`,
-- so the correct value is already on every affected row. That key is what
-- identifies these rows: our own sends store the outgoing payload, which has a
-- `to` but never a `from`.
--
-- Digits, no separators — the spelling `channelDigits` settles every identifier
-- on. Scoped to the rows the echo handler wrote, so it is bounded and cheap; the
-- separate normalisation of the column's four historical spellings is a much
-- larger rewrite and is deliberately not bundled here.
UPDATE "WaMessage"
SET "sourceIdentifier" = regexp_replace("messageBody" -> 'send' ->> 'from', '\D', '', 'g')
WHERE "sourcePlatform" = 'WHATSAPP'
  AND "messageBody" -> 'send' ->> 'from' IS NOT NULL
  AND (
    "sourceIdentifier" IS NULL
    OR regexp_replace("sourceIdentifier", '\D', '', 'g')
       IS DISTINCT FROM regexp_replace("messageBody" -> 'send' ->> 'from', '\D', '', 'g')
  );

-- `Contact.lastMessageSourceIdentifier` is a denormalised copy of the same value,
-- written alongside it and read as the inbox's fallback when a ticket has no
-- message rows of its own. It was corrupted by the same bug, so it is re-derived
-- from the contact's newest message now that those are correct.
--
-- Only contacts that already carry a channel and whose newest message disagrees
-- with it are touched, so this is bounded by the damage. A contact with no value
-- is left alone: filling those in would be a behaviour change — the inbox shows
-- no channel for them today — not a repair.
UPDATE "Contact" c
SET "lastMessageSourceIdentifier" = latest."sourceIdentifier"
FROM (
  SELECT DISTINCT ON (w."contactId")
    w."contactId",
    w."sourceIdentifier"
  FROM "WaMessage" w
  WHERE w."sourcePlatform" = 'WHATSAPP'
  ORDER BY w."contactId", w."waCreatedAt" DESC
) AS latest
WHERE latest."contactId" = c.id
  AND latest."sourceIdentifier" IS NOT NULL
  AND c."lastMessageSourceIdentifier" IS NOT NULL
  AND regexp_replace(c."lastMessageSourceIdentifier", '\D', '', 'g')
      IS DISTINCT FROM regexp_replace(latest."sourceIdentifier", '\D', '', 'g');
