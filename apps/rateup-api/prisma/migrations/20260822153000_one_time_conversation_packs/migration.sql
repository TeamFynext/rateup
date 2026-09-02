-- Conversation packs become a one-off, month-long top-up rather than a subscription.
--
-- A pack no longer renews, so the row it writes needs its own end date and there is no
-- gateway subscription behind it — one org can hold several packs bought on different
-- days, which the old (orgId, addonPlanId) uniqueness forbade.

-- The gateway reference is now a payment, not a subscription.
ALTER TABLE "SubscriptionAddon" RENAME COLUMN "subscriptionRef" TO "paymentRef";
ALTER INDEX "SubscriptionAddon_subscriptionRef_key" RENAME TO "SubscriptionAddon_paymentRef_key";

-- One purchase per row, so several may coexist for the same org and tier.
DROP INDEX IF EXISTS "SubscriptionAddon_orgId_addonPlanId_key";

-- Existing rows were bought as subscriptions and have been credited up to now; give them
-- a month from today rather than expiring them retroactively, which would withdraw
-- allowance somebody has already paid for.
ALTER TABLE "SubscriptionAddon" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '1 month');
ALTER TABLE "SubscriptionAddon" ALTER COLUMN "expiresAt" DROP DEFAULT;

CREATE INDEX "SubscriptionAddon_orgId_expiresAt_idx" ON "SubscriptionAddon"("orgId", "expiresAt");
