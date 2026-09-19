-- CreateEnum
CREATE TYPE "LoyaltyChannel" AS ENUM ('WHATSAPP', 'RCS', 'SMS', 'EMAIL');

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN "enabledChannels" "LoyaltyChannel"[] DEFAULT ARRAY['WHATSAPP']::"LoyaltyChannel"[];

-- AlterTable
ALTER TABLE "CustomerLoyaltyAccount" ADD COLUMN "preferredChannel" "LoyaltyChannel";

-- AlterTable
ALTER TABLE "LoyaltyEventTrigger" ADD COLUMN "body" TEXT;

-- Backfill: the words each event already sends are its linked template's BODY.
UPDATE "LoyaltyEventTrigger" t
SET "body" = c->>'text'
FROM "WaTemplate" w, jsonb_array_elements(w."data"->'components') c
WHERE t."waTemplateId" = w.id
  AND upper(c->>'type') = 'BODY'
  AND c->>'text' IS NOT NULL
  AND t."body" IS NULL;
