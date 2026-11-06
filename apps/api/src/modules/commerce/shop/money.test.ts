import { describe, expect, test } from "vite-plus/test";

import {
  currencyDecimals,
  formatMoney,
  fromMinorUnits,
  isCurrencyCode,
  toMinorUnits,
} from "./money.js";

describe("minor units", () => {
  test.each([
    ["USD", 24.5, 2450],
    ["EUR", 19.99, 1999],
    ["JPY", 2450, 2450],
    ["KWD", 12.34, 12340],
    ["BHD", 5.5, 5500],
  ])("%s round-trips", (currency, major, minor) => {
    expect(toMinorUnits(major, currency)).toBe(minor);
    expect(fromMinorUnits(minor, currency)).toBe(major);
  });

  test("three-decimal amounts end in 0, as Stripe requires", () => {
    expect(toMinorUnits(1.2345, "kwd") % 10).toBe(0);
    expect(toMinorUnits(0.01, "OMR")).toBe(10);
  });

  test("decimals per currency, whatever the case", () => {
    expect(currencyDecimals("jpy")).toBe(0);
    expect(currencyDecimals("KWD")).toBe(3);
    expect(currencyDecimals("usd")).toBe(2);
  });
});

describe("formatMoney", () => {
  test("uses the currency's own symbol and decimals", () => {
    expect(formatMoney(24.5, "USD")).toBe("$24.50");
    expect(formatMoney(2450, "JPY")).toBe("¥2,450");
    expect(formatMoney(12.34, "KWD")).toMatch(/^KWD\s12\.340$/);
  });

  test("falls back to the code when the runtime can't format it", () => {
    expect(formatMoney(5, "not-a-code")).toBe("not-a-code 5");
  });
});

test("only known ISO codes are accepted for a store", () => {
  expect(isCurrencyCode("KWD")).toBe(true);
  expect(isCurrencyCode("ABC")).toBe(false);
  expect(isCurrencyCode("usd")).toBe(false);
});
