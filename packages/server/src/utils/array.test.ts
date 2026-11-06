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

  // Sorted-copy comparison, so duplicates count and the answer no longer depends on
  // which list is named first.
  test("rejects a duplicate-bearing list", () => {
    expect(arrayEquals(["a", "a"], ["a", "b"])).toBe(false);
  });

  test("gives the same answer when the two lists are swapped", () => {
    expect(arrayEquals(["a", "b"], ["a", "a"])).toBe(false);
  });

  test("matches lists holding the same duplicate the same number of times", () => {
    expect(arrayEquals(["a", "a", "b"], ["b", "a", "a"])).toBe(true);
  });

  test("does not mutate the lists it is given", () => {
    const a = ["b", "a"];
    const b = ["a", "b"];

    arrayEquals(a, b);

    expect(a).toEqual(["b", "a"]);
    expect(b).toEqual(["a", "b"]);
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

  // Empties are dropped: the sole caller turns each element into a RegExp for the CORS
  // whitelist, where `new RegExp("")` would have matched every origin.
  test("drops the empty element left by a trailing comma", () => {
    expect(parseArrayString("a,b,")).toEqual(["a", "b"]);
  });

  test("drops elements that are only whitespace", () => {
    expect(parseArrayString("a, ,b")).toEqual(["a", "b"]);
  });

  test("returns an empty list for a string of only commas", () => {
    expect(parseArrayString(",,")).toEqual([]);
  });
});
