import { describe, expect, test } from "vitest";
import { getValueByKey } from "./index.js";

/** The formFields array SuperTokens hands the signup override. */
const formFields = [
  { id: "email", value: "owner@acme.com" },
  { id: "password", value: "tester1!" },
  { id: "name", value: "Owner" },
  { id: "orgName", value: "Acme" },
];

describe("getValueByKey", () => {
  test.each([
    ["email", "owner@acme.com"],
    ["name", "Owner"],
    ["orgName", "Acme"],
  ])("reads the %s field", (key, expected) => {
    expect(getValueByKey(formFields, key)).toBe(expected);
  });

  test("returns null for a field that was not submitted", () => {
    expect(getValueByKey(formFields, "phoneNumber")).toBeNull();
  });

  test("returns null when no fields were submitted at all", () => {
    expect(getValueByKey([], "email")).toBeNull();
  });

  test("returns an empty value rather than null when the field is blank", () => {
    expect(getValueByKey([{ id: "name", value: "" }], "name")).toBe("");
  });

  test("takes the first match when a field is submitted twice", () => {
    const duplicated = [
      { id: "name", value: "first" },
      { id: "name", value: "second" },
    ];

    expect(getValueByKey(duplicated, "name")).toBe("first");
  });

  test("matches the id exactly rather than by case", () => {
    expect(getValueByKey(formFields, "Email")).toBeNull();
  });
});
