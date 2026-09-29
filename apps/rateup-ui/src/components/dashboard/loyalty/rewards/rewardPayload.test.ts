import { describe, expect, test } from "vitest";

import type { LoyaltyReward } from "@/backend/loyalty/reward.api";

import {
  BLANK_COUPON,
  BLANK_GIFT,
  BLANK_POINT_REWARD,
  couponFormValues,
  couponPayload,
  giftFormValues,
  giftPayload,
  pointRewardFormValues,
  pointRewardPayload,
} from "./rewardPayload.ts";
import { couponSchema, giftSchema, pointRewardSchema } from "./schemas.ts";

const reward = (over: Partial<LoyaltyReward> = {}): LoyaltyReward => ({
  id: "r1",
  programId: "p1",
  name: "Free coffee",
  description: "Any size",
  rewardType: "point",
  pointsCost: 200,
  rewardValue: {},
  status: "ACTIVE",
  stockRedeemed: 0,
  availableForTiers: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...over,
});

describe("pointRewardFormValues", () => {
  test("a stored subtype is kept", () => {
    const values = pointRewardFormValues(
      reward({ rewardValue: { rewardType: "free-service", estimatedValue: 5 } }),
    );
    expect(values.rewardType).toBe("free-service");
  });

  test("a legacy row without a subtype is read off its amounts", () => {
    expect(
      pointRewardFormValues(reward({ rewardValue: { discountPercentage: 10 } })).rewardType,
    ).toBe("percentage-discount");
    expect(pointRewardFormValues(reward({ rewardValue: { estimatedValue: 4 } })).rewardType).toBe(
      "free-item",
    );
    expect(pointRewardFormValues(reward({ rewardValue: {} })).rewardType).toBe("fixed-discount");
  });

  test("redemption rules come back as form fields", () => {
    const values = pointRewardFormValues(
      reward({
        availableForTiers: ["gold"],
        redemptionRules: {
          spend_requirements: { minimum_spend: 300 },
          time_restrictions: {
            allowed_days: ["monday"],
            allowed_time_ranges: [{ start: "09:00", end: "12:00" }],
          },
          shopify: { enabled: true, valid_for_days: 30 },
        },
      }),
    );
    expect(values).toMatchObject({
      tierIds: ["gold"],
      minimumSpend: 300,
      availableDays: ["monday"],
      timeFrom: "09:00",
      timeTo: "12:00",
      shopifyDiscountEnabled: true,
      shopifyValidForDays: 30,
    });
  });
});

describe("pointRewardPayload", () => {
  test("round-trips through the form", () => {
    const original = reward({
      rewardValue: { rewardType: "fixed-discount", cashbackAmount: 50 },
      availableForTiers: ["gold"],
      redemptionRules: { spend_requirements: { minimum_spend: 300 } },
    });
    const payload = pointRewardPayload(pointRewardSchema.parse(pointRewardFormValues(original)));
    expect(payload).toMatchObject({
      rewardType: "point",
      pointsCost: 200,
      availableForTiers: ["gold"],
      rewardValue: { points: 200, cashbackAmount: 50, rewardType: "fixed-discount" },
      redemptionRules: { spend_requirements: { minimum_spend: 300 }, shopify: { enabled: false } },
    });
    expect(payload.redemptionRules?.time_restrictions).toBeUndefined();
  });

  test("a time range with one end open is filled to the whole day", () => {
    const payload = pointRewardPayload(
      pointRewardSchema.parse({ ...BLANK_POINT_REWARD, name: "x", timeFrom: "17:00" }),
    );
    expect(payload.redemptionRules?.time_restrictions?.allowed_time_ranges).toEqual([
      { start: "17:00", end: "23:59" },
    ]);
  });
});

describe("coupons", () => {
  test("a legacy coupon with no stock opens at one", () => {
    const values = couponFormValues(reward({ rewardType: "coupon", stockQuantity: 0 }));
    expect(values.stockQuantity).toBe(1);
  });

  test("a Shopify-synced coupon stores no fixed code", () => {
    const payload = couponPayload(
      couponSchema.parse({
        ...BLANK_COUPON,
        name: "10 off",
        couponCode: "STALE",
        shopifyDiscountEnabled: true,
      }),
    );
    expect(payload.rewardValue.code).toBeUndefined();
    expect(payload.redemptionRules?.shopify).toEqual({ enabled: true });
  });

  test("a WooCommerce-synced coupon stores no fixed code, and round-trips its switch", () => {
    const payload = couponPayload(
      couponSchema.parse({
        ...BLANK_COUPON,
        name: "10 off",
        couponCode: "",
        wooDiscountEnabled: true,
      }),
    );
    expect(payload.rewardValue.code).toBeUndefined();
    expect(payload.redemptionRules?.woocommerce).toEqual({ enabled: true });
    expect(payload.redemptionRules?.shopify).toEqual({ enabled: false });
    expect(
      couponFormValues(reward({ rewardType: "coupon", redemptionRules: payload.redemptionRules }))
        .wooDiscountEnabled,
    ).toBe(true);
  });

  test("validity dates round-trip as date keys", () => {
    const values = couponFormValues(
      reward({
        rewardType: "coupon",
        redemptionRules: { time_restrictions: { valid_until: "2026-12-31T00:00:00.000Z" } },
      }),
    );
    expect(values.validTo).toBe("2026-12-31");
    expect(values.validFrom).toBe("");
  });
});

describe("gifts", () => {
  test("round-trip keeps the quantity and the value", () => {
    const original = reward({
      rewardType: "assigned",
      pointsCost: 0,
      stockQuantity: 20,
      rewardValue: { estimatedValue: 400, termsAndConditions: "In store only" },
    });
    const payload = giftPayload(giftSchema.parse(giftFormValues(original)));
    expect(payload).toMatchObject({
      rewardType: "assigned",
      stockQuantity: 20,
      rewardValue: {
        rewardType: "free-item",
        estimatedValue: 400,
        termsAndConditions: "In store only",
      },
    });
  });

  test("the blank gift is valid once named", () => {
    expect(giftSchema.safeParse({ ...BLANK_GIFT, name: "Mug" }).success).toBe(true);
  });
});
