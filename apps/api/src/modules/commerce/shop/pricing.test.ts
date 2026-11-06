import { describe, expect, test } from "vitest";

import { discountOnGoods, priceOrder, shippingFor, type PricedLine } from "./pricing.js";

const line = (
  unitPrice: number,
  quantity: number,
  extra: Partial<PricedLine> = {},
): PricedLine => ({
  variantId: null,
  productId: null,
  collectionIds: [],
  unitPrice,
  quantity,
  ...extra,
});
const ALL = { appliesTo: "ALL" as const, collectionIds: [], productIds: [] };

describe("priceOrder", () => {
  test("adds lines and shipping with no discount or tax", () => {
    expect(priceOrder({ lines: [line(24, 2), line(32, 1)], shipping: 6 })).toEqual({
      subtotal: 80,
      discountTotal: 0,
      pointsDiscount: 0,
      shippingTotal: 6,
      taxTotal: 0,
      total: 86,
    });
  });

  test("percentage discount comes off goods, then points, then shipping is added", () => {
    const r = priceOrder({
      lines: [line(24, 1), line(32, 1)],
      discount: { rule: { type: "PERCENTAGE", value: 15 }, scope: ALL },
      pointsValue: 4,
      shipping: 6,
    });
    expect(r.discountTotal).toBe(8.4);
    expect(r.pointsDiscount).toBe(4);
    expect(r.total).toBe(49.6);
  });

  test("points never take goods below zero", () => {
    const r = priceOrder({ lines: [line(10, 1)], pointsValue: 50, shipping: 5 });
    expect(r.pointsDiscount).toBe(10);
    expect(r.total).toBe(5);
  });

  test("free shipping saves the shipping, capped", () => {
    const r = priceOrder({
      lines: [line(40, 1)],
      discount: { rule: { type: "FREE_SHIPPING", cap: 4 }, scope: ALL },
      shipping: 6,
    });
    expect(r.shippingTotal).toBe(6);
    expect(r.discountTotal).toBe(4);
    expect(r.total).toBe(42);
  });

  test("inclusive tax is extracted, exclusive tax is added", () => {
    const inclusive = priceOrder({ lines: [line(108, 1)], taxRate: 8, pricesIncludeTax: true });
    expect(inclusive.taxTotal).toBe(8);
    expect(inclusive.total).toBe(108);
    const exclusive = priceOrder({ lines: [line(100, 1)], taxRate: 8, pricesIncludeTax: false });
    expect(exclusive.taxTotal).toBe(8);
    expect(exclusive.total).toBe(108);
  });
});

test("an extra percent comes off the goods after the coupon, not off shipping or tax", () => {
  const r = priceOrder({
    lines: [line(100, 1)],
    discount: { rule: { type: "FIXED", value: 10 }, scope: ALL },
    extraDiscountPct: 10,
    shipping: 10,
    taxRate: 10,
    pricesIncludeTax: false,
  });
  // 100 − 10 coupon = 90, −10% = 81, + 10 shipping = 91, + 9.10 tax
  expect(r.discountTotal).toBe(19);
  expect(r.taxTotal).toBe(9.1);
  expect(r.total).toBe(100.1);
});

describe("discountOnGoods", () => {
  test("a fixed discount never exceeds what it applies to", () => {
    expect(discountOnGoods([line(5, 1)], { type: "FIXED", value: 10 }, ALL)).toBe(5);
  });

  test("scope limits a discount to products in a collection", () => {
    const lines = [line(24, 1, { collectionIds: ["candles"] }), line(32, 1)];
    const scope = { appliesTo: "COLLECTIONS" as const, collectionIds: ["candles"], productIds: [] };
    expect(discountOnGoods(lines, { type: "PERCENTAGE", value: 15 }, scope)).toBe(3.6);
  });

  test("buy 2 get 1 frees the cheapest unit of each group of three", () => {
    const lines = [line(10, 2), line(4, 1), line(8, 3)];
    // units 4, 8, 8, 8, 10, 10 → two groups of three → the two cheapest are free
    expect(discountOnGoods(lines, { type: "BUY_X_GET_Y", buyQty: 2, getQty: 1 }, ALL)).toBe(12);
  });
});

test("shippingFor is free over the threshold", () => {
  expect(shippingFor({ price: 6, freeOver: 75 }, 80)).toBe(0);
  expect(shippingFor({ price: 6, freeOver: 75 }, 74.99)).toBe(6);
  expect(shippingFor({ price: 6, freeOver: null }, 500)).toBe(6);
});
