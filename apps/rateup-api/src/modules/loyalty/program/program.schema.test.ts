import { describe, expect, test } from "vitest";

import { loyaltyProgramSchema, loyaltyProgramUpdateSchema } from "./program.schema.js";

/**
 * The update schema must not carry `.default()`s.
 *
 * The parsed body is what Fastify hands the handler, and the handler passes it straight to
 * `prisma.loyaltyProgram.update({ data })`. Any key zod fills in is therefore written to the
 * column. `loyaltyProgramSchema.partial()` looks safe but is not: `.partial()` only makes keys
 * optional, it does not strip defaults, so a `PUT { status: "active" }` also reset
 * autoApproveAdjustments, enableShopifyOrderPoints, signupBonus, pointsExpirationMonths and the
 * rest of the defaulted columns.
 */
describe("loyaltyProgramUpdateSchema", () => {
  test("passes through only the keys that were sent", () => {
    const parsed = loyaltyProgramUpdateSchema.parse({ status: "active" });

    expect(parsed).toEqual({ status: "active" });
  });

  test("does not inject defaults for any absent key", () => {
    const parsed = loyaltyProgramUpdateSchema.parse({});

    expect(Object.keys(parsed)).toEqual([]);
  });

  test("saving the notification flags does not touch the program status", () => {
    const parsed = loyaltyProgramUpdateSchema.parse({
      pointsActivityAlerts: true,
      autoApproveAdjustments: true,
      emailNotifications: false,
      whatsappNotifications: false,
      enableShopifyOrderPoints: true,
    });

    expect(parsed).not.toHaveProperty("status");
    expect(parsed.enableShopifyOrderPoints).toBe(true);
  });

  test("activating the program does not reset the notification flags or the bonuses", () => {
    const parsed = loyaltyProgramUpdateSchema.parse({ status: "active" });

    // These are the columns whose schema defaults used to be written over the real values.
    expect(parsed).not.toHaveProperty("autoApproveAdjustments");
    expect(parsed).not.toHaveProperty("enableShopifyOrderPoints");
    expect(parsed).not.toHaveProperty("signupBonus");
    expect(parsed).not.toHaveProperty("referralBonus");
    expect(parsed).not.toHaveProperty("pointsExpirationMonths");
    expect(parsed).not.toHaveProperty("tiersEnabled");
  });

  test("still validates the values it is given", () => {
    expect(loyaltyProgramUpdateSchema.safeParse({ status: "archived" }).success).toBe(false);
    expect(loyaltyProgramUpdateSchema.safeParse({ pointsExpirationMonths: "12" }).success).toBe(
      false,
    );
    expect(loyaltyProgramUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("loyaltyProgramSchema", () => {
  const minimal = {
    name: "Rewards",
    currencyCode: "INR",
    defaultCountryCode: "IN",
    referralMessageTemplate: "Hi {{1}}, your code is {{2}}",
  };

  test("still applies defaults on create", () => {
    const parsed = loyaltyProgramSchema.parse(minimal);

    expect(parsed).toMatchObject({
      status: "draft",
      currencyName: "Points",
      signupBonus: 0,
      referralBonus: 0,
      referralBonusType: "points",
      refereeBonus: 0,
      refereeBonusType: "points",
      tiersEnabled: true,
      pointsActivityAlerts: true,
      autoApproveAdjustments: false,
      emailNotifications: true,
      whatsappNotifications: true,
      enableShopifyOrderPoints: false,
      enablePointsExpiration: false,
      pointsExpirationMonths: 12,
    });
  });

  test("explicit values win over the defaults", () => {
    const parsed = loyaltyProgramSchema.parse({
      ...minimal,
      status: "active",
      signupBonus: 250,
      tiersEnabled: false,
      pointsExpirationMonths: 24,
    });

    expect(parsed).toMatchObject({
      status: "active",
      signupBonus: 250,
      tiersEnabled: false,
      pointsExpirationMonths: 24,
    });
  });

  test("requires the fields that have no default", () => {
    expect(loyaltyProgramSchema.safeParse({ currencyCode: "INR" }).success).toBe(false);
  });
});
