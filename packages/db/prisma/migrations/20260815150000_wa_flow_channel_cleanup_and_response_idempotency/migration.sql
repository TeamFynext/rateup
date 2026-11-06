-- Pins each flow to the WhatsApp channel it belongs to, makes a survey
-- submission idempotent, and drops two tables the code no longer reads.

-- ─── WaFlow: record the channel a flow was created under ─────────────────────
-- A flow id only resolves against the WABA it was created under, so sending it
-- from a number on another WABA gets rejected by Meta.
ALTER TABLE "WaFlow" ADD COLUMN     "whatsappSettingsId" UUID;

CREATE INDEX "WaFlow_whatsappSettingsId_idx" ON "WaFlow"("whatsappSettingsId");

ALTER TABLE "WaFlow" ADD CONSTRAINT "WaFlow_whatsappSettingsId_fkey" FOREIGN KEY ("whatsappSettingsId") REFERENCES "WhatsappSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing flow was created through getWaSettings(orgId), which resolves to
-- the org's default WhatsApp channel. That default is now ordered (createdAt, id) instead of
-- being whatever the database returned first, and this picks the same row, so the recorded
-- channel matches the WABA those flows actually live on.
UPDATE "WaFlow" f
SET "whatsappSettingsId" = (
    SELECT s."id"
    FROM "WhatsappSettings" s
    WHERE s."orgId" = f."orgId"
    ORDER BY s."createdAt" ASC, s."id" ASC
    LIMIT 1
)
WHERE f."whatsappSettingsId" IS NULL;

-- ─── SurveyResponse: make a submission idempotent ────────────────────────────
-- WhatsApp Flow endpoints answer Meta over an encrypted channel; when that
-- response fails after the answers are already saved, Meta retries the
-- `data_exchange` request and the retry files a second response. The flow token
-- identifies the run, so it is stored here and the unique index turns the retry
-- into a no-op.
--
-- Nullable, and null for every path without a natural key (web responses, and
-- flow runs still carrying a pre-token phone as their flow_token). Postgres
-- treats nulls as distinct, so those rows do not collide with each other.
ALTER TABLE "SurveyResponse" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "SurveyResponse_idempotencyKey_key" ON "SurveyResponse"("idempotencyKey");

-- ─── Drop WaLogs ─────────────────────────────────────────────────────────────
-- Graph API failures are recorded on the message itself (`WaMessage.logs` and
-- `WaMessage.errorMessage`), which is where every remaining reader looks. WaLogs
-- was a parallel, org-and-phone-addressed copy of the same information with no
-- link back to the message it came from.
--
-- This deletes the stored history. Take a dump of the table first if any of it
-- is worth keeping.
DROP TABLE IF EXISTS "WaLogs";

-- ─── Drop WaAutomatedReplyCommands ───────────────────────────────────────────
-- The pre-rules-engine keyword reservation: one row per (command, org,
-- businessHour), used to resolve an inbound message to an automation. The Rule
-- engine replaced it with `RuleMessageBodyLock`, which reserves the same
-- (messageBody, org, platform, businessHour) tuple against a rule condition —
-- see `reserveMessageBodyCommands` in wa_rule.service.ts.
--
-- Nothing in the codebase had written to this table since that migration; the
-- two remaining readers only ever saw whatever rows predated it, and both are
-- removed alongside this. The data has been migrated to RuleMessageBodyLock.
DROP TABLE IF EXISTS "WaAutomatedReplyCommands";
