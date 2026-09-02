import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    subscription: { findUnique: vi.fn() },
    subscriptionAddon: { findMany: vi.fn() },
    rateupPlan: { findFirst: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import { getAddonEligibility, getConversationAllowance } from "./addons.js";
import { CONVERSATION_ADDON } from "./catalog.js";
import { UNLIMITED_COUNT } from "./subscription.data.js";

function onPlan(max: number | undefined) {
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
    max === undefined
      ? ({ features: {} } as never)
      : ({ features: { whatsapp: { conversation: { count: { max } } } } } as never),
  );
}

const A_WEEK_OUT = new Date(Date.now() + 7 * 86_400_000);

function withPacks(...quantities: number[]) {
  vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue(
    quantities.map((quantity) => ({ quantity, expiresAt: A_WEEK_OUT })) as never,
  );
}

describe("the conversation allowance an org actually has", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockReset();
    vi.mocked(prisma.subscriptionAddon.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
  });

  test("is the plan's allowance when no packs are held", async () => {
    onPlan(5_000);

    expect(await getConversationAllowance("org-1")).toEqual({
      planMax: 5_000,
      addonConversations: 0,
      effectiveMax: 5_000,
    });
  });

  test("adds a pack's conversations to the plan's", async () => {
    onPlan(5_000);
    withPacks(1);

    const allowance = await getConversationAllowance("org-1");

    expect(allowance.addonConversations).toBe(CONVERSATION_ADDON.conversations);
    expect(allowance.effectiveMax).toBe(5_000 + CONVERSATION_ADDON.conversations);
  });

  test("stacks packs, so buying three trebles the extra headroom", async () => {
    onPlan(5_000);
    withPacks(3);

    expect((await getConversationAllowance("org-1")).effectiveMax).toBe(
      5_000 + 3 * CONVERSATION_ADDON.conversations,
    );
  });

  test("sums separate pack rows for the same org", async () => {
    // A pack is bought outright, so an org that buys twice in a month holds two rows;
    // counting only the first would under-credit a customer who has paid for both.
    onPlan(5_000);
    withPacks(2, 1);

    expect((await getConversationAllowance("org-1")).effectiveMax).toBe(
      5_000 + 3 * CONVERSATION_ADDON.conversations,
    );
  });

  test("leaves an uncapped plan uncapped, packs or not", async () => {
    // Adding to a sentinel is meaningless, and Enterprise is invoiced on real usage.
    onPlan(UNLIMITED_COUNT);
    withPacks(5);

    expect(await getConversationAllowance("org-1")).toMatchObject({ effectiveMax: undefined });
  });

  test("reports no cap when the plan states no allowance", async () => {
    onPlan(undefined);

    expect(await getConversationAllowance("org-1")).toMatchObject({ effectiveMax: undefined });
  });

  test("only counts packs that have not run out", async () => {
    // The query filters on expiresAt rather than the caller subtracting later — a lapsed
    // pack must not keep granting headroom nobody is paying for.
    onPlan(5_000);
    withPacks(1);

    await getConversationAllowance("org-1");

    const where = vi.mocked(prisma.subscriptionAddon.findMany).mock.calls[0]?.[0]?.where as {
      expiresAt: { gt: Date };
    };
    expect(where.expiresAt.gt.getTime()).toBeGreaterThan(Date.now() - 5_000);
  });

  test("does not look up packs for a plan that is not metered", async () => {
    // The send gate calls this on every message; an uncapped org should not pay for a
    // second query to reach the same answer.
    onPlan(UNLIMITED_COUNT);

    await getConversationAllowance("org-1");

    expect(prisma.subscriptionAddon.findMany).not.toHaveBeenCalled();
  });
});

describe("who may buy conversation packs", () => {
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
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue({ id: "addon-plan" } as never);
    vi.mocked(prisma.subscriptionAddon.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
  });

  test("a paid, gateway-billed plan may", async () => {
    onBasePlan(PAID);

    expect(await getAddonEligibility("org-1")).toMatchObject({ eligible: true, reason: null });
  });

  test("Enterprise may not — its allowance is uncapped and invoiced on real usage", async () => {
    onBasePlan(SALES_LED);

    const { eligible, reason } = await getAddonEligibility("org-1");

    expect(eligible).toBe(false);
    expect(reason).toMatch(/Enterprise/);
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

    expect(await getAddonEligibility("org-1")).toMatchObject({ packs: 2, activeUntil: later });
  });

  test("holds nothing, and no date, when every pack has lapsed", async () => {
    onBasePlan(PAID);

    expect(await getAddonEligibility("org-1")).toMatchObject({ packs: 0, activeUntil: null });
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

    const { eligible, reason } = await getAddonEligibility("org-1");

    expect(eligible).toBe(false);
    expect(reason).toMatch(/Upgrading/i);
  });

  test("an org with no subscription at all may not", async () => {
    onBasePlan(null);

    expect(await getAddonEligibility("org-1")).toMatchObject({ eligible: false });
  });

  test("reports the packs already held, even when no more may be bought", async () => {
    // The card still has to show what a customer is paying for after they downgrade.
    onBasePlan(SALES_LED);
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([
      { quantity: 2, expiresAt: A_WEEK_OUT },
      { quantity: 1, expiresAt: A_WEEK_OUT },
    ] as never);

    expect(await getAddonEligibility("org-1")).toMatchObject({ eligible: false, packs: 3 });
  });

  test("holds no packs when the add-on is not in the catalog yet", async () => {
    onBasePlan(PAID);
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue(null as never);

    expect(await getAddonEligibility("org-1")).toMatchObject({ packs: 0 });
  });
});
