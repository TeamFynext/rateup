-- Security audit 2026-10-20 fixes, combined into one migration.
-- Three independent parts: invitation tokens (AUTH-2), survey org backfill (SURV-6),
-- billing hardening (WEBH-1, WEBH-2, WEBH-6).

-- ── Part 1: invitation tokens (AUTH-2) ──────────────────────────────────────
-- Invitation links carry a random token (stored only as its SHA-256) instead of the
-- invitation id, and expire. Rows issued before this have no token: their old links stop
-- working and the invitation has to be resent from the members page.
ALTER TABLE "Invitation" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- ── Part 2: survey org backfill (SURV-6) ────────────────────────────────────
-- Security audit 2026-10-20 (SURV-6): surveys created before "Survey"."orgId" existed
-- still carry NULL, and access checks used to treat a NULL-org survey as belonging to
-- every org. Give each such survey the org of the teams it is shared with.
--
-- Only surveys whose team maps all point at one org are filled in. A survey mapped to
-- teams of more than one org is ambiguous (SURV-7 allowed planting a survey in another
-- org's team) and is left NULL for a person to resolve; access checks now resolve a
-- NULL-org survey through its teams, so it stays reachable by those teams' org.
--
-- The column stays nullable on purpose: a NOT NULL constraint needs every row resolved
-- first, including the ambiguous ones and any survey with no team map at all.
UPDATE "Survey" AS s
SET "orgId" = resolved."orgId"
FROM (
  SELECT st."surveyId", MIN(t."orgId"::text)::uuid AS "orgId"
  FROM "SurveyTeamMap" st
  JOIN "Team" t ON t.id = st."teamId"
  GROUP BY st."surveyId"
  HAVING COUNT(DISTINCT t."orgId") = 1
) AS resolved
WHERE s.id = resolved."surveyId"
  AND s."orgId" IS NULL;

-- ── Part 3: billing hardening (WEBH-1, WEBH-2, WEBH-6) ──────────────────────
-- Billing hardening (security audit 2026-10-20: WEBH-1, WEBH-2, WEBH-6).

-- The amount and pack count an order was created for, fixed server-side, so payment
-- webhooks stop trusting the client-settable payment notes.
ALTER TABLE "Order" ADD COLUMN "amountMinor" INTEGER;
ALTER TABLE "Order" ADD COLUMN "currency" TEXT;
ALTER TABLE "Order" ADD COLUMN "addonQuantity" INTEGER;

-- Razorpay deliveries already applied, for replay protection.
CREATE TABLE "RazorpayWebhookEvent" (
    "eventId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RazorpayWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "RazorpayWebhookEvent_receivedAt_idx" ON "RazorpayWebhookEvent"("receivedAt");
