import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));

const { checkoutPhone } = await import("./checkout.service.js");

describe("a number typed on the checkout page", () => {
  test("is kept once complete, as E.164", () => {
    expect(checkoutPhone("+91 98765 43210")).toBe("+919876543210");
  });

  test("is ignored while still being typed", () => {
    expect(checkoutPhone("+919")).toBeUndefined();
    expect(checkoutPhone("+91 98765")).toBeUndefined();
    expect(checkoutPhone("")).toBeUndefined();
    expect(checkoutPhone(null)).toBeUndefined();
  });
});
