import { describe, expect, test } from "vitest";

import { CASHIER_STEPS, parseStep, stepBack, stepIsReachable } from "./cashier.steps";

describe("parseStep", () => {
  test("accepts a step, rejects anything else", () => {
    expect(parseStep("purchase")).toBe("purchase");
    // What a later build could have written into storage.
    expect(parseStep("split-bill")).toBeNull();
    expect(parseStep(undefined)).toBeNull();
    expect(parseStep(7)).toBeNull();
  });
});

describe("stepBack", () => {
  // Android's back button has to walk the step graph, not the navigation stack — otherwise
  // it leaves the tab from the middle of a transaction.
  test("an action returns to the customer, the customer to the search", () => {
    expect(stepBack("purchase")).toBe("customer");
    expect(stepBack("redeem")).toBe("customer");
    expect(stepBack("gift")).toBe("customer");
    expect(stepBack("customer")).toBe("search");
    expect(stepBack("new")).toBe("search");
    expect(stepBack("contacts")).toBe("search");
  });

  // The scanner is reached from the search with nobody open, so back is the search too.
  test("the scanner returns to the search", () => {
    expect(stepBack("scan")).toBe("search");
  });

  // The coupon flow is reachable with nobody open, so it goes back to the search rather
  // than to a customer that may not exist.
  test("the coupon form returns to the search", () => {
    expect(stepBack("coupon")).toBe("search");
  });

  test("the search hands the gesture back to the navigator", () => {
    expect(stepBack("search")).toBeNull();
  });

  test("every step says where back goes", () => {
    for (const step of CASHIER_STEPS) {
      if (step === "search") continue;
      expect(CASHIER_STEPS).toContain(stepBack(step));
    }
  });
});

describe("stepIsReachable", () => {
  // A cold start can restore `purchase` with no phone — the store must not render a
  // customer action against nobody.
  test("a customer action needs a customer", () => {
    expect(stepIsReachable("purchase", null)).toBe(false);
    expect(stepIsReachable("purchase", "919876541207")).toBe(true);
  });

  test("search, scan, register, contacts and the coupon form stand alone", () => {
    for (const step of ["search", "scan", "new", "contacts", "coupon"] as const) {
      expect(stepIsReachable(step, null)).toBe(true);
    }
  });
});
