import { describe, expect, test } from "vitest";

import { shopifyRulesFrom, shopifyRulesToForm } from "./shopifyRules.ts";

describe("shopifyRulesFrom", () => {
  test("switching the sync off clears the rule instead of omitting it", () => {
    expect(shopifyRulesFrom({ shopifyDiscountEnabled: false, shopifyValidForDays: 30 })).toEqual({
      enabled: false,
    });
    expect(shopifyRulesFrom({})).toEqual({ enabled: false });
  });

  test("an expiry is only carried while the sync is on", () => {
    expect(shopifyRulesFrom({ shopifyDiscountEnabled: true, shopifyValidForDays: 30 })).toEqual({
      enabled: true,
      valid_for_days: 30,
    });
    expect(shopifyRulesFrom({ shopifyDiscountEnabled: true })).toEqual({ enabled: true });
  });
});

describe("shopifyRulesToForm", () => {
  test("a reward that never opted in edits as off", () => {
    expect(shopifyRulesToForm(undefined)).toEqual({
      shopifyDiscountEnabled: false,
      shopifyValidForDays: undefined,
    });
  });

  test("round-trips what the form saved", () => {
    const saved = shopifyRulesFrom({ shopifyDiscountEnabled: true, shopifyValidForDays: 14 });
    expect(shopifyRulesToForm(saved)).toEqual({
      shopifyDiscountEnabled: true,
      shopifyValidForDays: 14,
    });
  });
});
