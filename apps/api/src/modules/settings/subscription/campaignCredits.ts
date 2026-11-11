import prisma from "../../../utils/prisma.js";
import { getCampaignPackCreditsRemaining, planMeterMax } from "./addons.js";
import { currentPeriodStart, isSamePeriod, periodKey } from "./billingPeriod.js";
import { maybeNotifyLimitReached } from "./limitAlerts.js";

export interface CampaignCreditBudget {
  /** False when the plan does not cap campaign sends (uncapped Enterprise). */
  metered: boolean;
  period: Date;
  planMax?: number;
  /** Plan credits spent this month. */
  planUsed: number;
  /** Unspent credits in in-date packs. */
  packRemaining: number;
  /** Plan credits left plus pack credits. Undefined when not metered. */
  remaining?: number;
  exhausted: boolean;
}

async function planCreditsMax(orgId: string): Promise<number | undefined> {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { features: true },
  });
  // No subscription row means nothing to measure against, so nothing is enforced.
  if (!subscription) return undefined;
  return planMeterMax(subscription.features, "CAMPAIGN_CREDITS");
}

export async function getCampaignCreditBudget(orgId: string): Promise<CampaignCreditBudget> {
  const period = currentPeriodStart();
  const [planMax, usage, packRemaining] = await Promise.all([
    planCreditsMax(orgId),
    prisma.usageStats.findUnique({
      where: { orgId },
      select: { campaignCreditsUsed: true, campaignCreditsPeriodStart: true },
    }),
    getCampaignPackCreditsRemaining(orgId),
  ]);
  const planUsed = isSamePeriod(usage?.campaignCreditsPeriodStart, period)
    ? (usage?.campaignCreditsUsed ?? 0)
    : 0;

  if (planMax === undefined) {
    return { metered: false, period, planUsed, packRemaining, exhausted: false };
  }
  const remaining = Math.max(planMax - planUsed, 0) + packRemaining;
  return {
    metered: true,
    period,
    planMax,
    planUsed,
    packRemaining,
    remaining,
    exhausted: remaining <= 0,
  };
}

/**
 * Spends one credit for one attempted campaign send, before Meta is called. Returns false
 * when none is left. The plan's monthly credits go first, then the pack closest to
 * expiring. Every step is a single conditional UPDATE, so the worker's concurrent sends
 * can never overspend.
 */
export async function consumeCampaignCredit(orgId: string): Promise<boolean> {
  const planMax = await planCreditsMax(orgId);
  if (planMax === undefined) {
    // Uncapped: still counted, so the billing page and staff console can show volume.
    await countUncappedCredit(orgId);
    return true;
  }

  const period = currentPeriodStart();
  const fromPlan = await prisma.$queryRaw<Array<{ used: number }>>`
    INSERT INTO "UsageStats" ("orgId", "updatedAt", "campaignCreditsUsed", "campaignCreditsPeriodStart")
    VALUES (${orgId}::uuid, now(), 1, ${periodKey(period)}::date)
    ON CONFLICT ("orgId") DO UPDATE SET
      "campaignCreditsUsed" = CASE
        WHEN "UsageStats"."campaignCreditsPeriodStart" = ${periodKey(period)}::date
          THEN "UsageStats"."campaignCreditsUsed" + 1
        ELSE 1
      END,
      "campaignCreditsPeriodStart" = ${periodKey(period)}::date,
      "updatedAt" = now()
    WHERE "UsageStats"."campaignCreditsPeriodStart" IS DISTINCT FROM ${periodKey(period)}::date
       OR "UsageStats"."campaignCreditsUsed" < ${planMax}
    RETURNING "campaignCreditsUsed" AS used
  `;
  if (fromPlan.length > 0) {
    if (fromPlan[0].used >= planMax && (await getCampaignPackCreditsRemaining(orgId)) === 0) {
      await maybeNotifyLimitReached(orgId, "campaignCredits", period);
    }
    return true;
  }

  // A concurrent send can take a pack's last credit between the pick and the update; the
  // re-checked outer condition then matches nothing, so pick again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const fromPack = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "SubscriptionAddon" SET "creditsUsed" = "creditsUsed" + 1, "updatedAt" = now()
      WHERE "creditsUsed" < COALESCE("creditsGranted", 0)
        AND "id" = (
          SELECT "id" FROM "SubscriptionAddon"
          WHERE "orgId" = ${orgId}::uuid
            AND "kind" = 'CAMPAIGN_CREDITS'
            AND "expiresAt" > now()
            AND "creditsUsed" < COALESCE("creditsGranted", 0)
          ORDER BY "expiresAt" ASC
          LIMIT 1
        )
      RETURNING "id"
    `;
    const left = await getCampaignPackCreditsRemaining(orgId);
    if (fromPack.length > 0) {
      if (left === 0) await maybeNotifyLimitReached(orgId, "campaignCredits", period);
      return true;
    }
    if (left === 0) break;
  }

  await maybeNotifyLimitReached(orgId, "campaignCredits", period);
  return false;
}

async function countUncappedCredit(orgId: string) {
  const period = currentPeriodStart();
  await prisma.$executeRaw`
    INSERT INTO "UsageStats" ("orgId", "updatedAt", "campaignCreditsUsed", "campaignCreditsPeriodStart")
    VALUES (${orgId}::uuid, now(), 1, ${periodKey(period)}::date)
    ON CONFLICT ("orgId") DO UPDATE SET
      "campaignCreditsUsed" = CASE
        WHEN "UsageStats"."campaignCreditsPeriodStart" = ${periodKey(period)}::date
          THEN "UsageStats"."campaignCreditsUsed" + 1
        ELSE 1
      END,
      "campaignCreditsPeriodStart" = ${periodKey(period)}::date,
      "updatedAt" = now()
  `;
}
