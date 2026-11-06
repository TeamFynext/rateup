import { describe, expect, test } from "vitest";

import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "../../../types/enums.js";
import { isLoyaltyFeedbackFlow, metaCategoriesFor } from "./flowCategories.js";

describe("metaCategoriesFor", () => {
  test("passes Meta's own categories through untouched", () => {
    expect(metaCategoriesFor(["SIGN_UP", "SURVEY"])).toEqual(["SIGN_UP", "SURVEY"]);
  });

  test("swaps the loyalty feedback category for SURVEY", () => {
    expect(metaCategoriesFor([LOYALTY_FEEDBACK_FLOW_CATEGORY])).toEqual(["SURVEY"]);
  });

  test("never sends the same Meta category twice", () => {
    expect(metaCategoriesFor(["SURVEY", LOYALTY_FEEDBACK_FLOW_CATEGORY, "SURVEY"])).toEqual([
      "SURVEY",
    ]);
  });

  test("an empty list stays empty", () => {
    expect(metaCategoriesFor([])).toEqual([]);
  });
});

describe("isLoyaltyFeedbackFlow", () => {
  test("keys on the stored category", () => {
    expect(isLoyaltyFeedbackFlow({ categories: ["SURVEY", LOYALTY_FEEDBACK_FLOW_CATEGORY] })).toBe(
      true,
    );
    expect(isLoyaltyFeedbackFlow({ categories: ["SURVEY"] })).toBe(false);
    expect(isLoyaltyFeedbackFlow({ categories: [] })).toBe(false);
  });
});
