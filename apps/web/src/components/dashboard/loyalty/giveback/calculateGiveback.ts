/**
 * What percentage of revenue does this loyalty programme give back?
 *
 * Points are earned per currency unit spent (`LoyaltyEarningRule.pointsPerUnit`), but
 * nothing in the schema says what a point is *worth* — there is no conversion rate. A
 * point's value is only implied by the rewards catalog: a reward's monetary worth
 * divided by its `pointsCost`. Multiply the two and you get the share of revenue the
 * programme hands back.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIRRORED, BY HAND, IN THE API:
 *   rateup-api/src/modules/loyalty/giveback.ts
 * Both files carry the same test table. Change one, change the other — the wizard
 * computes this live as the user types, and the server repeats it at activation to
 * warn. The two must never disagree.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── bands ──────────────────────────────────────────────────────────────────── */

/**
 * Conventional retail and hospitality points programmes land at 1–3% of revenue (the
 * classic "1 point per unit, 100 points = 1 unit off" is exactly 1%). Airline and hotel
 * schemes run 3–7%, but those are subsidised by co-brand card partners, which no
 * merchant here has. Past ~10% the programme is a mispriced blanket discount that
 * exceeds gross margin for most food and retail businesses.
 *
 * We have no COGS, so the copy that hangs off these says "likely more than your margin",
 * never "you will lose money".
 */
export const GIVEBACK_BANDS = { low: 1, healthy: 5, generous: 10 } as const;

export type GivebackBand = "unknown" | "low" | "healthy" | "generous" | "excessive";

export function givebackBand(pct: number | null): GivebackBand {
  if (pct === null || !Number.isFinite(pct)) return "unknown";
  if (pct < GIVEBACK_BANDS.low) return "low";
  if (pct <= GIVEBACK_BANDS.healthy) return "healthy";
  if (pct <= GIVEBACK_BANDS.generous) return "generous";
  return "excessive";
}

/* ── coercion ───────────────────────────────────────────────────────────────── */

/**
 * Values reach here from three directions that all lie about their type: Prisma
 * `Decimal` columns arrive as objects or strings, and in the UI `useWatch` hands back
 * the form's *input* type, so a `z.coerce.number()` field is a string mid-typing (""
 * while the user clears it). Anything non-finite or negative is treated as 0 — a
 * negative earn rate or reward value has no meaning.
 */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n < 0 ? 0 : n;
}

/* ── reward worth ───────────────────────────────────────────────────────────── */

export type SkipReason = "no_points_cost" | "no_monetary_value" | "unrecognised_shape";

export type RewardWorth =
  | { worth: number; dependsOnAov: boolean }
  | { worth: null; reason: SkipReason };

function num(record: Record<string, unknown>, key: string): number | null {
  const raw = record[key];
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * `LoyaltyReward.rewardValue` is an untyped JSON blob and two different vocabularies
 * are live in production:
 *
 *   dialect A  keyed on `type`        — the presets, the wizard, `reward.schema.ts`
 *              discount_fixed / discount_percentage / free_item
 *   dialect B  keyed on `rewardType`  — the standalone editor at /dashboard/loyalty/rewards
 *              fixed-discount / percentage-discount / free-item / free-service
 *
 * Nothing server-side reads either, so neither has ever been enforced and both are on
 * real rows. Handling only dialect A would price most merchants' rewards at zero, which
 * would understate giveback — the exact opposite of what this module is for.
 *
 * `averageOrderValue` is only consulted for percentage discounts, where the worth
 * genuinely depends on the order it is applied to. `dependsOnAov` reports that back so
 * callers know whether the estimate moves with the AOV guess.
 */
export function rewardWorth(rewardValue: unknown, averageOrderValue: number | null): RewardWorth {
  if (!rewardValue || typeof rewardValue !== "object" || Array.isArray(rewardValue)) {
    return { worth: null, reason: "unrecognised_shape" };
  }
  const v = rewardValue as Record<string, unknown>;

  const percentageWorth = (pct: number, cap: number | null): RewardWorth => {
    if (averageOrderValue === null || averageOrderValue <= 0) {
      return { worth: null, reason: "no_monetary_value" };
    }
    const raw = (pct / 100) * averageOrderValue;
    return { worth: cap !== null ? Math.min(raw, cap) : raw, dependsOnAov: true };
  };

  // ── dialect A
  const typeA = typeof v.type === "string" ? v.type : null;
  if (typeA === "discount_fixed") {
    const amount = num(v, "amount");
    return amount === null
      ? { worth: null, reason: "no_monetary_value" }
      : { worth: amount, dependsOnAov: false };
  }
  if (typeA === "discount_percentage") {
    const pct = num(v, "percentage");
    if (pct === null) return { worth: null, reason: "no_monetary_value" };
    return percentageWorth(pct, num(v, "max_discount_amount"));
  }
  if (typeA === "free_item") {
    const itemValue = num(v, "item_value");
    if (itemValue === null) return { worth: null, reason: "no_monetary_value" };
    return { worth: itemValue * (num(v, "quantity") ?? 1), dependsOnAov: false };
  }

  // ── dialect B
  const typeB = typeof v.rewardType === "string" ? v.rewardType : null;
  if (typeB === "fixed-discount") {
    const amount = num(v, "cashbackAmount");
    return amount === null
      ? { worth: null, reason: "no_monetary_value" }
      : { worth: amount, dependsOnAov: false };
  }
  if (typeB === "percentage-discount") {
    const pct = num(v, "discountPercentage");
    if (pct === null) return { worth: null, reason: "no_monetary_value" };
    return percentageWorth(pct, null);
  }
  if (typeB === "free-item" || typeB === "free-service") {
    const estimated = num(v, "estimatedValue");
    return estimated === null
      ? { worth: null, reason: "no_monetary_value" }
      : { worth: estimated, dependsOnAov: false };
  }

  // ── coupon blobs, and rows whose discriminator was never written. In practice these
  // carry pointsCost 0 and are filtered out before reaching here, but a reward edited
  // across both editors can end up with amounts and no recognisable type.
  const discountType = typeof v.discountType === "string" ? v.discountType : null;
  if (discountType === "fixed") {
    const amount = num(v, "discountValue");
    if (amount !== null) return { worth: amount, dependsOnAov: false };
  }
  if (discountType === "percentage") {
    const pct = num(v, "discountValue");
    if (pct !== null) return percentageWorth(pct, null);
  }

  for (const key of ["amount", "cashbackAmount", "estimatedValue", "item_value"]) {
    const amount = num(v, key);
    if (amount !== null) return { worth: amount, dependsOnAov: false };
  }
  for (const key of ["percentage", "discountPercentage"]) {
    const pct = num(v, key);
    if (pct !== null) return percentageWorth(pct, null);
  }

  return { worth: null, reason: "unrecognised_shape" };
}

/* ── per-reward economics ───────────────────────────────────────────────────── */

export interface RewardEconomics {
  /** Cash the reward is worth at this AOV, or null if it could not be priced. */
  worth: number | null;
  dependsOnAov: boolean;
  /** What a customer spends to accumulate `pointsCost`. Null when the earn rate is 0. */
  spendToEarn: number | null;
  /** worth / spendToEarn × 100 — this reward's own giveback. */
  givebackPct: number | null;
  band: GivebackBand;
  skipReason: SkipReason | null;
}

/**
 * The per-reward view: "worth about X, a customer spends Y to earn it, that's Z% back".
 *
 * `spendToEarn` is what makes a reward's cost legible — "100 points" means nothing until
 * you know it takes 100 currency units of spending to get there. It is undefined when
 * the effective earn rate is 0 (a flat-bonus-only programme, e.g. points per check-in),
 * in which case the worth stands alone rather than dividing by zero.
 */
export function rewardEconomics(args: {
  rewardValue: unknown;
  pointsCost: number;
  earnRate: { pointsPerUnit: number; multiplier: number };
  averageOrderValue: number | null;
}): RewardEconomics {
  const pointsCost = toFiniteNumber(args.pointsCost);
  const aov =
    args.averageOrderValue === null ? null : toFiniteNumber(args.averageOrderValue) || null;

  // Coupons and assigned gifts are written with pointsCost 0. They are not bought with
  // points at all, so dividing by their cost would produce Infinity.
  if (pointsCost <= 0) {
    return {
      worth: null,
      dependsOnAov: false,
      spendToEarn: null,
      givebackPct: null,
      band: "unknown",
      skipReason: "no_points_cost",
    };
  }

  const worth = rewardWorth(args.rewardValue, aov);
  if (worth.worth === null) {
    return {
      worth: null,
      dependsOnAov: false,
      spendToEarn: null,
      givebackPct: null,
      band: "unknown",
      skipReason: worth.reason,
    };
  }

  const pointsPerUnit =
    toFiniteNumber(args.earnRate.pointsPerUnit) * toFiniteNumber(args.earnRate.multiplier, 1);

  if (pointsPerUnit <= 0) {
    return {
      worth: worth.worth,
      dependsOnAov: worth.dependsOnAov,
      spendToEarn: null,
      givebackPct: null,
      band: "unknown",
      skipReason: null,
    };
  }

  const spendToEarn = pointsCost / pointsPerUnit;
  const givebackPct = (worth.worth / spendToEarn) * 100;

  return {
    worth: worth.worth,
    dependsOnAov: worth.dependsOnAov,
    spendToEarn,
    givebackPct,
    band: givebackBand(givebackPct),
    skipReason: null,
  };
}

/* ── programme-wide giveback ────────────────────────────────────────────────── */

export interface GivebackInput {
  /** The DEFAULT earning rule only — the others are conditional (weekends, day ranges)
   *  and cannot be averaged without a traffic assumption we do not have. */
  earnRate: { pointsPerUnit: number; multiplier: number; bonusPoints: number };
  rewards: Array<{ name: string; pointsCost: number; rewardValue: unknown }>;
  /** null = the merchant never told us. Never substitute a guess. */
  averageOrderValue: number | null;
  tiersEnabled: boolean;
  tiers: Array<{ name: string; threshold: number; pointsMultiplier: number; color?: string }>;
  bonuses: { signupBonus: number; referralBonus: number; refereeBonus: number };
}

export type GivebackStatus =
  | "ok"
  | "needs_average_order_value"
  | "no_earning"
  | "no_valued_rewards";

export interface ValuedReward {
  name: string;
  pointsCost: number;
  worth: number;
  valuePerPoint: number;
  dependsOnAov: boolean;
}

export interface GivebackResult {
  status: GivebackStatus;
  band: GivebackBand;
  /** pointsPerUnit × multiplier, at base tier. */
  pointsPerCurrencyUnit: number;
  /** Points a typical order awards, flat bonus included. Null without an AOV. */
  pointsPerOrder: number | null;
  pointValue: { best: number; worst: number } | null;
  bestReward: ValuedReward | null;
  valuedRewards: ValuedReward[];
  skippedRewards: Array<{ name: string; reason: SkipReason }>;
  /** Headline: % of spend given back at base tier, valued at the BEST reward. */
  givebackPct: number | null;
  /** The same at the worst-value reward — the bottom of the range. */
  givebackPctFloor: number | null;
  /** How much of `givebackPct` comes from the flat per-transaction bonus. */
  flatBonusPct: number | null;
  /**
   * `givebackPct` at the most generous tier — what the programme costs for the customers
   * it costs most. Equal to `givebackPct` when tiers are off or there are none, so a
   * tierless programme reads exactly as before.
   */
  givebackPctTop: number | null;
  /** The tier driving `givebackPctTop`. Null when tiers are off or there are none. */
  topTier: { name: string; pointsMultiplier: number; givebackPct: number } | null;
  perTier: Array<{
    name: string;
    threshold: number;
    pointsMultiplier: number;
    givebackPct: number;
    color?: string;
  }>;
  /** One-time currency costs. Deliberately NOT folded into the percentage: they
   *  amortise over a customer lifetime, not per order. */
  oneTimeCosts: { perNewMember: number | null; perReferralPair: number | null } | null;
}

const EMPTY: Omit<GivebackResult, "status" | "pointsPerCurrencyUnit" | "skippedRewards"> = {
  band: "unknown",
  pointsPerOrder: null,
  pointValue: null,
  bestReward: null,
  valuedRewards: [],
  givebackPct: null,
  givebackPctFloor: null,
  flatBonusPct: null,
  givebackPctTop: null,
  topTier: null,
  perTier: [],
  oneTimeCosts: null,
};

/**
 * The headline values points at the *best* reward in the catalog, which is why the copy
 * reads "up to". A rational customer redeems into the most generous option, and one
 * mispriced reward is precisely the accident this exists to catch — averaging would hide
 * it. The worst-value reward gives the floor, so the panel can show a range.
 *
 * Deliberately ignores the `Math.floor()` in `calculatePointsForPurchase`: rounding down
 * is noise at the aggregate, and modelling it makes the number jitter as the user types.
 */
export function calculateGiveback(input: GivebackInput): GivebackResult {
  const pointsPerUnit = toFiniteNumber(input.earnRate.pointsPerUnit);
  const multiplier = toFiniteNumber(input.earnRate.multiplier, 1);
  const bonusPoints = toFiniteNumber(input.earnRate.bonusPoints);
  const pointsPerCurrencyUnit = pointsPerUnit * multiplier;

  const rawAov = input.averageOrderValue === null ? null : toFiniteNumber(input.averageOrderValue);
  const aov = rawAov === null || rawAov <= 0 ? null : rawAov;

  const valuedRewards: ValuedReward[] = [];
  const skippedRewards: Array<{ name: string; reason: SkipReason }> = [];

  for (const reward of input.rewards) {
    const pointsCost = toFiniteNumber(reward.pointsCost);
    if (pointsCost <= 0) {
      skippedRewards.push({ name: reward.name, reason: "no_points_cost" });
      continue;
    }
    const worth = rewardWorth(reward.rewardValue, aov);
    if (worth.worth === null) {
      skippedRewards.push({ name: reward.name, reason: worth.reason });
      continue;
    }
    valuedRewards.push({
      name: reward.name,
      pointsCost,
      worth: worth.worth,
      valuePerPoint: worth.worth / pointsCost,
      dependsOnAov: worth.dependsOnAov,
    });
  }

  const base = { pointsPerCurrencyUnit, skippedRewards };

  if (valuedRewards.length === 0) {
    // A percentage reward that could not be priced is a missing AOV, not a missing
    // value — say so, because the fix is different.
    const blockedOnAov =
      aov === null &&
      skippedRewards.length > 0 &&
      input.rewards.some(
        (r) => toFiniteNumber(r.pointsCost) > 0 && isPercentageShape(r.rewardValue),
      );
    return {
      ...EMPTY,
      ...base,
      status: blockedOnAov ? "needs_average_order_value" : "no_valued_rewards",
    };
  }

  if (pointsPerCurrencyUnit <= 0 && bonusPoints <= 0) {
    return {
      ...EMPTY,
      ...base,
      status: "no_earning",
      givebackPct: 0,
      givebackPctTop: 0,
      band: "low",
    };
  }

  const sorted = [...valuedRewards].sort((a, b) => b.valuePerPoint - a.valuePerPoint);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // The flat bonus is per transaction, so turning it into a percentage needs an order
  // size to divide by. Without one we can still report the spend-proportional part.
  const aovDependent = bonusPoints > 0 || valuedRewards.some((r) => r.dependsOnAov);
  if (aov === null && aovDependent) {
    return { ...EMPTY, ...base, status: "needs_average_order_value" };
  }

  const pointsPerOrder = aov === null ? null : aov * pointsPerCurrencyUnit + bonusPoints;

  const pctFor = (valuePerPoint: number): number =>
    aov === null
      ? pointsPerCurrencyUnit * valuePerPoint * 100
      : (((aov * pointsPerCurrencyUnit + bonusPoints) * valuePerPoint) / aov) * 100;

  const givebackPct = pctFor(best.valuePerPoint);
  const givebackPctFloor = pctFor(worst.valuePerPoint);
  const flatBonusPct =
    aov === null || bonusPoints <= 0 ? null : ((bonusPoints * best.valuePerPoint) / aov) * 100;

  // Per-tier rows state what a customer *sitting in* that tier gives back, so no
  // distribution of customers across tiers has to be assumed.
  const perTier = input.tiersEnabled
    ? input.tiers.map((tier) => ({
        name: tier.name,
        threshold: toFiniteNumber(tier.threshold),
        pointsMultiplier: toFiniteNumber(tier.pointsMultiplier, 1),
        givebackPct: givebackPct * toFiniteNumber(tier.pointsMultiplier, 1),
        color: tier.color,
      }))
    : [];

  // The band is judged at the MOST GENEROUS tier, not the base. A x2 tier doubles what the
  // programme hands back, so warning only about the base rate would stay silent on exactly
  // the configuration most likely to be a mistake. Picked by multiplier rather than by
  // threshold: cost is what this is bounding, and the two only usually coincide.
  const topTier = perTier.reduce<GivebackResult["topTier"]>(
    (top, tier) =>
      top === null || tier.pointsMultiplier > top.pointsMultiplier
        ? {
            name: tier.name,
            pointsMultiplier: tier.pointsMultiplier,
            givebackPct: tier.givebackPct,
          }
        : top,
    null,
  );
  const givebackPctTop = topTier?.givebackPct ?? givebackPct;

  const signup = toFiniteNumber(input.bonuses.signupBonus);
  const referral = toFiniteNumber(input.bonuses.referralBonus);
  const referee = toFiniteNumber(input.bonuses.refereeBonus);

  return {
    status: "ok",
    band: givebackBand(givebackPctTop),
    pointsPerCurrencyUnit,
    pointsPerOrder,
    pointValue: { best: best.valuePerPoint, worst: worst.valuePerPoint },
    bestReward: best,
    valuedRewards,
    skippedRewards,
    givebackPct,
    givebackPctFloor,
    flatBonusPct,
    givebackPctTop,
    topTier,
    perTier,
    oneTimeCosts: {
      perNewMember: signup > 0 ? signup * best.valuePerPoint : null,
      perReferralPair: referral + referee > 0 ? (referral + referee) * best.valuePerPoint : null,
    },
  };
}

function isPercentageShape(rewardValue: unknown): boolean {
  if (!rewardValue || typeof rewardValue !== "object") return false;
  const v = rewardValue as Record<string, unknown>;
  return (
    v.type === "discount_percentage" ||
    v.rewardType === "percentage-discount" ||
    v.discountType === "percentage" ||
    v.percentage !== undefined ||
    v.discountPercentage !== undefined
  );
}
