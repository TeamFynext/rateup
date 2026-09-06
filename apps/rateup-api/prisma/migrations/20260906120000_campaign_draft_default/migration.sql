-- A campaign starts as a draft, not as a paused campaign.
--
-- Hand-authored for the backfill. The column default was "INACTIVE", which is
-- also the status a running campaign is moved to when someone pauses it, so a
-- campaign that had never been launched was indistinguishable from one that had
-- been stopped halfway — and the UI, correctly, called both of them paused.
--
-- `createCampaign` now writes the status the wizard posts (DRAFT), so this only
-- has to correct the rows already in the table.

ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Only campaigns that were never launched. A send session, a start time or a
-- sent-at stamp each prove the campaign has run at least once, which makes its
-- INACTIVE a real pause that must be left alone.
UPDATE "Campaign" c
SET "status" = 'DRAFT'
WHERE c."status" = 'INACTIVE'
  AND c."startedAt" IS NULL
  AND c."campaignSentAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "CampaignSend" s WHERE s."campaignId" = c."id");

-- The mirror of the same problem at the other end of the lifecycle: nothing ever
-- wrote COMPLETED, so a campaign that finished sending stayed ACTIVE and went on
-- reading as though it were still going out. `finishCampaignIfSettled` closes
-- these from now on; this settles the ones already stranded.
--
-- "Nothing in flight" is the whole test: a live send row is what a running or
-- pending campaign always has, and requiring a finished one keeps this off
-- campaigns that never actually dispatched. Drip campaigns are excluded — the
-- drip cron keeps enrolling, so they are never finished by an idle moment.
UPDATE "Campaign" c
SET "status" = 'COMPLETED',
    "endedAt" = COALESCE(
      c."endedAt",
      (SELECT MAX(s."completedAt") FROM "CampaignSend" s WHERE s."campaignId" = c."id")
    )
WHERE c."status" IN ('ACTIVE', 'QUEUING')
  AND c."type" <> 'DRIP'
  AND EXISTS (
    SELECT 1 FROM "CampaignSend" s
    WHERE s."campaignId" = c."id" AND s."status" = 'COMPLETED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "CampaignSend" s
    WHERE s."campaignId" = c."id"
      AND s."status" IN ('SCHEDULED', 'QUEUING', 'RUNNING')
  );
