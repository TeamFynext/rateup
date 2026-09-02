import { describe, expect, test, vi } from "vitest";

import {
  adviseOnTopUp,
  buildTiers,
  detectPricingCurrency,
  estimateTopUp,
  resolveDisplayPrice,
  selectGatewayPlan,
  tierConversationAllowance,
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
    {
      id: "1",
      name: "FREE PLAN",
      displayName: "Free",
      description: [],
      features: {},
    },
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
    {
      id: "5",
      name: "ENTERPRISE PLAN",
      displayName: "Enterprise",
      description: [],
      features: {},
    },
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
    {
      id: "1",
      name: "FREE PLAN",
      displayName: "Free",
      description: [],
      features: {},
    },
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
      monthlyPaymentPlan: {
        planId: "plan_inr_m",
        amount: 2_400,
        currency: "INR",
      },
      yearlyPaymentPlan: {
        planId: "plan_inr_y",
        amount: 24_000,
        currency: "INR",
      },
      usdMonthlyPaymentPlan: {
        planId: "plan_usd_m",
        amount: 29,
        currency: "USD",
      },
      usdYearlyPaymentPlan: {
        planId: "plan_usd_y",
        amount: 290,
        currency: "USD",
      },
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
    {
      id: "5",
      name: "ENTERPRISE PLAN",
      displayName: "Enterprise",
      description: [],
      features: {},
    },
  ] as unknown as Parameters<typeof buildTiers>[0]);

  test("shows the dollar list price the catalog sets, not a conversion", () => {
    // A quoted price beats a converted one — ₹24,000 / 80 would read $300, but the
    // catalog sells the tier at $290, and the customer is charged the list price.
    expect(resolveDisplayPrice(plus, "USD")).toEqual({
      monthly: 29,
      yearly: 290,
    });
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
    expect(resolveDisplayPrice(inrOnly, "INR")).toEqual({
      monthly: 2_400,
      yearly: 24_000,
    });
  });

  test("leaves the price untouched in its own currency", () => {
    expect(resolveDisplayPrice(plus, "INR")).toEqual({
      monthly: 2_400,
      yearly: 24_000,
    });
  });

  test("a sales-led tier still has no price in either currency", () => {
    expect(resolveDisplayPrice(enterprise, "INR")).toBeNull();
    expect(resolveDisplayPrice(enterprise, "USD")).toBeNull();
  });
});

describe("which gateway plan a checkout is created from", () => {
  const [, plus] = buildTiers([
    {
      id: "1",
      name: "FREE PLAN",
      displayName: "Free",
      description: [],
      features: {},
    },
    {
      id: "2",
      name: "PLUS PLAN",
      displayName: "Plus",
      description: [],
      features: {},
      currency: "INR",
      monthlyPrice: 2_400,
      yearlyPrice: 24_000,
      monthlyPaymentPlan: {
        planId: "plan_inr_m",
        amount: 2_400,
        currency: "INR",
      },
      yearlyPaymentPlan: {
        planId: "plan_inr_y",
        amount: 24_000,
        currency: "INR",
      },
      usdMonthlyPaymentPlan: {
        planId: "plan_usd_m",
        amount: 29,
        currency: "USD",
      },
      usdYearlyPaymentPlan: {
        planId: "plan_usd_y",
        amount: 290,
        currency: "USD",
      },
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
        yearlyPaymentPlan: {
          planId: "plan_inr_y",
          amount: 24_000,
          currency: "INR",
        },
      },
    ] as unknown as Parameters<typeof buildTiers>[0]);

    expect(selectGatewayPlan(legacy, "yearly", "USD")?.planId).toBe("plan_inr_y");
  });
});

describe("conversation top-up estimate", () => {
  test("rounds up to whole packs — half a pack of headroom is still a pack to buy", () => {
    expect(estimateTopUp(1000, 1500, 1000)).toEqual({
      overage: 500,
      packs: 1,
      extraConversations: 1000,
      totalConversations: 2000,
    });
  });

  test("needs nothing when the plan already covers the volume", () => {
    expect(estimateTopUp(1000, 1000, 1000).packs).toBe(0);
    expect(estimateTopUp(1000, 400, 1000)).toEqual({
      overage: 0,
      packs: 0,
      extraConversations: 0,
      totalConversations: 1000,
    });
  });

  test("stacks packs for volumes well past the allowance", () => {
    expect(estimateTopUp(1000, 5001, 1000).packs).toBe(5);
  });

  test("quotes no packs when the catalog gives the pack no size", () => {
    // Guards the division: a pack worth zero conversations would otherwise ask for
    // Infinity packs and render a nonsense total.
    expect(estimateTopUp(1000, 9000, 0).packs).toBe(0);
  });
});

describe("tierConversationAllowance", () => {
  const tierFor = (max: number | undefined) =>
    buildTiers([
      {
        id: "1",
        name: "PRO PLAN",
        displayName: "Pro",
        description: [],
        features: { whatsapp: { conversation: { count: { max } } } },
      },
    ] as unknown as Parameters<typeof buildTiers>[0])[0];

  test("reads the plan's monthly conversation cap", () => {
    expect(tierConversationAllowance(tierFor(10_000))).toBe(10_000);
  });

  test("an unlimited tier has no cap to top up", () => {
    // Enterprise carries a large sentinel rather than null so the API's `used >= max`
    // comparisons keep working; here it has to read as "nothing to top up".
    expect(tierConversationAllowance(tierFor(1_000_000))).toBeNull();
    expect(tierConversationAllowance(tierFor(undefined))).toBeNull();
  });
});

describe("when packs stop being the cheaper answer", () => {
  // Plus 5k @ 25, Pro 25k @ 60, Max 100k @ 150 — a pack is 1k conversations.
  const options = [
    { planName: "PLUS PLAN", name: "Plus", included: 5_000, monthlyPrice: 25 },
    { planName: "PRO PLAN", name: "Pro", included: 25_000, monthlyPrice: 60 },
    { planName: "MAX PLAN", name: "Max", included: 100_000, monthlyPrice: 150 },
  ];

  const advise = (volume: number, packs: number, monthlyCostWithPacks: number | null) =>
    adviseOnTopUp({
      options,
      currentIncluded: 5_000,
      volume,
      packs,
      monthlyCostWithPacks,
    });

  test("says nothing while the plan still covers the volume", () => {
    expect(advise(4_000, 0, 25).kind).toBe("none");
  });

  test("a small top-up stays cheaper than moving up", () => {
    // 2 packs on Plus (25 + 20) is still under Pro's 60.
    expect(advise(7_000, 2, 45).kind).toBe("none");
  });

  test("recommends the tier once stacking packs costs more, and the cheapest one that fits", () => {
    // 15 packs on Plus (25 + 150) beats being on Pro at 60 for the same headroom.
    const advice = advise(20_000, 15, 175);
    expect(advice).toEqual({
      kind: "upgrade",
      option: options[1],
      monthlySaving: 115,
    });
  });

  test("skips a tier that does not include the whole volume", () => {
    // 40k needs Max; Pro is cheaper but would not cover it.
    const advice = advise(40_000, 35, 375);
    expect(advice.kind === "upgrade" && advice.option.planName).toBe("MAX PLAN");
  });

  test("sends volume past every plan to sales rather than to more packs", () => {
    expect(advise(150_000, 145, 1_475).kind).toBe("sales");
  });

  test("gives no advice it cannot price", () => {
    // A currency the catalog does not price the tiers in cannot be compared against.
    expect(advise(20_000, 15, null).kind).toBe("none");
    expect(
      adviseOnTopUp({
        options: options.map((option) => ({ ...option, monthlyPrice: null })),
        currentIncluded: 5_000,
        volume: 20_000,
        packs: 15,
        monthlyCostWithPacks: 175,
      }).kind,
    ).toBe("none");
  });
});

describe("detectPricingCurrency", () => {
  test("prices India in INR under either IANA spelling", () => {
    // V8 hands back the deprecated alias, Firefox and Safari the primary name.
    // Matching only one of them was pricing Indian visitors in USD.
    expect(detectPricingCurrency("Asia/Calcutta")).toBe("INR");
    expect(detectPricingCurrency("Asia/Kolkata")).toBe("INR");
  });

  test("prices everywhere else in USD", () => {
    expect(detectPricingCurrency("America/New_York")).toBe("USD");
    expect(detectPricingCurrency("Europe/London")).toBe("USD");
    expect(detectPricingCurrency("Asia/Dubai")).toBe("USD");
  });

  test("falls back to USD when the browser will not report a timezone", () => {
    // Locked-down and embedded browsers throw out of `resolvedOptions()`. Passing
    // `undefined` would not exercise this: it hits the default parameter and detects
    // the real zone, which is INR on an Indian developer's machine.
    const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("Intl unavailable");
    });
    try {
      expect(detectPricingCurrency()).toBe("USD");
    } finally {
      spy.mockRestore();
    }
  });
});
