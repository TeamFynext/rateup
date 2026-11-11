import { describe, expect, test } from "vite-plus/test";

import { normalizePricingCategory, normalizePricingModel } from "./pricing.utils.js";

describe("normalizePricingCategory", () => {
  test("uppercases what Meta actually sends", () => {
    // Captured from a live v25.0 status webhook: `"category": "service"`.
    expect(normalizePricingCategory("service")).toBe("SERVICE");
    expect(normalizePricingCategory("marketing")).toBe("MARKETING");
    expect(normalizePricingCategory("utility")).toBe("UTILITY");
    expect(normalizePricingCategory("authentication")).toBe("AUTHENTICATION");
  });

  test("accepts an already-uppercase value", () => {
    expect(normalizePricingCategory("MARKETING")).toBe("MARKETING");
  });

  test("folds Meta's priced variants into their family", () => {
    expect(normalizePricingCategory("marketing_lite")).toBe("MARKETING");
    expect(normalizePricingCategory("authentication_international")).toBe("AUTHENTICATION");
  });

  test("returns null for a category Meta has not shipped yet, rather than throwing", () => {
    // This runs inside a Kafka batch: throwing here would fail the whole batch and
    // eventually DLQ real status updates over a field nothing depends on.
    expect(normalizePricingCategory("some_future_category")).toBeNull();
  });

  test("returns null for absent values", () => {
    expect(normalizePricingCategory(undefined)).toBeNull();
    expect(normalizePricingCategory(null)).toBeNull();
    expect(normalizePricingCategory("")).toBeNull();
  });
});

describe("normalizePricingModel", () => {
  test("maps the per-message model Meta reports today", () => {
    expect(normalizePricingModel("PMP")).toBe("PMP");
  });

  test("still maps the legacy conversation-based model", () => {
    expect(normalizePricingModel("CBP")).toBe("CBP");
  });

  test("returns null for anything else", () => {
    expect(normalizePricingModel("NEW_MODEL")).toBeNull();
    expect(normalizePricingModel(undefined)).toBeNull();
  });
});
