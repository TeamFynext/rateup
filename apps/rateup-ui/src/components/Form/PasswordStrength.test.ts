import { describe, expect, test } from "vitest";

import { passwordScore } from "./PasswordStrength.tsx";
import { isPasswordValid } from "./signup/shared.tsx";

describe("passwordScore", () => {
  test.each([
    ["Abcdefghijkl", "long, mixed case, no number or symbol"],
    ["abcdefgh1!xyz", "long, number and symbol, no upper case"],
    ["ABCDEFGH1!XYZ", "long, number and symbol, no lower case"],
    ["Abcdefghij1k", "long, mixed case and a number, no symbol"],
  ])("caps a rejected password at Fair: %s (%s)", (password) => {
    expect(isPasswordValid(password)).toBe(false);
    expect(passwordScore(password)).toBeLessThanOrEqual(2);
  });

  test("reads an accepted 8-character password as Good", () => {
    expect(isPasswordValid("Abcdef1!")).toBe(true);
    expect(passwordScore("Abcdef1!")).toBe(3);
  });

  test("reads an accepted 12+ character password as Strong", () => {
    expect(passwordScore("Rateup@2026x")).toBe(4);
  });

  test("never reads anything typed as empty", () => {
    expect(passwordScore("a")).toBe(1);
    expect(passwordScore("")).toBe(0);
  });
});
