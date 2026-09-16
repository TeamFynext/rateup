-- Loyalty onboarding wizard, programme profile, and post-visit feedback.
--
-- Squashed from the thirteen migrations this branch grew while the loyalty work was
-- in flight. Two things were folded away rather than replayed: LoyaltyFeedbackSetting
-- is created without the `draftKey` column it briefly carried (the setting selects an
-- existing flow now instead of building one from a draft), and the wizard's first step
-- is called "profile" from the outset, so the rename from "basics" needs no backfill.

-- ---------------------------------------------------------------------------
-- Guided onboarding progress
-- ---------------------------------------------------------------------------
-- The wizard commits each step to the real tables as the user goes, leaving the
-- program at status 'draft' — and therefore silent, since both the outbound
-- dispatcher and the inbound command handler gate on status = 'active' — until the
-- final activate step. So "where did they get to" cannot be derived from the program
-- row alone, and deriving it from child row counts would bounce a user back into the
-- wizard the moment they deleted their last reward.
--
-- `onboardingPresetKey` records which business-type preset pack was chosen in step 1,
-- so later steps stay consistent with it across sessions.
--
-- Every column here is nullable with no default: existing programs read as "never
-- used the wizard", which is exactly right.

-- ---------------------------------------------------------------------------
-- Programme profile, branding and economics
-- ---------------------------------------------------------------------------
-- `averageOrderValue` is the denominator the giveback estimate needs. Points are
-- earned per currency unit spent (`LoyaltyEarningRule.pointsPerUnit`) but their
-- *value* is only implied by the rewards catalog — a reward's monetary worth divided
-- by its `pointsCost`. Turning that into "what percentage of revenue am I giving
-- back" needs a per-order spend figure and there is none to derive one from.
-- Nullable with no default, deliberately: NULL means "the merchant never told us",
-- which the UI renders as a prompt rather than a number. A 0 default would read as a
-- real answer and make every percentage-discount reward price at zero.
-- Decimal(12,2) matches the other money columns on these tables.
--
-- `businessName` is separate from `name`: the onboarding profile step asks for both,
-- and "name" stays the programme's own name.
--
-- `sendTextInSession` decides whether a loyalty notification may go out as plain text
-- when the customer has an open 24-hour service window. Loyalty notifications are
-- Meta templates: each needs approval before it can be sent, and a template sent
-- outside an open window is billed. Inside the window a free-form text message is
-- both free and immediate. Default true: the saving and the "works before approval"
-- behaviour are what a merchant expects, and a template with buttons is never
-- downgraded regardless.
--
-- `materials` holds the print materials (QR card and brochure copy/settings) edited
-- on the loyalty Materials page.

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "onboardingPresetKey"           TEXT,
  ADD COLUMN "onboardingStep"                TEXT,
  ADD COLUMN "onboardingCompletedAt"         TIMESTAMP(3),
  ADD COLUMN "averageOrderValue"             DECIMAL(12,2),
  ADD COLUMN "businessName"                  TEXT,
  ADD COLUMN "sendTextInSession"             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "tierQualificationWindowMonths" INTEGER,
  ADD COLUMN "timezone"                      TEXT,
  ADD COLUMN "logoUrl"                       TEXT,
  ADD COLUMN "brandColor"                    TEXT,
  ADD COLUMN "heroImageUrl"                  TEXT,
  ADD COLUMN "contactName"                   TEXT,
  ADD COLUMN "contactPhone"                  TEXT,
  ADD COLUMN "contactEmail"                  TEXT,
  ADD COLUMN "materials"                     JSONB;

-- ---------------------------------------------------------------------------
-- Earning rate precision
-- ---------------------------------------------------------------------------
-- Merchants define the rate as "spend X, earn Y" and the editors store Y / X in
-- `pointsPerUnit`. At two decimal places that division lies: "₹150 = 1 point" is
-- 0.006667 and would be stored as 0.01 — half again as generous — and "₹250 = 1
-- point" would be stored as 0.00, earning nothing at all. Six places is exact for any
-- pair a merchant would type, and the engine still floors the final points.
--
-- Widening a NUMERIC keeps every existing value as it is.

ALTER TABLE "LoyaltyEarningRule"
  ALTER COLUMN "pointsPerUnit" TYPE DECIMAL(12, 6);

-- ---------------------------------------------------------------------------
-- Typed purchase amount on ledger rows
-- ---------------------------------------------------------------------------
-- So trailing-window spend can be summed with an index rather than read out of the
-- untyped `metadata` blob. Existing rows keep their history: the backfill lifts the
-- value that was already being written to metadata.purchaseAmount.

ALTER TABLE "LoyaltyTransaction" ADD COLUMN "purchaseAmount" DECIMAL(12,2);

UPDATE "LoyaltyTransaction"
  SET "purchaseAmount" = (metadata->>'purchaseAmount')::numeric
  WHERE source = 'purchase' AND jsonb_typeof(metadata->'purchaseAmount') = 'number';

CREATE INDEX "LoyaltyTransaction_programId_createdAt_idx"
  ON "LoyaltyTransaction"("programId", "createdAt" DESC);

-- ---------------------------------------------------------------------------
-- Held signup bonuses
-- ---------------------------------------------------------------------------
-- Web self-signups hold their bonus points until the customer is seen on WhatsApp or
-- at the till.
--
-- The column is added nullable, backfilled, and only then given its default. Every
-- account that exists today was credited on creation, so it is verified as of its own
-- `createdAt` — adding the column with DEFAULT CURRENT_TIMESTAMP in one statement
-- would stamp all of them with the migration's own clock instead.

ALTER TABLE "CustomerLoyaltyAccount"
  ADD COLUMN "verifiedAt"     TIMESTAMP(3),
  ADD COLUMN "pendingBonuses" JSONB;

UPDATE "CustomerLoyaltyAccount" SET "verifiedAt" = "createdAt";

ALTER TABLE "CustomerLoyaltyAccount" ALTER COLUMN "verifiedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- Contact gender
-- ---------------------------------------------------------------------------
-- Captured optionally when staff enrol a customer at the counter. Reuses the existing
-- "Gender" enum (MALE / FEMALE / OTHER) that User already carries.

ALTER TABLE "Contact" ADD COLUMN "gender" "Gender";

-- ---------------------------------------------------------------------------
-- Flow categories
-- ---------------------------------------------------------------------------
-- WaFlow.categories stores what was picked at creation. Meta's own categories were
-- never persisted before; the RateUp-only LOYALTY_FEEDBACK category (mapped to SURVEY
-- for Meta) is how Loyalty → Feedback finds the flows it may select.

ALTER TABLE "WaFlow" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ---------------------------------------------------------------------------
-- Loyalty feedback
-- ---------------------------------------------------------------------------
-- A post-visit WhatsApp Flow per programme, one request row per ask.
--
-- LoyaltyFeedbackSetting is 1:1 with the programme and points at the ordinary
-- WaFlow/Survey pair that holds the questions (answers keep landing in
-- SurveyResponse), the UTILITY template with a FLOW button used outside the 24-hour
-- service window, the team whose Google review link happy customers are sent to, and
-- the optional reward granted once per customer when they tap that link.
--
-- LoyaltyFeedbackRequest.transactionId is unique so a single purchase can never
-- schedule two asks, whatever races between the cashier, the external API and Shopify.

-- CreateEnum
CREATE TYPE "LoyaltyFeedbackRequestStatus" AS ENUM ('SCHEDULED', 'SENT', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "LoyaltyFeedbackSetting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "dbFlowId" UUID,
    "waTemplateId" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sendDelayMinutes" INTEGER NOT NULL DEFAULT 120,
    "cooldownDays" INTEGER NOT NULL DEFAULT 30,
    "rewardId" UUID,
    "happyMinRating" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyFeedbackSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyFeedbackRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "transactionId" UUID,
    "status" "LoyaltyFeedbackRequestStatus" NOT NULL DEFAULT 'SCHEDULED',
    "happy" BOOLEAN,
    "overallRating" INTEGER,
    "channel" TEXT,
    "failReason" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewClickedAt" TIMESTAMP(3),
    "rewardGrantedAt" TIMESTAMP(3),
    "customerRewardId" UUID,
    "surveyResponseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyFeedbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyFeedbackSetting_programId_key" ON "LoyaltyFeedbackSetting"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyFeedbackRequest_transactionId_key" ON "LoyaltyFeedbackRequest"("transactionId");

-- CreateIndex
CREATE INDEX "LoyaltyFeedbackRequest_programId_status_idx" ON "LoyaltyFeedbackRequest"("programId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyFeedbackRequest_programId_createdAt_idx" ON "LoyaltyFeedbackRequest"("programId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyFeedbackRequest_accountId_createdAt_idx" ON "LoyaltyFeedbackRequest"("accountId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_dbFlowId_fkey" FOREIGN KEY ("dbFlowId") REFERENCES "WaFlow"("dbFlowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackSetting" ADD CONSTRAINT "LoyaltyFeedbackSetting_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerLoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LoyaltyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_customerRewardId_fkey" FOREIGN KEY ("customerRewardId") REFERENCES "CustomerReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyFeedbackRequest" ADD CONSTRAINT "LoyaltyFeedbackRequest_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
