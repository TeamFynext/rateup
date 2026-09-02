import { rewardWorth, toFiniteNumber } from "./calculateGiveback";

/**
 * What a reward *should* cost in points.
 *
 * NOTE: unlike `calculateGiveback.ts`, this module has **no server counterpart** and is not
 * mirrored in `rateup-api`. Don't mirror it by reflex — pricing a suggestion is a UI
 * affordance; the server only ever needs to score what the merchant actually chose.
 */

/**
 * The giveback a suggested price aims for. 3% sits in the lower half of the healthy band
 * (`GIVEBACK_BANDS.low` 1 → `.healthy` 5), and it is the figure every starter pack in the
 * API's `presets.ts` was hand-tuned to — so those presets double as this function's tests.
 */
export const TARGET_GIVEBACK_PCT = 3;

/** What a hand-added row costs when nothing can be derived. The wizard's long-time default. */
export const FALLBACK_POINTS_COST = 100;

export interface SuggestPointsCostArgs {
  rewardValue: unknown;
  earnRate: { pointsPerUnit: number; multiplier: number };
  averageOrderValue: number | null;
  /** Defaults to `TARGET_GIVEBACK_PCT`. */
  targetGivebackPct?: number;
}

/**
 * The algebraic inverse of `rewardEconomics`:
 *
 *   givebackPct = worth / spendToEarn × 100,  spendToEarn = pointsCost / pointsPerCurrencyUnit
 *   ⇒ pointsCost = worth × pointsPerCurrencyUnit × 100 / target
 *
 * Returns null when the reward has no derivable worth (a percentage discount with no order
 * value to apply it to) or the programme awards nothing per unit spent — in both cases
 * there is no honest number to suggest.
 */
export function suggestPointsCost(args: SuggestPointsCostArgs): number | null {
  const rawAov = args.averageOrderValue === null ? null : toFiniteNumber(args.averageOrderValue);
  const aov = rawAov === null || rawAov <= 0 ? null : rawAov;

  const worth = rewardWorth(args.rewardValue, aov);
  if (worth.worth === null || worth.worth <= 0) return null;

  const pointsPerCurrencyUnit =
    toFiniteNumber(args.earnRate.pointsPerUnit) * toFiniteNumber(args.earnRate.multiplier, 1);
  if (pointsPerCurrencyUnit <= 0) return null;

  const target = toFiniteNumber(args.targetGivebackPct, TARGET_GIVEBACK_PCT) || TARGET_GIVEBACK_PCT;

  return Math.max(1, roundNice((worth.worth * pointsPerCurrencyUnit * 100) / target));
}

/**
 * Two significant figures — 5,000 rather than 4,983.
 *
 * A suggested price that reads like it was calculated invites the merchant to trust it more
 * than they should; a round one reads as the starting point it is. The 5% relative error
 * this introduces keeps a 3% target inside 2.85–3.15%, nowhere near a band edge.
 */
export function roundNice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 1);
  return Math.max(1, Math.round(value / magnitude) * magnitude);
}
