import { toFiniteNumber } from "./calculateGiveback.ts";
import { roundNice } from "./suggestPointsCost.ts";

/**
 * What a purchase earns — the arithmetic behind the rewards-free rail on the Earning and
 * Tiers steps. Mirrors the API's `calculatePointsForPurchase`: amount × rate × rule
 * multiplier, plus the flat bonus, times the tier multiplier, floored.
 */
export interface PreviewEarnRate {
  pointsPerUnit: number;
  multiplier: number;
  bonusPoints: number;
}

export interface PreviewTier {
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color?: string | null;
}

export function pointsEarned(
  amount: number,
  earnRate: PreviewEarnRate,
  tierMultiplier = 1,
): number {
  const base =
    toFiniteNumber(amount) *
    toFiniteNumber(earnRate.pointsPerUnit) *
    toFiniteNumber(earnRate.multiplier, 1);
  const withBonus = base + toFiniteNumber(earnRate.bonusPoints);
  return Math.max(0, Math.floor(withBonus * toFiniteNumber(tierMultiplier, 1)));
}

/** Half, the typical order, and double — deduplicated and ascending. */
export function previewAmounts(averageOrderValue: number): number[] {
  const amounts = [
    roundNice(averageOrderValue / 2),
    averageOrderValue,
    roundNice(averageOrderValue * 2),
  ];
  return [...new Set(amounts.filter((amount) => amount > 0))].sort((a, b) => a - b);
}

export interface TierPreviewRow {
  name: string;
  color?: string | null;
  pointsMultiplier: number;
  points: number;
}

/** One row per tier at the typical order, lowest threshold first. */
export function tierPreviewRows(
  averageOrderValue: number,
  earnRate: PreviewEarnRate,
  tiers: readonly PreviewTier[],
): TierPreviewRow[] {
  return [...tiers]
    .sort((a, b) => toFiniteNumber(a.threshold) - toFiniteNumber(b.threshold))
    .map((tier) => ({
      name: tier.name,
      color: tier.color,
      pointsMultiplier: toFiniteNumber(tier.pointsMultiplier, 1),
      points: pointsEarned(averageOrderValue, earnRate, toFiniteNumber(tier.pointsMultiplier, 1)),
    }));
}
