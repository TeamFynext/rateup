import { describe, expect, test } from "vitest";

import { maskPhone } from "./maskPhone";

describe("maskPhone", () => {
  test("keeps the country code, the first two and the last five digits", () => {
    expect(maskPhone("919876541207")).toBe("+91 98••• 41207");
    expect(maskPhone("+91 98765 41207")).toBe("+91 98••• 41207");
  });

  test("a ten-digit local number has no country prefix", () => {
    expect(maskPhone("9876541207")).toBe("98••• 41207");
  });

  test("leaves something too short to mask alone", () => {
    expect(maskPhone("12345")).toBe("12345");
  });
});
