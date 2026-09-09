-- Campaign send sessions: the tables, the statuses that go with them, and the
-- indexes the reads need.
--
-- One migration rather than the five it was authored as. They were written a
-- change at a time while the feature was being built and none of them stands
-- alone: every backfill below reads `CampaignSend`, which the first section
-- creates, and the statuses they settle (DRAFT, FAILED, RETRYING, COMPLETED)
-- only mean anything once send sessions exist to distinguish them. Squashed
-- before release, so a fresh database gets one coherent step instead of a
-- narrative.
--
-- Hand-authored throughout: the partial unique indexes cannot be expressed in
-- the Prisma schema, and each backfill has to run in the same transaction as the
-- DDL it depends on.

-- ── 1. Campaign send sessions, retry policies, and per-message error codes ------
--
-- The partial unique index guaranteeing one live send per campaign is why this
-- is hand-authored, and the backfill runs beside the table creation so that no
-- campaign is ever observable with messages belonging to no send.

-- CreateEnum
CREATE TYPE "CampaignSendTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'AUTO_RETRY', 'DRIP');

-- CreateEnum
CREATE TYPE "CampaignSendStatus" AS ENUM ('SCHEDULED', 'QUEUING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignRetryStrategy" AS ENUM ('SMART', 'FIXED_INTERVAL');

-- CreateTable
CREATE TABLE "CampaignSend" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" UUID NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 0,
    "trigger" "CampaignSendTrigger" NOT NULL,
    "status" "CampaignSendStatus" NOT NULL DEFAULT 'SCHEDULED',
    "targetStatuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dripStageId" UUID,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalTargeted" INTEGER NOT NULL DEFAULT 0,
    "totalSkipped" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalRead" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "CampaignSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRetryPolicy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "strategy" "CampaignRetryStrategy" NOT NULL DEFAULT 'SMART',
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "intervalHours" INTEGER NOT NULL DEFAULT 24,
    "windowEndsAt" TIMESTAMP(3),
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Etc/UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRetryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSend_campaignId_attemptNo_key" ON "CampaignSend"("campaignId", "attemptNo");

-- CreateIndex
CREATE INDEX "CampaignSend_status_scheduledFor_idx" ON "CampaignSend"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "CampaignSend_campaignId_idx" ON "CampaignSend"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRetryPolicy_campaignId_key" ON "CampaignRetryPolicy"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRetryPolicy" ADD CONSTRAINT "CampaignRetryPolicy_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Not expressible in the Prisma schema. One live broadcast send per campaign,
-- enforced by the database, so a manual send racing a due automatic retry fails
-- loudly on insert instead of double-sending to the same recipients.
--
-- Drip sends are excluded and get their own index below: a drip campaign can
-- legitimately have several stages in flight at once (participants sit at
-- different stages), and the drip cron re-enqueues each stage every four
-- minutes. One index over the campaign alone would have refused the second
-- stage outright.
CREATE UNIQUE INDEX "CampaignSend_one_active_per_campaign"
  ON "CampaignSend" ("campaignId")
  WHERE "dripStageId" IS NULL AND "status" IN ('SCHEDULED', 'QUEUING', 'RUNNING');

-- The drip counterpart: one live send per stage. This is what makes the drip
-- cron's repeated re-enqueue of a still-pending stage reuse the same send id,
-- and therefore the same BullMQ job ids, so deduplication keeps a participant in
-- its original daily batch instead of resetting the delay every four minutes.
CREATE UNIQUE INDEX "CampaignSend_one_active_per_drip_stage"
  ON "CampaignSend" ("campaignId", "dripStageId")
  WHERE "dripStageId" IS NOT NULL AND "status" IN ('SCHEDULED', 'QUEUING', 'RUNNING');

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN "errorCode" INTEGER;

-- CreateIndex
CREATE INDEX "WaMessage_errorCode_idx" ON "WaMessage"("errorCode");

-- AlterTable
ALTER TABLE "WaMessageCampaginParticipantMap" ADD COLUMN "campaignSendId" UUID;

-- CreateIndex
CREATE INDEX "WaMessageCampaginParticipantMap_campaignSendId_idx" ON "WaMessageCampaginParticipantMap"("campaignSendId");

-- AddForeignKey
ALTER TABLE "WaMessageCampaginParticipantMap" ADD CONSTRAINT "WaMessageCampaginParticipantMap_campaignSendId_fkey" FOREIGN KEY ("campaignSendId") REFERENCES "CampaignSend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one synthetic "Initial send" per campaign that has already sent, so
-- historical campaigns render as a single attempt row rather than an empty
-- table. COMPLETED, so it is outside the partial unique index above and never
-- blocks a future send.
INSERT INTO "CampaignSend" (
    "campaignId", "attemptNo", "trigger", "status", "targetStatuses",
    "createdAt", "startedAt", "completedAt",
    "totalTargeted", "totalSent", "totalDelivered", "totalRead", "totalFailed", "totalCompleted",
    "note"
)
SELECT
    c."id",
    0,
    'MANUAL'::"CampaignSendTrigger",
    'COMPLETED'::"CampaignSendStatus",
    ARRAY['PENDING']::TEXT[],
    c."createdAt",
    COALESCE(c."campaignSentAt", c."startedAt", c."createdAt"),
    COALESCE(c."endedAt", c."campaignSentAt", c."startedAt", c."createdAt"),
    (SELECT COUNT(*) FROM "CampaignParticipant" p WHERE p."campaignId" = c."id"),
    COALESCE(s."totalSend", 0),
    COALESCE(s."totalDelivered", 0),
    COALESCE(s."totalRead", 0),
    COALESCE(s."totalFailed", 0),
    COALESCE(s."totalCompleted", 0),
    'Backfilled from campaign totals when per-send tracking was introduced.'
FROM "Campaign" c
LEFT JOIN "CampaignStats" s ON s."campaignId" = c."id"
WHERE c."campaignSentAt" IS NOT NULL OR c."status" <> 'INACTIVE';

-- Attribute every existing campaign message to its campaign's synthetic send.
UPDATE "WaMessageCampaginParticipantMap" m
SET "campaignSendId" = cs."id"
FROM "CampaignParticipant" p
JOIN "CampaignSend" cs ON cs."campaignId" = p."campaignId" AND cs."attemptNo" = 0
WHERE m."campaignParticipantId" = p."id"
  AND m."campaignSendId" IS NULL;

-- Drop the vestigial message queue. Nothing has ever inserted a row into it:
-- `retryCount` defaulted to 0, and the only writer set it to 0 where it was 2 —
-- a retry policy no code implemented. Real retries live in `CampaignSend` and
-- `CampaignRetryPolicy` above.
DROP TABLE IF EXISTS "CampaignMessageQueue";
DROP TYPE IF EXISTS "CampaignMessageQueueStatus";

-- The zone a campaign's schedule is expressed in. Defaulted rather than made
-- required so existing rows keep the behaviour they were created with (times
-- were previously interpreted as the server's zone, which is UTC in every
-- deployment).
ALTER TABLE "Campaign" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Etc/UTC';


-- ── 2. A campaign starts as a draft ---------------------------------------------

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


-- ── 3. Separate "it failed" from "I paused it" ----------------------------------

-- Separate "it failed" from "I paused it".
--
-- Every failure path wrote INACTIVE — the same value the pause button writes —
-- so a campaign that fell over on its way out was indistinguishable in the list
-- from one its owner had deliberately stopped, and the reason it recorded was
-- never shown. FAILED is now written instead; this reclassifies the rows that
-- were already stranded.
--
-- An errorMessage is the evidence: nothing sets one when a campaign is paused on
-- purpose, and every failure path sets one.
UPDATE "Campaign"
SET "status" = 'FAILED'
WHERE "status" = 'INACTIVE'
  AND "errorMessage" IS NOT NULL
  AND "errorMessage" <> '';


-- ── 4. A campaign waiting on a retry is not sending -----------------------------

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


-- ── 5. Indexes for the two queries that walk a campaign's participants ----------

-- Indexes for the two queries that walk a campaign's participants.
--
-- `WaMessageCampaginParticipantMap` had indexes on `waMessageId` and
-- `campaignSendId` but none on `campaignParticipantId`, which is what the
-- "latest message for this participant" LATERAL joins filter on — the analytics
-- failure breakdown and the retry cohort both run one per failed participant.
-- Each of those was a sequential scan of the whole map table, so the work grew
-- as (failed participants x every message ever sent) and the analytics endpoint
-- timed out.
--
-- NOTE: plain (non-CONCURRENT) CREATE INDEX, because Prisma runs each migration
-- inside a transaction and CONCURRENTLY is not allowed there. This takes a write
-- lock on each table for the duration of the build. On a large production table,
-- build these manually with CREATE INDEX CONCURRENTLY *before* deploying; the
-- IF NOT EXISTS then makes this migration a no-op.

CREATE INDEX IF NOT EXISTS "WaMessageCampaginParticipantMap_campaignParticipantId_idx"
    ON "WaMessageCampaginParticipantMap"("campaignParticipantId");

-- Counting a campaign's participants by status: the analytics funnel, the settle
-- sweep's in-flight count, and the participants tab's status filters. The
-- existing (campaignId, contactId) unique index serves a campaignId-only lookup
-- but cannot filter on status.
CREATE INDEX IF NOT EXISTS "CampaignParticipant_campaignId_status_idx"
    ON "CampaignParticipant"("campaignId", "status");
