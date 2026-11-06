import { describe, expect, test } from "vitest";

import { completeOrgDetailsSchema } from "./org.schema.js";

describe("completeOrgDetailsSchema", () => {
  test("accepts the onboarding wizard's body", () => {
    const body = {
      onboarding: {
        services: ["whatsapp", "loyalty"],
        industry: "Retail",
        template: "retail-basic",
        integration: ["shopify"],
      },
    };
    expect(completeOrgDetailsSchema.parse(body)).toEqual(body);
  });

  test("accepts a single integration string from older clients", () => {
    expect(
      completeOrgDetailsSchema.safeParse({ onboarding: { integration: "shopify" } }).success,
    ).toBe(true);
  });

  test("drops keys outside the questionnaire", () => {
    expect(
      completeOrgDetailsSchema.parse({ onboarding: { industry: "Retail", isAdmin: true } }),
    ).toEqual({ onboarding: { industry: "Retail" } });
  });

  test("refuses an oversized value", () => {
    expect(
      completeOrgDetailsSchema.safeParse({ onboarding: { industry: "x".repeat(201) } }).success,
    ).toBe(false);
  });
});
