import { describe, expect, test } from "vitest";
import { arrayEquals, parseArrayString } from "./array.js";

describe("arrayEquals", () => {
  test("matches identical lists", () => {
    expect(arrayEquals(["a", "b"], ["a", "b"])).toBe(true);
  });

  test("ignores order", () => {
    expect(arrayEquals(["a", "b"], ["b", "a"])).toBe(true);
  });

  test("matches two empty lists", () => {
    expect(arrayEquals([], [])).toBe(true);
  });

  test("rejects lists of different lengths", () => {
    expect(arrayEquals(["a"], ["a", "b"])).toBe(false);
  });

  test("rejects lists with different members", () => {
    expect(arrayEquals(["a", "b"], ["a", "c"])).toBe(false);
  });

  // NOTE: the check is "same length, and every member of `a` appears somewhere in `b`",
  // which duplicates defeat. These two cases are the same pair of lists in either
  // order, and they disagree — the comparison is not symmetric.
  test("wrongly reports a duplicate-bearing list as equal", () => {
    expect(arrayEquals(["a", "a"], ["a", "b"])).toBe(true);
  });

  test("gives the opposite answer when the same two lists are swapped", () => {
    expect(arrayEquals(["a", "b"], ["a", "a"])).toBe(false);
  });
});

describe("parseArrayString", () => {
  test("splits a comma separated string", () => {
    expect(parseArrayString("a,b,c")).toEqual(["a", "b", "c"]);
  });

  test("trims the space around each element", () => {
    expect(parseArrayString("a , b ,c ")).toEqual(["a", "b", "c"]);
  });

  test("returns a single-element list when there is no comma", () => {
    expect(parseArrayString("just-one")).toEqual(["just-one"]);
  });

  test.each([
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("returns an empty list for %s", (_name, input) => {
    expect(parseArrayString(input as any)).toEqual([]);
  });

  // A trailing comma leaves an empty final element rather than being ignored.
  test("keeps an empty element from a trailing comma", () => {
    expect(parseArrayString("a,b,")).toEqual(["a", "b", ""]);
  });
});
