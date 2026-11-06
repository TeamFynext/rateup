import { describe, expect, test } from "vitest";
import { parseStringWithVariables } from "./template.js";

describe("parseStringWithVariables", () => {
  test("pulls out a single placeholder", () => {
    expect(parseStringWithVariables("Hello {{name}}")).toEqual(["name"]);
  });

  test("pulls out every placeholder in order", () => {
    expect(parseStringWithVariables("Hi {{1}}, your code is {{2}}")).toEqual(["1", "2"]);
  });

  test("returns an empty list when there is nothing to substitute", () => {
    expect(parseStringWithVariables("Just plain text")).toEqual([]);
  });

  test("returns an empty list for empty text", () => {
    expect(parseStringWithVariables("")).toEqual([]);
  });

  test("keeps a repeated placeholder each time it appears", () => {
    expect(parseStringWithVariables("{{a}} and {{a}}")).toEqual(["a", "a"]);
  });

  test("captures the name exactly as written, spaces included", () => {
    expect(parseStringWithVariables("{{ first name }}")).toEqual([" first name "]);
  });

  test("captures an empty name for an empty placeholder", () => {
    expect(parseStringWithVariables("{{}}")).toEqual([""]);
  });

  test("ignores a single brace pair", () => {
    expect(parseStringWithVariables("{name}")).toEqual([]);
  });

  // The match is non-greedy, so two placeholders on one line stay separate rather
  // than collapsing into one long capture.
  test("does not run two placeholders together", () => {
    expect(parseStringWithVariables("{{a}}{{b}}")).toEqual(["a", "b"]);
  });

  test("finds placeholders across multiple lines", () => {
    expect(parseStringWithVariables("Line one {{a}}\nLine two {{b}}")).toEqual(["a", "b"]);
  });
});
