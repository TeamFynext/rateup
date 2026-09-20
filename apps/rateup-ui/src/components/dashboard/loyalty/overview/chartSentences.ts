import type { TFunction } from "i18next";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";

/**
 * Each chart on the Overview says one thing in a sentence. A chart nobody can read is
 * decoration; the sentence is what an owner repeats to their staff.
 */
export function memberGrowthSentence(t: TFunction, dashboard: LoyaltyDashboardStats): string {
  const { timeline, period } = dashboard;
  if (timeline.every((b) => b.newMembers === 0)) {
    return t("No new members in this period yet.");
  }
  const total = timeline.reduce((sum, b) => sum + b.newMembers, 0);
  const per = Math.round(total / timeline.length);
  return period.granularity === "month"
    ? t("About {count} new members a month.", { count: per })
    : t("About {count} new members a week.", { count: per });
}

export function pointsFlowSentence(
  t: TFunction,
  dashboard: LoyaltyDashboardStats,
  pointsName: string,
): string {
  const { metrics } = dashboard;
  if (metrics.pointsIssued.current === 0) return t("Nothing issued yet.");
  const rate = metrics.redemptionRate.current;
  if (rate === null || rate === 0) {
    return t("{points} are being issued but nothing has been redeemed yet.", {
      points: pointsName,
    });
  }
  if (rate < 20) {
    return t("Only {rate} of {points} come back — the gap is the liability you carry.", {
      rate: `${Math.round(rate)}%`,
      points: pointsName,
    });
  }
  return t("{rate} of {points} issued are redeemed — the gap is the liability you carry.", {
    rate: `${Math.round(rate)}%`,
    points: pointsName,
  });
}

export function tierSentence(t: TFunction, dashboard: LoyaltyDashboardStats): string {
  const tiers = dashboard.tierDistribution.filter((tier) => tier.id !== null);
  const total = tiers.reduce((sum, tier) => sum + tier.value, 0);
  if (tiers.length === 0 || total === 0) return t("Your first members will appear here.");
  const biggest = [...tiers].sort((a, b) => b.value - a.value)[0];
  const share = Math.round((biggest.value / total) * 100);
  const empty = tiers.filter((tier) => tier.value === 0 || tier.value / total < 0.01);
  const lead =
    share >= 80
      ? t("Almost everyone is {tier}.", { tier: biggest.name })
      : t("{share}% of members are {tier}.", { share, tier: biggest.name });
  if (empty.length > 0) {
    return `${lead} ${t("{tier} is doing no work at its current threshold.", { tier: empty[0].name })}`;
  }
  return lead;
}

export function rewardsSentence(t: TFunction, dashboard: LoyaltyDashboardStats): string {
  const rewards = dashboard.popularRewards;
  if (rewards.length === 0) return t("No rewards have been redeemed in this period.");
  const [top] = rewards;
  const total = rewards.reduce((sum, r) => sum + r.redeemed, 0);
  const share = total > 0 ? Math.round((top.redeemed / total) * 100) : 0;
  return share >= 60
    ? t("{reward} is carrying the whole program.", { reward: top.name })
    : t("{reward} is the most redeemed, at {share}% of redemptions.", {
        reward: top.name,
        share,
      });
}
