-- Loyalty feedback selects a flow instead of creating one.
--
-- WaFlow.categories stores what was picked at creation. Meta's own categories were never
-- persisted before; the RateUp-only LOYALTY_FEEDBACK category (mapped to SURVEY for Meta) is
-- how Loyalty → Feedback finds the flows it may select.
--
-- LoyaltyFeedbackSetting.draftKey goes: the setting no longer builds the flow from a draft —
-- the draft is the template the flow was created from in WhatsApp → Flow.

-- AlterTable
ALTER TABLE "WaFlow" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "LoyaltyFeedbackSetting" DROP COLUMN "draftKey";
