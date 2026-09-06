-- Campaign send sessions, per-message error codes, and retry policies.
--
-- Hand-authored: the partial unique index guaranteeing one live send per
-- campaign cannot be expressed in the Prisma schema, and the backfill below has
-- to run in the same transaction as the table creation so that no campaign is
-- ever observable with messages that belong to no send.

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
