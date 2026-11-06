-- Packs of extra conversations, bought on top of a plan. Its own table rather than a
-- number on Subscription so each pack keeps the gateway subscription paying for it —
-- packs bill monthly and independently of the plan they sit on top of.
CREATE TABLE "SubscriptionAddon" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "orgId"           UUID NOT NULL,
  "addonPlanId"     UUID NOT NULL,
  "quantity"        INTEGER NOT NULL DEFAULT 1,
  "subscriptionRef" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionAddon_subscriptionRef_key" ON "SubscriptionAddon"("subscriptionRef");
CREATE UNIQUE INDEX "SubscriptionAddon_orgId_addonPlanId_key" ON "SubscriptionAddon"("orgId", "addonPlanId");

ALTER TABLE "SubscriptionAddon" ADD CONSTRAINT "SubscriptionAddon_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAddon" ADD CONSTRAINT "SubscriptionAddon_addonPlanId_fkey"
  FOREIGN KEY ("addonPlanId") REFERENCES "RateupPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
