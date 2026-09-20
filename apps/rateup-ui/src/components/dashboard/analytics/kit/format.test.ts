import { describe, expect, test } from "vitest";

import { formatDuration, formatPercent, percentChange, toNumber } from "./format.ts";

describe("toNumber", () => {
  test("reads numeric strings and rejects what is not a number", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber(null)).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber("abc")).toBeNull();
  });
});

describe("formatDuration", () => {
  test("shows the two largest units", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(200)).toBe("3m 20s");
    expect(formatDuration(7_500)).toBe("2h 5m");
    expect(formatDuration(3 * 86_400 + 4 * 3_600 + 59)).toBe("3d 4h");
  });

  test("drops an empty second unit", () => {
    expect(formatDuration(3_600)).toBe("1h");
    expect(formatDuration(120)).toBe("2m");
  });

  test("answers null when there is nothing to show", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration("n/a")).toBeNull();
  });

  test("accepts the string form Postgres numerics arrive in", () => {
    expect(formatDuration("61.4")).toBe("1m 1s");
  });
});

describe("formatPercent", () => {
  test("rounds without trailing zeros", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(undefined)).toBeNull();
  });
});

describe("percentChange", () => {
  test("is relative to the earlier figure", () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange("50", 100)).toBeCloseTo(-50);
  });

  test("has no answer without an earlier figure", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
  });
});
