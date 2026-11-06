import { describe, expect, test } from "vitest";

import { dialCode, splitPhone, toInternationalDigits } from "./phoneField";

describe("phone field helpers", () => {
  test("splits a stored number into country and national part", () => {
    expect(splitPhone("919188346187")).toEqual({ country: "IN", national: "9188346187" });
    expect(splitPhone("+442079460958")).toEqual({ country: "GB", national: "2079460958" });
    expect(splitPhone(null)).toEqual({ country: "IN", national: "" });
  });

  test("checks the number against the picked country", () => {
    expect(toInternationalDigits("IN", "91883 46187")).toBe("919188346187");
    expect(toInternationalDigits("IN", "12345")).toBeNull();
    expect(toInternationalDigits("IN", "")).toBeNull();
  });

  test("a pasted international number wins over the picked country", () => {
    expect(toInternationalDigits("IN", "+44 20 7946 0958")).toBe("442079460958");
  });

  test("dialling codes come out clean for NANP countries", () => {
    expect(dialCode("AG")).toBe("+1");
    expect(dialCode("IN")).toBe("+91");
  });
});
