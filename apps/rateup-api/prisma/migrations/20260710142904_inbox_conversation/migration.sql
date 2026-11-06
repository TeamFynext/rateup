/*
  Warnings:

  - The `waMessageAssignStatus` column on the `Contact` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Conversation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "CloseReason" AS ENUM ('MANUAL', 'AUTOMATION_IDLE', 'RULE', 'SPAM');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "dailySendLimit" INTEGER;

-- AlterTable
UPDATE "Conversation"
SET "status" = 'UNASSIGNED'
WHERE "status" IS NULL
   OR "status" NOT IN ('UNASSIGNED', 'ASSIGNED', 'CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

UPDATE "Contact"
SET "waMessageAssignStatus" = 'UNASSIGNED'
WHERE "waMessageAssignStatus" IS NULL
   OR "waMessageAssignStatus" NOT IN ('UNASSIGNED', 'ASSIGNED', 'CLOSED', 'SPAM', 'RESOLVED', 'UNRESOLVED');

-- ---------------------------------------------------------------------------
-- 3. Cast the columns in place rather than DROP/ADD, which would discard every
--    existing status. The default must be dropped and re-added around the type
--    change, since 'UNASSIGNED'::text is not assignable to the new type.
--    Indexes on these columns are rebuilt automatically by ALTER TYPE.
-- ---------------------------------------------------------------------------

ALTER TABLE "Conversation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "status" TYPE "InboxStatus" USING "status"::"InboxStatus";
ALTER TABLE "Conversation" ALTER COLUMN "status" SET DEFAULT 'UNASSIGNED';
ALTER TABLE "Conversation" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" DROP DEFAULT;
ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" TYPE "InboxStatus" USING "waMessageAssignStatus"::"InboxStatus";
ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" SET DEFAULT 'UNASSIGNED';
ALTER TABLE "Contact" ALTER COLUMN "waMessageAssignStatus" SET NOT NULL;


-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "closeReason" "CloseReason",
ADD COLUMN     "closedByAutomation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAgentMessageAt" TIMESTAMP(3),
ADD COLUMN     "lastCustomerMessageAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orgId" UUID,
ADD COLUMN     "reopenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- Backfills for the newly added columns.
-- ---------------------------------------------------------------------------

-- Existing rows: updatedAt has no meaningful history, seed it from createdAt.
UPDATE "Conversation" SET "updatedAt" = "createdAt";

-- orgId is denormalized from the owning Contact.
UPDATE "Conversation" c
SET "orgId" = ct."orgId"
FROM "Contact" ct
WHERE ct."id" = c."contactId";

-- resolvedAt for conversations already in the RESOLVED state. closeReason stays
-- NULL for historical rows: the reason was never recorded and inventing one
-- would poison the analytics this column exists to serve.
UPDATE "Conversation"
SET "resolvedAt" = "closedAt"
WHERE "status" = 'RESOLVED' AND "closedAt" IS NOT NULL;

-- Message metrics from WaMessage. INTERNAL messages (system notes, private
-- notes) carry a non-null "sendBy" but are not agent replies, so they are
-- excluded from every metric here -- counting them would inflate messageCount
-- and corrupt lastAgentMessageAt. Direction is inferred from "sendBy":
-- NULL => inbound (customer).
UPDATE "Conversation" c
SET "messageCount"          = m."messageCount",
    "lastMessageAt"         = m."lastMessageAt",
    "lastCustomerMessageAt" = m."lastCustomerMessageAt",
    "lastAgentMessageAt"    = m."lastAgentMessageAt"
FROM (
  SELECT
    "conversationId",
    COUNT(*)::INTEGER                                                             AS "messageCount",
    MAX(COALESCE("waCreatedAt", "createdAt"))                                     AS "lastMessageAt",
    MAX(COALESCE("waCreatedAt", "createdAt")) FILTER (WHERE "sendBy" IS NULL)     AS "lastCustomerMessageAt",
    MAX(COALESCE("waCreatedAt", "createdAt")) FILTER (WHERE "sendBy" IS NOT NULL) AS "lastAgentMessageAt"
  FROM "WaMessage"
  WHERE "conversationId" IS NOT NULL
    AND ("sourcePlatform" IS NULL OR "sourcePlatform" <> 'INTERNAL')
  GROUP BY "conversationId"
) m
WHERE m."conversationId" = c."id";

-- Both Contact indexes on "waMessageAssignStatus" already exist (20250423111838
-- and 20251026204734) and are rebuilt in place by the ALTER TYPE above.

-- CreateIndex
CREATE INDEX "Conversation_orgId_status_idx" ON "Conversation"("orgId", "status");

-- CreateIndex
CREATE INDEX "Conversation_orgId_createdAt_idx" ON "Conversation"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_orgId_lastMessageAt_idx" ON "Conversation"("orgId", "lastMessageAt" DESC);
