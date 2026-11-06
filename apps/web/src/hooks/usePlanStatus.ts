import { useMemo } from "react";

import { useUsageStats } from "@/backend/stats/stats.query";
import type { SubscriptionUsage } from "@/backend/subscription/subscription.api";
import { useSubscription, useSubscriptionUsage } from "@/backend/subscription/subscription.query";

/** One plan allowance, and how much of it the org has spent. */
export interface PlanMeter {
  key: string;
  /** Shown to the customer, so it reads as the thing they ran out of. */
  label: string;
  used: number;
  max: number;
  /**
   * Whether the allowance refills each billing period.
   *
   * Consumption — active contacts, campaign credits, form submissions — resets, so spending it all
   * is an event: something stopped working and will start again next period. Structural
   * caps like teams and seats never reset. A free org sits at 1/1 teams from the moment
   * it creates its first one, which is a normal steady state, not an outage, and must not
   * raise an alarm that can never be cleared.
   */
  resetsEachPeriod: boolean;
}

/**
 * How much of an allowance has to be gone before the customer is told they are running
 * low. Below this there is nothing to act on, and saying "running short" at 2 of 100,000
 * is just noise that teaches people to ignore the banner.
 */
const NEARLY_SPENT = 0.8;

export interface PlanStatus {
  isLoading: boolean;
  isFreePlan: boolean;
  planName: string;
  /**
   * Period allowances that are most of the way gone but not yet finished — the only case
   * where an upsell is genuinely useful to a paying customer.
   */
  nearlySpent: PlanMeter[];
  /**
   * Period allowances the org has fully spent — the ones worth interrupting someone over.
   * Structural caps are deliberately absent; see {@link PlanMeter.resetsEachPeriod}.
   */
  exhausted: PlanMeter[];
}

/**
 * The sentinel a sales-led plan stores instead of a real cap. Mirrors UNLIMITED_COUNT in
 * the API's subscription.data.ts, and must stay in step with it.
 *
 * Deliberately the sentinel itself rather than a lower round number: any threshold below
 * it is a trap for whoever next raises a paid tier's limit, because a tier that crossed
 * it would silently stop being metered. The API test `paid tiers stay below the unlimited
 * sentinel` holds that line for both sides.
 */
const UNLIMITED_ALLOWANCE = 10_000_000;

function meter(
  key: string,
  label: string,
  used: number | undefined,
  max: number | undefined,
  resetsEachPeriod: boolean,
): PlanMeter | null {
  // A missing, zero or sentinel allowance means "not metered on this plan" rather than
  // "none left". Enterprise is invoiced on the usage it actually runs, so its stored
  // figure is a placeholder — measuring against it would eventually tell a contracted
  // customer they had run out of something they have no limit on, and point them at an
  // upgrade that does not exist.
  if (!max || max <= 0 || max >= UNLIMITED_ALLOWANCE) return null;
  return { key, label, used: used ?? 0, max, resetsEachPeriod };
}

/** Active contacts against plan + packs, as the server meters them. */
function activeContactMeter(usage: SubscriptionUsage | undefined): PlanMeter | null {
  const budget = usage?.activeContacts;
  if (!budget?.metered) return null;
  return meter("activeContacts", "active contacts", budget.used, budget.max, true);
}

/**
 * Campaign credits, plan and packs pooled. The API reports what is left rather than one
 * "used" figure across both, so `used` is derived from the pooled total.
 */
function campaignCreditMeter(usage: SubscriptionUsage | undefined): PlanMeter | null {
  const budget = usage?.campaignCredits;
  if (!budget?.metered) return null;
  const remaining = budget.remaining ?? 0;
  const max = Math.max(budget.planMax ?? 0, (budget.planUsed ?? 0) + remaining);
  return meter("campaignCredits", "campaign credits", max - remaining, max, true);
}

/**
 * What the org's plan allows, what it has spent, and what it has run out of.
 *
 * Derived from the queries the billing page already loads, so mounting this in the layout
 * costs nothing extra — they are cached by react-query and shared with the billing meters.
 */
export function usePlanStatus(): PlanStatus {
  const { data: subscription, isPending: subscriptionPending } = useSubscription();
  const { data: stats, isPending: statsPending } = useUsageStats();
  const { data: usage, isPending: usagePending } = useSubscriptionUsage();

  return useMemo(() => {
    const features = subscription?.features;
    const planName = subscription?.basePlan?.displayName || subscription?.basePlan?.name || "";

    const candidates = [
      activeContactMeter(usage),
      campaignCreditMeter(usage),
      meter(
        "formSubmissions",
        "form submissions",
        stats?.monthlySurveyResponses,
        features?.webSurvey?.count?.monthlyResponseLimit,
        true,
      ),
      meter("teams", "teams", stats?.teamsCount, features?.team?.count?.max, false),
      meter(
        "teamMembers",
        "team members",
        stats?.teamMembersCount,
        features?.team?.teamMember?.count?.max,
        false,
      ),
    ].filter((entry): entry is PlanMeter => entry !== null);

    const metered = candidates.filter((entry) => entry.resetsEachPeriod);

    return {
      isLoading: subscriptionPending || statsPending || usagePending,
      isFreePlan: /free/i.test(subscription?.basePlan?.name ?? ""),
      planName,
      exhausted: metered.filter((entry) => entry.used >= entry.max),
      nearlySpent: metered.filter(
        (entry) => entry.used < entry.max && entry.used >= entry.max * NEARLY_SPENT,
      ),
    };
  }, [subscription, stats, usage, subscriptionPending, statsPending, usagePending]);
}
