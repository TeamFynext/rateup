import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  daysUntil,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  humanize,
  isEffectivelyNever,
  monthLabel,
  percentChange,
  pluralize,
} from "./format";

describe("numbers", () => {
  test("formatNumber groups the Indian way", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });

  test("pluralize picks the word and formats the count", () => {
    expect(pluralize(1, "org")).toBe("1 org");
    expect(pluralize(2, "org")).toBe("2 orgs");
    expect(pluralize(0, "person", "people")).toBe("0 people");
  });

  test("percentChange has no answer without a base", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe("formatMoney", () => {
  test("formats each gateway currency in its own style", () => {
    expect(formatMoney(1999, "INR")).toBe("₹1,999.00");
    expect(formatMoney(19, "usd")).toBe("$19.00");
  });

  test("defaults to rupees and shows a dash for nothing", () => {
    expect(formatMoney(5, null)).toBe("₹5.00");
    expect(formatMoney(null, "USD")).toBe("—");
    expect(formatMoney(undefined, "USD")).toBe("—");
  });

  test("falls back to the code for a currency Intl does not know", () => {
    expect(formatMoney(10, "NOPE1")).toBe("10 NOPE1");
  });
});

describe("dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  test("formats or dashes", () => {
    expect(formatDate("2026-09-22T10:00:00Z")).toBe("22 Sep 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  test("daysUntil counts whole days and goes negative once passed", () => {
    expect(daysUntil("2026-10-20T12:00:00Z")).toBe(3);
    expect(daysUntil("2026-10-14T12:00:00Z")).toBe(-3);
    expect(daysUntil(null)).toBeNull();
  });

  test("a date a century out means the plan never expires", () => {
    expect(isEffectivelyNever("2126-10-17T00:00:00Z")).toBe(true);
    expect(isEffectivelyNever("2027-10-17T00:00:00Z")).toBe(false);
    expect(isEffectivelyNever(null)).toBe(false);
  });

  test("monthLabel adds the year only when asked", () => {
    expect(monthLabel("2026-09-01")).toBe("Sep");
    expect(monthLabel("2026-09-01", true)).toBe("Sep 26");
  });
});

test("humanize turns enum values into words", () => {
  expect(humanize("INACTIVE")).toBe("Inactive");
  expect(humanize("one_time")).toBe("One time");
  expect(humanize(null)).toBe("—");
});
