-- LoyaltyApiSettings.rewardId (unique). Unrelated to the conversation change
-- below; folded in here so the two pending migrations ship as one.
-- AlterTable
ALTER TABLE "LoyaltyApiSettings" ADD COLUMN "rewardId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyApiSettings_rewardId_key" ON "LoyaltyApiSettings"("rewardId");

-- Conversation.number becomes per-org sequential: every org's first ticket is #1.
-- Previously it was a global SERIAL, so org B's first ticket could be #48213.

-- CreateTable
CREATE TABLE "ConversationNumberCounter" (
    "orgId" UUID NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConversationNumberCounter_pkey" PRIMARY KEY ("orgId")
);

-- AlterTable: drop the global sequence + its uniqueness.
DROP INDEX IF EXISTS "Conversation_number_key";
ALTER TABLE "Conversation" ALTER COLUMN "number" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "Conversation_number_seq";
ALTER TABLE "Conversation" ALTER COLUMN "number" SET DEFAULT 0;

-- Backfill: renumber every existing conversation from 1 within its org, keeping
-- the original relative order. Conversations with a null orgId are bucketed
-- together under the nil uuid, matching what the trigger does for new rows.
WITH renumbered AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE("orgId", '00000000-0000-0000-0000-000000000000'::uuid)
            ORDER BY "createdAt" ASC, "number" ASC, "id" ASC
        ) AS "seq"
    FROM "Conversation"
)
UPDATE "Conversation" AS c
SET "number" = r."seq"
FROM renumbered AS r
WHERE c."id" = r."id";

-- Seed the allocator from the backfilled rows so the next insert continues the run.
INSERT INTO "ConversationNumberCounter" ("orgId", "lastNumber")
SELECT COALESCE("orgId", '00000000-0000-0000-0000-000000000000'::uuid), MAX("number")
FROM "Conversation"
GROUP BY COALESCE("orgId", '00000000-0000-0000-0000-000000000000'::uuid);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_orgId_number_key" ON "Conversation"("orgId", "number");

-- Allocator. Runs BEFORE INSERT so application code never has to know the number.
-- The upsert takes a row lock on the counter, which is what makes concurrent
-- inserts for the same org hand out distinct numbers.
CREATE OR REPLACE FUNCTION conversation_assign_number() RETURNS TRIGGER AS $$
BEGIN
    -- 0/NULL is the "unset" sentinel; an explicit number (e.g. a data repair) is kept.
    IF NEW."number" IS NOT NULL AND NEW."number" <> 0 THEN
        RETURN NEW;
    END IF;

    INSERT INTO "ConversationNumberCounter" ("orgId", "lastNumber")
    VALUES (COALESCE(NEW."orgId", '00000000-0000-0000-0000-000000000000'::uuid), 1)
    ON CONFLICT ("orgId")
    DO UPDATE SET "lastNumber" = "ConversationNumberCounter"."lastNumber" + 1
    RETURNING "lastNumber" INTO NEW."number";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversation_assign_number ON "Conversation";
CREATE TRIGGER conversation_assign_number
    BEFORE INSERT ON "Conversation"
    FOR EACH ROW
    EXECUTE FUNCTION conversation_assign_number();
