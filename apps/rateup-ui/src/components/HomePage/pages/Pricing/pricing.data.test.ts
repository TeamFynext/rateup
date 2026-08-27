import { describe, expect, test } from "vitest";

import {
  buildTiers,
  resolveDisplayPrice,
  selectGatewayPlan,
  tierRank,
} from "@/components/HomePage/pages/Pricing/pricing.data.ts";

describe("tierRank", () => {
  test("orders the catalog ladder", () => {
    expect(tierRank("FREE PLAN")).toBe(0);
    expect(tierRank("PLUS PLAN")).toBe(1);
    expect(tierRank("PRO PLAN")).toBe(2);
    expect(tierRank("MAX PLAN")).toBe(3);
    expect(tierRank("ENTERPRISE PLAN")).toBe(4);
  });

  test("the retired Starter name no longer ranks", () => {
    // STARTER PLAN was renamed to PLUS PLAN in place, so nothing should still be on it.
    // Ranking -1 means "cannot compare" rather than sorting below Free.
    expect(tierRank("STARTER PLAN")).toBe(-1);
  });

  test("returns -1 for legacy, bespoke and missing plans", () => {
    // These are still attached to live subscriptions, so they must read as
    // "cannot compare" rather than sorting below Free.
    expect(tierRank("custom")).toBe(-1);
    expect(tierRank("Rateup Essentials Yearly")).toBe(-1);
    expect(tierRank(undefined)).toBe(-1);
    expect(tierRank(null)).toBe(-1);
  });
});

/**
 * The card list the pricing UI offers, reproducing `PricingSection`'s `offeredTiers`
 * rule. Narrowing by rank is only correct for a subscription that is actually billing;
 * `currentPlanName` is left undefined everywhere the plan has ended.
 */
function offeredTiers(
  plans: Parameters<typeof buildTiers>[0],
  compact: boolean,
  currentPlanName?: string,
) {
  const tiers = buildTiers(plans);
  const currentRank = tierRank(currentPlanName);
  const purchasable = compact ? tiers.filter((tier) => !tier.free) : tiers;
  return (
    currentRank < 0 ? purchasable : purchasable.filter((t) => tierRank(t.planName) > currentRank)
  ).map((t) => t.planName);
}

describe("which tiers the in-app dialog offers", () => {
  const plans = [
    { id: "1", name: "FREE PLAN", displayName: "Free", description: [], features: {} },
    {
      id: "2",
      name: "PLUS PLAN",
      displayName: "Plus",
      description: [],
      features: {},
      monthlyPrice: 2_400,
      yearlyPrice: 24_000,
    },
    {
      id: "3",
      name: "PRO PLAN",
      displayName: "Pro",
      description: [],
      features: {},
      monthlyPrice: 6_000,
      yearlyPrice: 60_000,
    },
    {
      id: "4",
      name: "MAX PLAN",
      displayName: "Max",
      description: [],
      features: {},
      monthlyPrice: 10_800,
      yearlyPrice: 108_000,
    },
    { id: "5", name: "ENTERPRISE PLAN", displayName: "Enterprise", description: [], features: {} },
  ] as unknown as Parameters<typeof buildTiers>[0];

  test("a cancelled Pro customer can come back on Pro, or move down to Plus", () => {
    // The regression this guards: narrowing to tiers above PRO left Enterprise as the
    // only option on the resubscribe path — no way back onto Pro, no way down.
    expect(offeredTiers(plans, true)).toEqual([
      "PLUS PLAN",
      "PRO PLAN",
      "MAX PLAN",
      "ENTERPRISE PLAN",
    ]);
  });

  test("Free is never offered in-app", () => {
    // Selecting it routes to signup, which makes no sense for a signed-in user.
    expect(offeredTiers(plans, true)).not.toContain("FREE PLAN");
  });

  test("the public page still shows every tier, Free included", () => {
    expect(offeredTiers(plans, false)).toContain("FREE PLAN");
  });

  test("a live subscription still narrows to genuine upgrades", () => {
    expect(offeredTiers(plans, true, "PLUS PLAN")).toEqual([
      "PRO PLAN",
      "MAX PLAN",
      "ENTERPRISE PLAN",
    ]);
  });
});

describe("dollar prices", () => {
  const [, plus, , , enterprise] = buildTiers([
    { id: "1", name: "FREE PLAN", displayName: "Free", description: [], features: {} },
    {
      id: "2",
      name: "PLUS PLAN",
      displayName: "Plus",
      description: [],
      features: {},
      currency: "INR",
      monthlyPrice: 2_400,
      yearlyPrice: 24_000,
      usdMonthlyPrice: 29,
      usdYearlyPrice: 290,
      monthlyPaymentPlan: { planId: "plan_inr_m", amount: 2_400, currency: "INR" },
      yearlyPaymentPlan: { planId: "plan_inr_y", amount: 24_000, currency: "INR" },
      usdMonthlyPaymentPlan: { planId: "plan_usd_m", amount: 29, currency: "USD" },
      usdYearlyPaymentPlan: { planId: "plan_usd_y", amount: 290, currency: "USD" },
    },
    {
      id: "3",
      name: "PRO PLAN",
      displayName: "Pro",
      description: [],
      features: {},
      currency: "INR",
      monthlyPrice: 6_000,
      yearlyPrice: 60_000,
    },
    {
      id: "4",
      name: "MAX PLAN",
      displayName: "Max",
      description: [],
      features: {},
      currency: "INR",
      monthlyPrice: 10_800,
      yearlyPrice: 108_000,
    },
    { id: "5", name: "ENTERPRISE PLAN", displayName: "Enterprise", description: [], features: {} },
  ] as unknown as Parameters<typeof buildTiers>[0]);

  test("shows the dollar list price the catalog sets, not a conversion", () => {
    // A quoted price beats a converted one — ₹24,000 / 80 would read $300, but the
    // catalog sells the tier at $290, and the customer is charged the list price.
    expect(resolveDisplayPrice(plus, "USD")).toEqual({ monthly: 29, yearly: 290 });
  });

  test("shows no dollar price for a tier the catalog prices only in rupees", () => {
    // Deliberately not converted: a derived figure drifts from the real price and could
    // never be charged, since there is no dollar gateway plan behind it. The card reads
    // "Custom" instead.
    const inrOnly = buildTiers([
      {
        id: "9",
        name: "PLUS PLAN",
        displayName: "Legacy",
        description: [],
        features: {},
        currency: "INR",
        monthlyPrice: 2_400,
        yearlyPrice: 24_000,
      },
    ] as unknown as Parameters<typeof buildTiers>[0])[0];

    expect(resolveDisplayPrice(inrOnly, "USD")).toBeNull();
    expect(resolveDisplayPrice(inrOnly, "INR")).toEqual({ monthly: 2_400, yearly: 24_000 });
  });

  test("leaves the price untouched in its own currency", () => {
    expect(resolveDisplayPrice(plus, "INR")).toEqual({ monthly: 2_400, yearly: 24_000 });
  });

  test("a sales-led tier still has no price in either currency", () => {
    expect(resolveDisplayPrice(enterprise, "INR")).toBeNull();
    expect(resolveDisplayPrice(enterprise, "USD")).toBeNull();
  });
});

describe("which gateway plan a checkout is created from", () => {
  const [, plus] = buildTiers([
    { id: "1", name: "FREE PLAN", displayName: "Free", description: [], features: {} },
    {
      id: "2",
      name: "PLUS PLAN",
      displayName: "Plus",
      description: [],
      features: {},
      currency: "INR",
      monthlyPrice: 2_400,
      yearlyPrice: 24_000,
      monthlyPaymentPlan: { planId: "plan_inr_m", amount: 2_400, currency: "INR" },
      yearlyPaymentPlan: { planId: "plan_inr_y", amount: 24_000, currency: "INR" },
      usdMonthlyPaymentPlan: { planId: "plan_usd_m", amount: 29, currency: "USD" },
      usdYearlyPaymentPlan: { planId: "plan_usd_y", amount: 290, currency: "USD" },
    },
  ] as unknown as Parameters<typeof buildTiers>[0]);

  test("charges dollars when the visitor picked dollars", () => {
    // A Razorpay plan carries one currency, so the toggle selects the plan, not a label.
    expect(selectGatewayPlan(plus, "yearly", "USD")?.planId).toBe("plan_usd_y");
    expect(selectGatewayPlan(plus, "monthly", "USD")?.planId).toBe("plan_usd_m");
  });

  test("charges rupees when the visitor picked rupees", () => {
    expect(selectGatewayPlan(plus, "yearly", "INR")?.planId).toBe("plan_inr_y");
    expect(selectGatewayPlan(plus, "monthly", "INR")?.planId).toBe("plan_inr_m");
  });

  test("falls back to the rupee plan when a tier has no dollar counterpart", () => {
    // A legacy tier stays purchasable rather than becoming a dead card in USD mode.
    const [legacy] = buildTiers([
      {
        id: "2",
        name: "PLUS PLAN",
        displayName: "Legacy",
        description: [],
        features: {},
        currency: "INR",
        monthlyPrice: 2_400,
        yearlyPrice: 24_000,
        yearlyPaymentPlan: { planId: "plan_inr_y", amount: 24_000, currency: "INR" },
      },
    ] as unknown as Parameters<typeof buildTiers>[0]);

    expect(selectGatewayPlan(legacy, "yearly", "USD")?.planId).toBe("plan_inr_y");
  });
});
