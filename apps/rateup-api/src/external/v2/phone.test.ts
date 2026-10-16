import { describe, expect, test } from "vitest";

import { phoneSchema, toWirePhone } from "./phone.js";

describe("phoneSchema", () => {
  test.each([
    ["digits with the country code", "919876543210"],
    ["a JSON number", 919876543210],
    ["a leading +, spaces and a dash", "+91 98765-43210"],
    ["brackets and dots", "+1 (415) 555.2671"],
  ])("takes %s and hands on digits", (_, input) => {
    const out = phoneSchema.parse(input);
    expect(out).toMatch(/^\d+$/);
    expect(out).toBe(
      typeof input === "string" && input.startsWith("+1") ? "14155552671" : "919876543210",
    );
  });

  test.each([
    ["too short", "12345"],
    ["no country code", "9876543210"],
    ["letters", "91987654321O"],
    ["a + in the middle", "91+9876543210"],
    ["a negative number", -919876543210],
  ])("refuses %s", (_, input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});

describe("toWirePhone", () => {
  test.each([
    ["+919876543210", "919876543210"],
    ["919876543210", "919876543210"],
    ["+91 98765 43210", "919876543210"],
    ["", null],
    [null, null],
    [undefined, null],
  ])("%s → %s", (stored, wire) => {
    expect(toWirePhone(stored)).toBe(wire);
  });
});
