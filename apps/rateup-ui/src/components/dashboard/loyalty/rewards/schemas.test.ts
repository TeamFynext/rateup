import { describe, expect, test } from "vitest";

import { couponSchema } from "./schemas.ts";

const coupon = (over: Record<string, unknown> = {}) => ({
  name: "20% off",
  discountType: "percentage" as const,
  discountValue: 20,
  ...over,
});

describe("couponSchema", () => {
  test("an ordinary coupon still needs the code customers type", () => {
    const result = couponSchema.safeParse(coupon({ couponCode: "" }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["couponCode"],
      message: "Coupon code is required",
    });
  });

  test("whitespace is not a code", () => {
    expect(couponSchema.safeParse(coupon({ couponCode: "   " })).success).toBe(false);
  });

  test("zero redemptions is rejected — it would be a coupon nobody can redeem", () => {
    const result = couponSchema.safeParse(coupon({ couponCode: "SAVE20", stockQuantity: 0 }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["stockQuantity"],
      message: "Allow at least one redemption",
    });
  });

  test("one redemption is allowed", () => {
    expect(couponSchema.safeParse(coupon({ couponCode: "SAVE20", stockQuantity: 1 })).success).toBe(
      true,
    );
  });

  test("a Shopify-synced coupon needs none — each redemption generates its own", () => {
    expect(
      couponSchema.safeParse(coupon({ couponCode: "", shopifyDiscountEnabled: true })).success,
    ).toBe(true);
  });
});
