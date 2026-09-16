/**
 * The earn rate as merchants say it — "spend ₹100, earn 10 points" — against how it is
 * stored: `pointsPerUnit`, points per one currency unit. Both directions live here so
 * every editor shows the same pair for the same rate.
 */

export interface EarnPair {
  /** Currency spent. */
  spend: number;
  /** Points earned for that spend. */
  points: number;
}

const EPSILON = 1e-6;
/** Stored as Decimal(12,6): six places is exact for every pair a merchant would type. */
const RATE_DECIMALS = 6;
/** How many points to try before giving up on a whole-number pair. */
const MAX_POINTS_SEARCH = 100;

/**
 * The pair with the fewest whole points whose spend is whole too — 0.1 → "₹10 = 1 point",
 * 2 → "₹1 = 2 points", 0.15 → "₹20 = 3 points", 0.006667 → "₹150 = 1 point" (allowing for
 * the six-place rounding the stored rate carries). A rate no such pair fits falls back to
 * ₹100 with whatever fraction of a point that is.
 */
export function earnPairFromRate(rate: number): EarnPair {
  if (!Number.isFinite(rate) || rate <= 0) return { spend: 100, points: 0 };
  for (let points = 1; points <= MAX_POINTS_SEARCH; points++) {
    const spend = points / rate;
    if (Math.abs(spend - Math.round(spend)) <= Math.max(EPSILON * 10, spend * 1e-4)) {
      return { spend: Math.round(spend), points };
    }
  }
  return { spend: 100, points: Number((rate * 100).toFixed(4)) };
}

/** Points per one currency unit for a pair, to the precision the API stores. */
export function rateFromEarnPair(spend: number, points: number): number {
  if (!Number.isFinite(spend) || !Number.isFinite(points) || spend <= 0 || points < 0) return 0;
  return Number((points / spend).toFixed(RATE_DECIMALS));
}

/** Whether a stored rate and a pair describe the same thing, within storage precision. */
export function sameRate(rate: number, pair: EarnPair): boolean {
  return Math.abs(rateFromEarnPair(pair.spend, pair.points) - rate) < 10 ** -RATE_DECIMALS;
}

/** Points a purchase of `amount` earns at `rate`, the way the engine rounds (down). */
export function pointsFor(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  return Math.floor(amount * rate);
}
