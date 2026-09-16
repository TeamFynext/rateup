-- External loyalty API v1: idempotency, stable reward codes, and email-based member lookup.

-- 1. Idempotency for point-moving writes.
--    Deliberately a new column rather than a unique index on "referenceId": that column
--    already has three writers (a redemption id, 'APPROVAL-<id>', and the points-expiry
--    sweep, which allocates partially and so can emit several rows sharing one value).
--    Postgres treats NULLs as distinct, so this constrains nothing already in the table.
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "LoyaltyTransaction_programId_idempotencyKey_key"
  ON "LoyaltyTransaction" ("programId", "idempotencyKey");

-- 2. A stable, non-UUID name for a catalogue reward, so an external POS can be configured
--    against something durable. Backfilled from the reward name.
ALTER TABLE "LoyaltyReward" ADD COLUMN "code" TEXT;

WITH slugged AS (
  SELECT
    "id",
    "programId",
    NULLIF(
      TRIM(BOTH '-' FROM LEFT(REGEXP_REPLACE(LOWER(TRIM("name")), '[^a-z0-9]+', '-', 'g'), 40)),
      ''
    ) AS slug
  FROM "LoyaltyReward"
),
numbered AS (
  SELECT
    "id",
    COALESCE(slug, 'reward') AS base,
    ROW_NUMBER() OVER (
      PARTITION BY "programId", COALESCE(slug, 'reward')
      ORDER BY "id"
    ) AS n
  FROM slugged
)
UPDATE "LoyaltyReward" r
SET "code" = CASE WHEN numbered.n = 1 THEN numbered.base
                  ELSE numbered.base || '-' || numbered.n END
FROM numbered
WHERE numbered."id" = r."id";

CREATE UNIQUE INDEX "LoyaltyReward_programId_code_key"
  ON "LoyaltyReward" ("programId", "code");

-- 3. The Shopify bridge falls back to email when an order carries no phone number.
--    There was no index on Contact.email, and this lookup is on the webhook hot path.
CREATE INDEX "Contact_orgId_email_idx" ON "Contact" ("orgId", "email");

-- 4. Request-replay cache for partner-API writes that book no ledger row.
CREATE TABLE "ExternalIdempotencyRecord" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "orgId"          UUID         NOT NULL,
  "scope"          TEXT         NOT NULL,
  "key"            TEXT         NOT NULL,
  "requestHash"    TEXT         NOT NULL,
  "state"          TEXT         NOT NULL DEFAULT 'IN_FLIGHT',
  "responseStatus" INTEGER,
  "responseBody"   JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"    TIMESTAMP(3),
  "expiresAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExternalIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalIdempotencyRecord_orgId_scope_key_key"
  ON "ExternalIdempotencyRecord" ("orgId", "scope", "key");

CREATE INDEX "ExternalIdempotencyRecord_expiresAt_idx"
  ON "ExternalIdempotencyRecord" ("expiresAt");

ALTER TABLE "ExternalIdempotencyRecord"
  ADD CONSTRAINT "ExternalIdempotencyRecord_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
