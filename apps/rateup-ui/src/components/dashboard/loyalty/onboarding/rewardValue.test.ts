import { describe, expect, it } from "vitest";

import { rewardWorth } from "../giveback/calculateGiveback";
import {
  asRewardValueType,
  blankRewardValue,
  convertRewardValue,
  readAmount,
  readCap,
  readItemName,
  readItemValue,
  readPercentage,
  readQuantity,
  readRewardValueType,
  REWARD_VALUE_TYPES,
  type RewardValueType,
} from "./rewardValue";

describe("readRewardValueType", () => {
  it.each([
    [{ type: "free_item", item_name: "Coffee" }, "free_item"],
    [{ type: "discount_percentage", percentage: 10 }, "discount_percentage"],
    [{ type: "discount_fixed", amount: 50 }, "discount_fixed"],
  ])("reads dialect A %o", (value, expected) => {
    expect(readRewardValueType(value)).toBe(expected);
  });

  it.each([
    [{ rewardType: "free-item", estimatedValue: 150 }, "free_item"],
    [{ rewardType: "free-service", estimatedValue: 150 }, "free_item"],
    [{ rewardType: "percentage-discount", discountPercentage: 20 }, "discount_percentage"],
    [{ rewardType: "fixed-discount", cashbackAmount: 10 }, "discount_fixed"],
  ])("reads dialect B %o", (value, expected) => {
    expect(readRewardValueType(value)).toBe(expected);
  });

  it.each([
    [{ discountType: "percentage", discountValue: 10 }, "discount_percentage"],
    [{ discountType: "fixed", discountValue: 10 }, "discount_fixed"],
  ])("reads a coupon blob %o", (value, expected) => {
    expect(readRewardValueType(value)).toBe(expected);
  });

  it.each([null, undefined, {}, [], "free_item", 42, { type: "mystery" }])(
    "returns null for %p, so an unrecognised row is left alone",
    (value) => {
      expect(readRewardValueType(value)).toBeNull();
    },
  );
});

describe("readers tolerate both dialects", () => {
  it("reads a percentage from either key", () => {
    expect(readPercentage({ percentage: 10 })).toBe(10);
    expect(readPercentage({ discountPercentage: 20 })).toBe(20);
    expect(readPercentage({ discountValue: 30 })).toBe(30);
    expect(readPercentage({})).toBeUndefined();
  });

  it("reads an amount from either key", () => {
    expect(readAmount({ amount: 50 })).toBe(50);
    expect(readAmount({ cashbackAmount: 60 })).toBe(60);
    expect(readAmount({})).toBeUndefined();
  });

  it("reads an item value from either key", () => {
    expect(readItemValue({ item_value: 150 })).toBe(150);
    expect(readItemValue({ estimatedValue: 200 })).toBe(200);
  });

  it("reads numbers held as strings — JSON columns do that", () => {
    expect(readAmount({ amount: "50" })).toBe(50);
    expect(readItemValue({ item_value: "150" })).toBe(150);
  });

  it("rejects negatives and junk rather than passing them on", () => {
    expect(readAmount({ amount: -5 })).toBeUndefined();
    expect(readAmount({ amount: "abc" })).toBeUndefined();
    expect(readPercentage({ percentage: Number.NaN })).toBeUndefined();
  });

  it("defaults a missing or nonsense quantity to 1", () => {
    expect(readQuantity({ quantity: 2 })).toBe(2);
    expect(readQuantity({})).toBe(1);
    expect(readQuantity({ quantity: 0 })).toBe(1);
    expect(readQuantity(null)).toBe(1);
  });

  it("treats an absent cap as null, not undefined", () => {
    expect(readCap({ max_discount_amount: 100 })).toBe(100);
    expect(readCap({})).toBeNull();
    expect(readCap({ max_discount_amount: null })).toBeNull();
  });

  it("reads an item name, or empty string", () => {
    expect(readItemName({ item_name: "Coffee" })).toBe("Coffee");
    expect(readItemName({})).toBe("");
    expect(readItemName(null)).toBe("");
  });
});

describe("asRewardValueType", () => {
  it.each(REWARD_VALUE_TYPES)("accepts %s", (type) => {
    expect(asRewardValueType(type, "free_item")).toBe(type);
  });

  it.each([null, "", "nonsense"])("falls back to the current type for %p", (next) => {
    expect(asRewardValueType(next, "discount_fixed")).toBe("discount_fixed");
  });
});

describe("blankRewardValue", () => {
  it("returns a shape the per-type fields can render immediately", () => {
    expect(blankRewardValue("free_item")).toEqual({
      type: "free_item",
      item_name: "",
      quantity: 1,
    });
    expect(blankRewardValue("discount_fixed")).toEqual({ type: "discount_fixed" });
    expect(blankRewardValue("discount_percentage")).toEqual({
      type: "discount_percentage",
      max_discount_amount: null,
    });
  });

  it.each(REWARD_VALUE_TYPES)("round-trips through readRewardValueType for %s", (type) => {
    expect(readRewardValueType(blankRewardValue(type))).toBe(type);
  });
});

describe("convertRewardValue", () => {
  const AOV = 250;

  it.each([
    ["free_item", { type: "free_item", item_name: "Coffee", item_value: 150, quantity: 1 }],
    ["discount_fixed", { type: "discount_fixed", amount: 150 }],
    [
      "discount_percentage",
      { type: "discount_percentage", percentage: 60, max_discount_amount: null },
    ],
  ])("preserves worth when converting from %s to every other type", (_from, value) => {
    const before = rewardWorth(value, AOV).worth;
    expect(before).not.toBeNull();

    for (const next of REWARD_VALUE_TYPES) {
      const converted = convertRewardValue(value, next, AOV);
      expect(readRewardValueType(converted)).toBe(next);

      const after = rewardWorth(converted, AOV).worth;
      expect(after).not.toBeNull();
      // Within rounding: roundNice keeps two significant figures, percentages are integers.
      expect(Math.abs((after ?? 0) - (before ?? 0)) / (before ?? 1)).toBeLessThanOrEqual(0.12);
    }
  });

  it("carries a free item's worth into a cash amount", () => {
    expect(
      convertRewardValue(
        { type: "free_item", item_name: "Coffee", item_value: 150, quantity: 1 },
        "discount_fixed",
        AOV,
      ),
    ).toEqual({ type: "discount_fixed", amount: 150 });
  });

  it("turns a worth into a percentage of a typical order", () => {
    // 150 of value against a 250 order is 60%.
    expect(
      convertRewardValue({ type: "discount_fixed", amount: 150 }, "discount_percentage", AOV),
    ).toEqual({ type: "discount_percentage", percentage: 60, max_discount_amount: null });
  });

  it("clamps a percentage to 100 rather than emitting nonsense", () => {
    expect(
      convertRewardValue({ type: "discount_fixed", amount: 5000 }, "discount_percentage", AOV),
    ).toEqual({ type: "discount_percentage", percentage: 100, max_discount_amount: null });
  });

  it("keeps the existing percentage when there is no order value to derive one from", () => {
    expect(
      convertRewardValue(
        { type: "discount_percentage", percentage: 15, max_discount_amount: null },
        "discount_percentage",
        null,
      ),
    ).toEqual({ type: "discount_percentage", percentage: 15, max_discount_amount: null });
  });

  it("leaves the value empty rather than inventing one when worth is underivable", () => {
    const converted = convertRewardValue(
      { type: "discount_percentage", percentage: 10, max_discount_amount: null },
      "discount_fixed",
      null,
    );
    expect(converted).toEqual({ type: "discount_fixed", amount: undefined });
  });

  it("preserves the item name and quantity across a free_item edit", () => {
    expect(
      convertRewardValue(
        { type: "free_item", item_name: "Coffee", item_value: 150, quantity: 2 },
        "free_item",
        AOV,
      ),
    ).toEqual({ type: "free_item", item_name: "Coffee", item_value: 300, quantity: 2 });
  });

  it("preserves an existing cap when staying on a percentage", () => {
    const converted = convertRewardValue(
      { type: "discount_percentage", percentage: 20, max_discount_amount: 100 },
      "discount_percentage",
      1000,
    );
    expect(readCap(converted)).toBe(100);
  });

  it("migrates a dialect-B row to dialect A", () => {
    const converted = convertRewardValue(
      { rewardType: "percentage-discount", discountPercentage: 20 },
      "discount_fixed",
      AOV,
    );
    expect(converted).toEqual({ type: "discount_fixed", amount: 50 });
  });

  it("emits keys in a stable order — the giveback panel memoises on JSON.stringify", () => {
    const a = convertRewardValue({ type: "discount_fixed", amount: 10 }, "free_item", AOV);
    const b = convertRewardValue({ amount: 10, type: "discount_fixed" }, "free_item", AOV);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it.each([null, undefined, {}, "junk"])("survives %p as the current value", (value) => {
    for (const next of REWARD_VALUE_TYPES) {
      const converted = convertRewardValue(value, next as RewardValueType, AOV);
      expect(readRewardValueType(converted)).toBe(next);
    }
  });
});
