import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    subscription: { findUnique: vi.fn() },
    subscriptionAddon: { findMany: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import {
  addonExpiryFrom,
  getActiveContactAllowance,
  getAddonEligibility,
  getCampaignPackCreditsRemaining,
  planMeterMax,
} from "./addons.js";
import { ADDONS } from "./catalog.js";
import { UNLIMITED_COUNT } from "./subscription.data.js";

function onPlan(max: number | undefined) {
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
    max === undefined
      ? ({ features: {} } as never)
      : ({ features: { whatsapp: { activeContacts: { count: { max } } } } } as never),
  );
}

const A_WEEK_OUT = new Date(Date.now() + 7 * 86_400_000);

function withPacks(...quantities: number[]) {
  vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue(
    quantities.map((quantity) => ({ quantity, expiresAt: A_WEEK_OUT })) as never,
  );
}

const CONTACTS_PER_PACK = ADDONS.ACTIVE_CONTACTS.units;

describe("the active-contact allowance an org actually has", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockReset();
    vi.mocked(prisma.subscriptionAddon.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
  });

  test("is the plan's allowance when no packs are held", async () => {
    onPlan(5_000);

    expect(await getActiveContactAllowance("org-1")).toEqual({
      planMax: 5_000,
      addonContacts: 0,
      effectiveMax: 5_000,
    });
  });

  test("adds a pack's contacts to the plan's", async () => {
    onPlan(5_000);
    withPacks(1);

    const allowance = await getActiveContactAllowance("org-1");

    expect(allowance.addonContacts).toBe(CONTACTS_PER_PACK);
    expect(allowance.effectiveMax).toBe(5_000 + CONTACTS_PER_PACK);
  });

  test("stacks packs, so buying three trebles the extra headroom", async () => {
    onPlan(5_000);
    withPacks(3);

    expect((await getActiveContactAllowance("org-1")).effectiveMax).toBe(
      5_000 + 3 * CONTACTS_PER_PACK,
    );
  });

  test("sums separate pack rows for the same org", async () => {
    // A pack is bought outright, so an org that buys twice in a month holds two rows;
    // counting only the first would under-credit a customer who has paid for both.
    onPlan(5_000);
    withPacks(2, 1);

    expect((await getActiveContactAllowance("org-1")).effectiveMax).toBe(
      5_000 + 3 * CONTACTS_PER_PACK,
    );
  });

  test("leaves an uncapped plan uncapped, packs or not", async () => {
    // Adding to a sentinel is meaningless, and Enterprise is invoiced on real usage.
    onPlan(UNLIMITED_COUNT);
    withPacks(5);

    expect(await getActiveContactAllowance("org-1")).toMatchObject({ effectiveMax: undefined });
  });

  test("reports no cap when the plan states no allowance", async () => {
    onPlan(undefined);

    expect(await getActiveContactAllowance("org-1")).toMatchObject({ effectiveMax: undefined });
  });

  test("only counts packs that have not run out", async () => {
    // The query filters on expiresAt rather than the caller subtracting later — a lapsed
    // pack must not keep granting headroom nobody is paying for.
    onPlan(5_000);
    withPacks(1);

    await getActiveContactAllowance("org-1");

    const where = vi.mocked(prisma.subscriptionAddon.findMany).mock.calls[0]?.[0]?.where as {
      kind: string;
      expiresAt: { gt: Date };
    };
    expect(where.expiresAt.gt.getTime()).toBeGreaterThan(Date.now() - 5_000);
    expect(where.kind).toBe("ACTIVE_CONTACTS");
  });

  test("does not look up packs for a plan that is not metered", async () => {
    // The send gate calls this on every message; an uncapped org should not pay for a
    // second query to reach the same answer.
    onPlan(UNLIMITED_COUNT);

    await getActiveContactAllowance("org-1");

    expect(prisma.subscriptionAddon.findMany).not.toHaveBeenCalled();
  });
});

describe("campaign pack credits", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscriptionAddon.findMany).mockReset();
  });

  test("sums what each in-date credit pack has left", async () => {
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([
      { quantity: 1, expiresAt: A_WEEK_OUT, creditsGranted: 10_000, creditsUsed: 5_800 },
      { quantity: 1, expiresAt: A_WEEK_OUT, creditsGranted: 10_000, creditsUsed: 0 },
    ] as never);

    expect(await getCampaignPackCreditsRemaining("org-1")).toBe(14_200);
    const where = vi.mocked(prisma.subscriptionAddon.findMany).mock.calls[0]?.[0]?.where as {
      kind: string;
    };
    expect(where.kind).toBe("CAMPAIGN_CREDITS");
  });

  test("never counts an overspent or ungranted pack as negative", async () => {
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([
      { quantity: 1, expiresAt: A_WEEK_OUT, creditsGranted: 100, creditsUsed: 101 },
      { quantity: 1, expiresAt: A_WEEK_OUT, creditsGranted: null, creditsUsed: 0 },
    ] as never);

    expect(await getCampaignPackCreditsRemaining("org-1")).toBe(0);
  });
});

describe("pack lifetimes and plan meters", () => {
  test("a contact pack lasts 30 days and a credit pack 90", () => {
    const bought = new Date("2026-10-06T12:00:00Z");
    const days = (to: Date) => Math.round((to.getTime() - bought.getTime()) / 86_400_000);

    expect(days(addonExpiryFrom("ACTIVE_CONTACTS", bought))).toBe(30);
    expect(days(addonExpiryFrom("CAMPAIGN_CREDITS", bought))).toBe(90);
  });

  test("reads each meter's own allowance from the features blob", () => {
    const features = {
      whatsapp: {
        activeContacts: { count: { max: 1_000 } },
        campaignCredits: { count: { max: 10_000 } },
      },
    };
    expect(planMeterMax(features, "ACTIVE_CONTACTS")).toBe(1_000);
    expect(planMeterMax(features, "CAMPAIGN_CREDITS")).toBe(10_000);
  });

  test.each([
    ["absent", {}],
    ["zero", { whatsapp: { campaignCredits: { count: { max: 0 } } } }],
    [
      "the unlimited sentinel",
      { whatsapp: { campaignCredits: { count: { max: UNLIMITED_COUNT } } } },
    ],
  ])("treats an %s allowance as not metered", (_label, features) => {
    expect(planMeterMax(features, "CAMPAIGN_CREDITS")).toBeUndefined();
  });
});

describe("who may buy packs", () => {
  const PAID = {
    name: "PRO PLAN",
    displayName: "Pro",
    paymentPlanId: null,
    monthlyPaymentPlanId: "gw-monthly",
    yearlyPaymentPlanId: null,
    stripeId: null,
  };
  const SALES_LED = {
    name: "ENTERPRISE PLAN",
    displayName: "Enterprise",
    paymentPlanId: null,
    monthlyPaymentPlanId: null,
    yearlyPaymentPlanId: null,
    stripeId: null,
  };

  function onBasePlan(basePlan: unknown) {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      basePlan === null ? null : ({ basePlan } as never),
    );
  }

  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockReset();
    vi.mocked(prisma.subscriptionAddon.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
  });

  test("a paid, gateway-billed plan may", async () => {
    onBasePlan(PAID);

    expect(await getAddonEligibility("org-1", "ACTIVE_CONTACTS")).toMatchObject({
      eligible: true,
      reason: null,
    });
  });

  test("Enterprise may not — its allowance is uncapped and invoiced on real usage", async () => {
    onBasePlan(SALES_LED);

    const { eligible, reason } = await getAddonEligibility("org-1", "ACTIVE_CONTACTS");

    expect(eligible).toBe(false);
    expect(reason).toMatch(/Enterprise/);
  });

  test("a contracted Enterprise account is told its ceiling, not that it has none", async () => {
    // The uncapped copy ("invoiced on the usage you actually run, so there is no
    // allowance to top up") is the opposite of this account's experience: its sends stop
    // at the number the contract set.
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      basePlan: SALES_LED,
      features: { whatsapp: { activeContacts: { count: { max: 200_000 } } } },
    } as never);

    const { eligible, reason } = await getAddonEligibility("org-1", "ACTIVE_CONTACTS");

    expect(eligible).toBe(false);
    expect(reason).toContain("200,000 active contacts a month");
    expect(reason).not.toMatch(/no allowance to top up/);
  });

  test("reports when the packs held run out", async () => {
    const soon = new Date(Date.now() + 3 * 86_400_000);
    const later = new Date(Date.now() + 20 * 86_400_000);
    onBasePlan(PAID);
    // Two purchases on different days: the customer keeps headroom until the later one
    // lapses, so that is the date worth showing.
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([
      { quantity: 1, expiresAt: later },
      { quantity: 1, expiresAt: soon },
    ] as never);

    expect(await getAddonEligibility("org-1", "ACTIVE_CONTACTS")).toMatchObject({
      packs: 2,
      activeUntil: later,
    });
  });

  test("holds nothing, and no date, when every pack has lapsed", async () => {
    onBasePlan(PAID);

    expect(await getAddonEligibility("org-1", "ACTIVE_CONTACTS")).toMatchObject({
      packs: 0,
      activeUntil: null,
    });
  });

  test("Free may not — there is no subscription for a pack to bill alongside", async () => {
    onBasePlan({
      name: "FREE PLAN",
      displayName: "Free",
      paymentPlanId: null,
      monthlyPaymentPlanId: null,
      yearlyPaymentPlanId: null,
      stripeId: null,
    });

    const { eligible, reason } = await getAddonEligibility("org-1", "ACTIVE_CONTACTS");

    expect(eligible).toBe(false);
    expect(reason).toMatch(/Upgrading/i);
  });

  test("an org with no subscription at all may not", async () => {
    onBasePlan(null);

    expect(await getAddonEligibility("org-1", "ACTIVE_CONTACTS")).toMatchObject({
      eligible: false,
    });
  });

  test("reports the packs already held, even when no more may be bought", async () => {
    // The card still has to show what a customer is paying for after they downgrade.
    onBasePlan(SALES_LED);
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([
      { quantity: 2, expiresAt: A_WEEK_OUT },
      { quantity: 1, expiresAt: A_WEEK_OUT },
    ] as never);

    expect(await getAddonEligibility("org-1", "ACTIVE_CONTACTS")).toMatchObject({
      eligible: false,
      packs: 3,
    });
  });

  test("describes the kind of pack asked about", async () => {
    onBasePlan(PAID);

    expect(await getAddonEligibility("org-1", "CAMPAIGN_CREDITS")).toMatchObject({
      kind: "CAMPAIGN_CREDITS",
      unitsPerPack: 10_000,
      validDays: 90,
    });
    const where = vi.mocked(prisma.subscriptionAddon.findMany).mock.calls[0]?.[0]?.where as {
      kind: string;
    };
    expect(where.kind).toBe("CAMPAIGN_CREDITS");
  });
});
