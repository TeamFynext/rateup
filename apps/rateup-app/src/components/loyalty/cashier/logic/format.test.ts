import { describe, expect, test } from "vitest";

import { formatMoney, formatNumber, formatPoints, singularPoints } from "./format";

describe("formatNumber", () => {
  test("groups thousands", () => {
    expect(formatNumber(1283)).toBe("1,283");
    expect(formatNumber(1283456)).toBe("1,283,456");
    expect(formatNumber(43)).toBe("43");
  });

  test("a non-number renders as zero rather than NaN", () => {
    expect(formatNumber(Number.NaN)).toBe("0");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("formatMoney", () => {
  test("whole amounts have no decimals, fractional ones have two", () => {
    // Locale-dependent placement, so assert the parts rather than the whole string.
    expect(formatMoney(500, "INR", "₹")).toMatch(/500/);
    expect(formatMoney(500, "INR", "₹")).not.toMatch(/500[.,]00/);
    expect(formatMoney(12.5, "INR", "₹")).toMatch(/12[.,]50/);
  });

  // Decimal columns arrive as strings, and `Number.isInteger("500")` is false — which is
  // what turned whole amounts into "₹500.00" before the coercion.
  test("a decimal that arrived as a string is still whole", () => {
    expect(formatMoney("500" as unknown as number, "INR", "₹")).not.toMatch(/500[.,]00/);
  });

  // The currency code is free text on the programme row, so an unrecognised one must fall
  // back rather than throw at the counter.
  test("an unknown currency code falls back to the symbol", () => {
    expect(formatMoney(1283, "NOT-A-CODE", "₹")).toBe("₹1,283");
  });
});

describe("points naming", () => {
  test("the unit is singular for one", () => {
    expect(singularPoints("Beans")).toBe("Bean");
    expect(singularPoints("Points")).toBe("Point");
    // A name that does not end in "s" is left alone.
    expect(singularPoints("Yen")).toBe("Yen");
    expect(formatPoints(1, "Beans")).toBe("1 Bean");
    expect(formatPoints(43, "Beans")).toBe("43 Beans");
    expect(formatPoints(-1, "Beans")).toBe("-1 Bean");
  });
});
