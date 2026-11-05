import { describe, expect, test } from "vitest";

import { planIdentityChanges } from "./identityChanges.ts";

const saved = [
  { id: "a", value: "919188346187", isPrimary: true },
  { id: "b", value: "919000000001", isPrimary: false },
];

describe("planIdentityChanges", () => {
  test("an untouched list changes nothing", () => {
    expect(
      planIdentityChanges("PHONE", saved, [
        { id: "a", value: "+91 91883 46187" },
        { id: "b", value: "+919000000001" },
      ]),
    ).toEqual({ add: [], update: [], remove: [], main: null });
  });

  test("moving the second number to the top makes it the main one", () => {
    expect(
      planIdentityChanges("PHONE", saved, [
        { id: "b", value: "+919000000001" },
        { id: "a", value: "+919188346187" },
      ]).main,
    ).toEqual({ id: "b" });
  });

  test("edits, additions and removals are each picked up", () => {
    expect(
      planIdentityChanges("PHONE", saved, [
        { id: "a", value: "+919188346188" },
        { value: "+447700900123" },
        { value: "" },
      ]),
    ).toEqual({
      add: ["447700900123"],
      update: [{ id: "a", value: "919188346188" }],
      remove: ["b"],
      main: null,
    });
  });

  test("a new value put first becomes the main one once added", () => {
    expect(planIdentityChanges("EMAIL", [], [{ value: " Alen@Example.com " }])).toEqual({
      add: ["alen@example.com"],
      update: [],
      remove: [],
      main: { value: "alen@example.com" },
    });
  });
});
