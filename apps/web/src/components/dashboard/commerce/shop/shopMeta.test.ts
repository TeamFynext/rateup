import { describe, expect, it } from "vite-plus/test";

import { isRefundAmountValid, parseAmountInput } from "./shopMeta.ts";

describe("parseAmountInput", () => {
  it("reads a comma or a dot as the decimal mark", () => {
    expect(parseAmountInput("12,50")).toBe(12.5);
    expect(parseAmountInput(" 12.5 ")).toBe(12.5);
    expect(parseAmountInput("7")).toBe(7);
  });

  it("is null only when blank", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("  ")).toBeNull();
  });

  it("is NaN for anything that is not a plain amount", () => {
    for (const raw of ["1,000.50", "abc", "-5", "1.234", "1e3"]) {
      expect(parseAmountInput(raw)).toBeNaN();
    }
  });
});

describe("isRefundAmountValid", () => {
  it("allows blank (all of it) and amounts within the refundable total", () => {
    expect(isRefundAmountValid("", 20)).toBe(true);
    expect(isRefundAmountValid("12,50", 20)).toBe(true);
    expect(isRefundAmountValid("20", 20)).toBe(true);
  });

  it("refuses zero, too much and unreadable input", () => {
    expect(isRefundAmountValid("0", 20)).toBe(false);
    expect(isRefundAmountValid("20.01", 20)).toBe(false);
    expect(isRefundAmountValid("12;50", 20)).toBe(false);
  });
});
