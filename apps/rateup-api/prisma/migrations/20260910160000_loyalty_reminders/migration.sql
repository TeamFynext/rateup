-- Loyalty reminders: the scheduled half of loyalty messaging gains a real configuration.
--
-- The four daily crons that sent birthday, inactivity and points-expiry messages are
-- replaced by one hourly sweep that sends at an hour each programme picks, in that
-- programme's own timezone. This migration adds what the sweep needs to read, plus three
-- occasions the data already supported but nothing ever sent.

-- ---------------------------------------------------------------------------
-- Three new occasions
-- ---------------------------------------------------------------------------
-- TIER_AT_RISK leans on `LoyaltyProgram.tierQualificationWindowMonths`: a member judged on
-- a trailing window is only re-checked when they buy, so without a warning the first they
-- hear of losing VIP is losing it. REWARD_EXPIRING keys off an unused
-- `loyalty_redemptions.expiresAt` — points already spent, value about to lapse.
-- SIGNUP_ANNIVERSARY keys off the account's own createdAt.

ALTER TYPE "LoyaltyEventType" ADD VALUE 'TIER_AT_RISK';
ALTER TYPE "LoyaltyEventType" ADD VALUE 'REWARD_EXPIRING';
ALTER TYPE "LoyaltyEventType" ADD VALUE 'SIGNUP_ANNIVERSARY';

-- ---------------------------------------------------------------------------
-- Scheduling, per occasion
-- ---------------------------------------------------------------------------
-- `triggerDays` already held the inactivity window. `leadDays` is how far ahead of a dated
-- occasion to send — it replaces a 14-day expiry lead that was hardcoded in three places —
-- and `sendHour` is the local hour, which nothing could express before: the old jobs fired
-- at the worker's midnight whatever the venue's timezone.

ALTER TABLE "LoyaltyEventTrigger"
  ADD COLUMN "leadDays" INTEGER,
  ADD COLUMN "sendHour" INTEGER;

-- ---------------------------------------------------------------------------
-- One trigger per occasion
-- ---------------------------------------------------------------------------
-- The code has always assumed this — `findFirst` then update, `updateMany` to toggle — but
-- nothing enforced it, so a race could leave two rows for one occasion and the sweep would
-- pick whichever came back first. Collapse any duplicates to the most recently updated row
-- before adding the constraint.

DELETE FROM "LoyaltyEventTrigger" AS older
  USING "LoyaltyEventTrigger" AS newer
 WHERE older."programId" = newer."programId"
   AND older."eventType" = newer."eventType"
   AND (older."updatedAt", older."id") < (newer."updatedAt", newer."id");

CREATE UNIQUE INDEX "LoyaltyEventTrigger_programId_eventType_key"
  ON "LoyaltyEventTrigger"("programId", "eventType");

-- ---------------------------------------------------------------------------
-- Claim markers
-- ---------------------------------------------------------------------------
-- The idiom the birthday and inactivity sweeps already use: claim the row with a
-- conditional UPDATE, and only send if the claim took. Points-expiry alerts had no marker
-- at all, so a second run of the job re-sent them.

ALTER TABLE "CustomerLoyaltyAccount"
  ADD COLUMN "lastPointsExpiryAlertAt"  TIMESTAMP(3),
  ADD COLUMN "lastTierAtRiskAlertAt"    TIMESTAMP(3),
  ADD COLUMN "lastAnniversaryGreetedAt" TIMESTAMP(3);

-- Reward expiry is per redemption code, not per member, so its marker lives on the row.
-- Note the table is mapped: `loyalty_redemptions`, not "LoyaltyRedemption".
ALTER TABLE "loyalty_redemptions" ADD COLUMN "expiryNotifiedAt" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- Indexes the sweep needs
-- ---------------------------------------------------------------------------
-- The inactivity audience filters on lastActivityAt and the anniversary sweep orders by
-- createdAt; neither was indexed, and both now run hourly rather than once a day.
CREATE INDEX "CustomerLoyaltyAccount_programId_lastActivityAt_idx"
  ON "CustomerLoyaltyAccount"("programId", "lastActivityAt");

-- Finding redemptions about to lapse. A partial index on (usedAt IS NULL) would be tighter,
-- but Prisma's schema cannot express one, and a schema that cannot describe the database is
-- worse than an index that reads a few more rows.
CREATE INDEX "loyalty_redemptions_expiresAt_idx"
  ON "loyalty_redemptions"("expiresAt");
