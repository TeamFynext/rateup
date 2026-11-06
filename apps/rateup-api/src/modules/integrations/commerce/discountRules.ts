import { LoyaltyPointRewardSubType, type LoyaltyRedemptionRules } from "../../../types/loyalty.js";
import type {
  CommerceDiscountInput,
  CommerceDiscountRules,
  CommerceDiscountValue,
} from "./commerce.types.js";

/**
 * The pure half of loyalty discount codes: what a reward's value means as a
 * discount, when its code is live, and the store-neutral input for it. Kept
 * apart from the sync in `discounts.ts` so a store provider can build on it
 * without importing the provider registry.
 */

/**
 * A reward's value as a discount, or null when it has none any store can
 * express.
 *
 * `LoyaltyReward.rewardValue` is untyped JSON and three vocabularies are live
 * on real rows — the same split `giveback.ts`'s `rewardWorth` handles:
 *
 *   dialect A  `{ type: "discount_fixed" | "discount_percentage", amount | percentage }`
 *              — the presets, the onboarding wizard, `reward.schema.ts`
 *   dialect B  `{ rewardType: "fixed-discount" | "percentage-discount", cashbackAmount |
 *              discountPercentage }` — the standalone rewards editor
 *   coupons    `{ discountType: "fixed" | "percentage", discountValue }` — the coupon tab
 *
 * A free item is not expressible: "one free X" names a product by the store's
 * own id, which a loyalty reward does not carry.
 */
export function parseRewardDiscount(rewardValue: unknown): CommerceDiscountValue | null {
  if (!rewardValue || typeof rewardValue !== "object" || Array.isArray(rewardValue)) return null;
  const v = rewardValue as Record<string, unknown>;

  const num = (raw: unknown): number | null => {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const fixed = (amount: number | null): CommerceDiscountValue | null =>
    amount === null ? null : { kind: "fixed", amount };
  const percentage = (pct: number | null): CommerceDiscountValue | null =>
    pct === null ? null : { kind: "percentage", percentage: pct };

  // ── dialect A
  if (v.type === LoyaltyPointRewardSubType.DISCOUNT_FIXED) return fixed(num(v.amount));
  if (v.type === LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE)
    return percentage(num(v.percentage));
  if (v.type === LoyaltyPointRewardSubType.FREE_ITEM) return null;

  // ── dialect B
  if (v.rewardType === "fixed-discount") return fixed(num(v.cashbackAmount));
  if (v.rewardType === "percentage-discount") return percentage(num(v.discountPercentage));
  if (v.rewardType === "free-item" || v.rewardType === "free-service") return null;

  // ── coupon tab
  if (v.discountType === "fixed") return fixed(num(v.discountValue));
  if (v.discountType === "percentage") return percentage(num(v.discountValue));

  return null;
}

/** True when the reward's percentage carries a cap a basic store discount cannot express. */
export function hasUnsupportedCap(rewardValue: unknown): boolean {
  if (!rewardValue || typeof rewardValue !== "object") return false;
  const cap = (rewardValue as Record<string, unknown>).max_discount_amount;
  return cap !== undefined && cap !== null && Number(cap) > 0;
}

/**
 * When the code is live, reconciled from every deadline the reward carries.
 *
 * Three can each close the window and the earliest wins:
 *
 *   `time_restrictions.valid_until` — the offer's own end date.
 *   `validForDays`                  — per code, from the moment this customer redeemed.
 *   `expiresAt`                     — this one code's expiry, when a caller sets one.
 *
 * `startsAt` is the later of the redemption and `valid_from`: a code handed out
 * before the promotion opens must not work early.
 *
 * Returns null when the window is already shut — stores reject an end at or
 * before the start, and a code that could never be used is not worth creating.
 */
export function discountWindow(params: {
  rules: LoyaltyRedemptionRules;
  validForDays?: number | null;
  issuedAt: Date;
  expiresAt: Date | null;
}): { startsAt: Date; endsAt: Date | null } | null {
  const date = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const time = params.rules?.time_restrictions;
  const validFrom = date(time?.valid_from);
  const startsAt =
    validFrom && validFrom.getTime() > params.issuedAt.getTime() ? validFrom : params.issuedAt;

  const deadlines = [
    params.expiresAt,
    date(time?.valid_until),
    params.validForDays
      ? new Date(params.issuedAt.getTime() + params.validForDays * 86_400_000)
      : null,
  ].filter((d): d is Date => d !== null);

  const endsAt = deadlines.length ? new Date(Math.min(...deadlines.map((d) => d.getTime()))) : null;

  if (endsAt && endsAt.getTime() <= startsAt.getTime()) return null;
  return { startsAt, endsAt };
}

/**
 * The store-neutral input for one redemption's code, or null when there is
 * nothing to create.
 *
 * Deliberately not carried: stock and per-customer limits. Both govern
 * issuing, which happens here, not redeeming, which happens in the store; each
 * code is its own single-use discount regardless.
 */
export function buildCommerceDiscountInput(params: {
  code: string;
  rewardName: string;
  value: unknown;
  rules: LoyaltyRedemptionRules;
  storeRules: CommerceDiscountRules | undefined;
  issuedAt: Date;
  expiresAt: Date | null;
}): CommerceDiscountInput | null {
  const value = parseRewardDiscount(params.value);
  if (!value) return null;

  const window = discountWindow({
    rules: params.rules,
    validForDays: params.storeRules?.valid_for_days,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
  });
  if (!window) return null;

  const minimumSpend = params.rules?.spend_requirements?.minimum_spend;
  const combines = params.storeRules?.combines_with;

  return {
    code: params.code,
    title: `Loyalty reward: ${params.rewardName} (${params.code})`,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    value,
    minimumSpend: minimumSpend && minimumSpend > 0 ? minimumSpend : null,
    combinesWith: {
      order: combines?.order_discounts ?? false,
      product: combines?.product_discounts ?? false,
      shipping: combines?.shipping_discounts ?? false,
    },
  };
}
