import type { LoyaltyReward, LoyaltyRewardInput } from "@/backend/loyalty/reward.api";

import type {
  CouponFormValues,
  CouponValues,
  GiftFormValues,
  GiftValues,
  PointRewardFormValues,
  PointRewardValues,
} from "./schemas.ts";
import {
  shopifyRulesFrom,
  shopifyRulesToForm,
  wooRulesFrom,
  wooRulesToForm,
} from "./shopifyRules.ts";

/** The three kinds this editor creates. Review rewards are made under Feedback. */
export type EditableRewardType = "point" | "coupon" | "assigned";

export const BLANK_POINT_REWARD: PointRewardFormValues = {
  name: "",
  description: "",
  rewardType: "fixed-discount",
  pointsCost: 0,
  cashbackAmount: 0,
  discountPercentage: 0,
  estimatedValue: 0,
  restrictions: "",
  waTemplateId: "",
  tierIds: [],
  minimumSpend: undefined,
  availableDays: [],
  timeFrom: undefined,
  timeTo: undefined,
  shopifyDiscountEnabled: false,
  shopifyValidForDays: undefined,
  wooDiscountEnabled: false,
  wooValidForDays: undefined,
};

export const BLANK_COUPON: CouponFormValues = {
  name: "",
  description: "",
  couponCode: "",
  couponDescription: "",
  discountType: "percentage",
  discountValue: 0,
  stockQuantity: 1,
  perUserLimit: 1,
  validFrom: "",
  validTo: "",
  termsAndConditions: "",
  minimumSpend: 0,
  waTemplateId: "",
  tierIds: [],
  shopifyDiscountEnabled: false,
  wooDiscountEnabled: false,
};

export const BLANK_GIFT: GiftFormValues = {
  name: "",
  description: "",
  giftQuantity: 1,
  estimatedValue: 0,
  restrictions: "",
  waTemplateId: "",
  tierIds: [],
};

const POINT_SUBTYPES = ["fixed-discount", "percentage-discount", "free-item", "free-service"];

function isPointSubtype(value: unknown): value is PointRewardFormValues["rewardType"] {
  return typeof value === "string" && POINT_SUBTYPES.includes(value);
}

/**
 * Rows saved before the subtype was stored carry only their amounts, so the subtype is
 * inferred from whichever amount is set.
 */
export function pointRewardFormValues(reward: LoyaltyReward): PointRewardFormValues {
  const value = reward.rewardValue ?? {};
  const discountPercentage = Number(value.discountPercentage || 0);
  const estimatedValue = Number(value.estimatedValue || 0);
  const rewardType = isPointSubtype(value.rewardType)
    ? value.rewardType
    : discountPercentage > 0
      ? "percentage-discount"
      : estimatedValue > 0
        ? "free-item"
        : "fixed-discount";

  const spendMin = reward.redemptionRules?.spend_requirements?.minimum_spend;
  const time = reward.redemptionRules?.time_restrictions;

  return {
    ...BLANK_POINT_REWARD,
    name: reward.name || "",
    description: reward.description || "",
    rewardType,
    pointsCost: reward.pointsCost || 0,
    waTemplateId: reward.waTemplateId || undefined,
    tierIds: reward.availableForTiers || [],
    cashbackAmount: Number(value.cashbackAmount || 0),
    discountPercentage,
    estimatedValue,
    restrictions: value.termsAndConditions || value.restrictions || "",
    minimumSpend: spendMin ? Number(spendMin) : undefined,
    availableDays: time?.allowed_days || [],
    timeFrom: time?.allowed_time_ranges?.[0]?.start || undefined,
    timeTo: time?.allowed_time_ranges?.[0]?.end || undefined,
    ...shopifyRulesToForm(reward.redemptionRules?.shopify),
    ...wooRulesToForm(reward.redemptionRules?.woocommerce),
  };
}

export function couponFormValues(reward: LoyaltyReward): CouponFormValues {
  const value = reward.rewardValue ?? {};
  const rules = reward.redemptionRules;
  return {
    ...BLANK_COUPON,
    name: reward.name || "",
    description: reward.description || "",
    couponCode: value.code || "",
    couponDescription: value.description || "",
    discountType: value.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: Number(value.discountValue || 0),
    // A legacy coupon saved with 0 is one nobody can redeem; it opens showing 1 so the
    // merchant sees the correction before saving rather than after wondering why.
    stockQuantity: reward.stockQuantity || 1,
    perUserLimit: Number(rules?.quantity_restrictions?.max_redemptions_per_customer) || 1,
    validFrom: rules?.time_restrictions?.valid_from
      ? String(rules.time_restrictions.valid_from).slice(0, 10)
      : "",
    validTo: rules?.time_restrictions?.valid_until
      ? String(rules.time_restrictions.valid_until).slice(0, 10)
      : "",
    termsAndConditions: value.termsAndConditions || value.restrictions || "",
    minimumSpend: Number(rules?.spend_requirements?.minimum_spend) || 0,
    waTemplateId: reward.waTemplateId || undefined,
    tierIds: reward.availableForTiers || [],
    shopifyDiscountEnabled: !!rules?.shopify?.enabled,
    wooDiscountEnabled: !!rules?.woocommerce?.enabled,
  };
}

export function giftFormValues(reward: LoyaltyReward): GiftFormValues {
  return {
    ...BLANK_GIFT,
    name: reward.name || "",
    description: reward.description || "",
    giftQuantity: reward.stockQuantity || 1,
    estimatedValue: Number(reward.rewardValue?.estimatedValue || 0),
    restrictions: reward.rewardValue?.termsAndConditions || "",
    waTemplateId: reward.waTemplateId || undefined,
    tierIds: reward.availableForTiers || [],
  };
}

export function pointRewardPayload(data: PointRewardValues): LoyaltyRewardInput {
  const hasTime = !!(data.availableDays?.length || data.timeFrom || data.timeTo);
  return {
    name: data.name,
    description: data.description,
    rewardType: "point",
    pointsCost: data.pointsCost,
    rewardValue: {
      points: data.pointsCost,
      cashbackAmount: data.cashbackAmount || undefined,
      discountPercentage: data.discountPercentage || undefined,
      estimatedValue: data.estimatedValue || undefined,
      termsAndConditions: data.restrictions || undefined,
      restrictions: data.restrictions || undefined,
      rewardType: data.rewardType,
    },
    waTemplateId: data.waTemplateId || undefined,
    availableForTiers: data.tierIds ?? [],
    redemptionRules: {
      ...(data.minimumSpend ? { spend_requirements: { minimum_spend: data.minimumSpend } } : {}),
      ...(hasTime
        ? {
            time_restrictions: {
              ...(data.availableDays?.length ? { allowed_days: data.availableDays } : {}),
              ...(data.timeFrom || data.timeTo
                ? {
                    allowed_time_ranges: [
                      { start: data.timeFrom || "00:00", end: data.timeTo || "23:59" },
                    ],
                  }
                : {}),
            },
          }
        : {}),
      shopify: shopifyRulesFrom(data),
      woocommerce: wooRulesFrom(data),
    },
  };
}

export function couponPayload(data: CouponValues): LoyaltyRewardInput {
  return {
    name: data.name,
    description: data.description,
    rewardType: "coupon",
    pointsCost: 0,
    rewardValue: {
      // A synced coupon has no fixed code — each redemption generates its own, and storing
      // a stale one here would show up on the reward card as if customers could use it.
      code: data.shopifyDiscountEnabled || data.wooDiscountEnabled ? undefined : data.couponCode,
      description: data.couponDescription,
      discountType: data.discountType || undefined,
      discountValue: data.discountValue || undefined,
      termsAndConditions: data.termsAndConditions || undefined,
      restrictions: data.termsAndConditions || undefined,
    },
    stockQuantity: data.stockQuantity,
    waTemplateId: data.waTemplateId || undefined,
    availableForTiers: data.tierIds ?? [],
    redemptionRules: {
      ...(data.minimumSpend ? { spend_requirements: { minimum_spend: data.minimumSpend } } : {}),
      ...(data.perUserLimit
        ? { quantity_restrictions: { max_redemptions_per_customer: data.perUserLimit } }
        : {}),
      ...(data.validFrom || data.validTo
        ? {
            time_restrictions: {
              ...(data.validFrom ? { valid_from: new Date(data.validFrom).toISOString() } : {}),
              ...(data.validTo ? { valid_until: new Date(data.validTo).toISOString() } : {}),
            },
          }
        : {}),
      // Only the switch: the code's end date is Valid To, already in `time_restrictions`,
      // and a second deadline here could silently contradict it.
      shopify: shopifyRulesFrom({ shopifyDiscountEnabled: data.shopifyDiscountEnabled }),
      woocommerce: wooRulesFrom({ wooDiscountEnabled: data.wooDiscountEnabled }),
    },
  };
}

export function giftPayload(data: GiftValues): LoyaltyRewardInput {
  return {
    name: data.name,
    description: data.description,
    rewardType: "assigned",
    pointsCost: 0,
    rewardValue: {
      description: data.description || "",
      // `rewardType` names the dialect the giveback normaliser reads, so a gift can be costed.
      rewardType: "free-item",
      estimatedValue: data.estimatedValue || undefined,
      termsAndConditions: data.restrictions || undefined,
    },
    stockQuantity: data.giftQuantity,
    waTemplateId: data.waTemplateId || undefined,
    availableForTiers: data.tierIds ?? [],
    redemptionRules: {},
  };
}
