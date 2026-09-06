-- A campaign waiting on a retry is not sending.
--
-- `finishCampaignIfSettled` closed a campaign only when nothing was left open at
-- all, so one whose initial send had drained with an automatic retry booked kept
-- the ACTIVE it was given at launch — and read as "Sending" through a retry
-- window that is usually hours long. RETRYING now names that wait; this moves
-- the campaigns already sitting in it.
--
-- Only where every live send is still SCHEDULED: a QUEUING or RUNNING one means
-- messages really are going out.
UPDATE "Campaign" c
SET "status" = 'RETRYING'
WHERE c."status" = 'ACTIVE'
  AND c."type" <> 'DRIP'
  AND EXISTS (
    SELECT 1 FROM "CampaignSend" s
    WHERE s."campaignId" = c."id" AND s."status" = 'SCHEDULED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "CampaignSend" s
    WHERE s."campaignId" = c."id" AND s."status" IN ('QUEUING', 'RUNNING')
  );
