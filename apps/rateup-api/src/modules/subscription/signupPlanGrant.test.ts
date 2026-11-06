import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    rateupPlan: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    subscription: { create: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { createFreePlanSubscription } from "./subscription.service.js";

/**
 * `planId` reaches this code as a signup **form field** — whatever the client sent — and
 * tier ids are public, since the pricing page reads them from an unauthenticated
 * endpoint. Granting a paid tier here would hand out its features with a hundred-year
 * expiry and no payment, so the only tiers a client may name are free ones.
 */
describe("the plan a signup is allowed to ask for", () => {
  const FREE = {
    id: "tier-free",
    name: "FREE PLAN",
    features: { free: true },
    paymentPlanId: null,
    monthlyPaymentPlanId: null,
    yearlyPaymentPlanId: null,
    stripeId: null,
    price: null,
    monthlyPrice: null,
    yearlyPrice: null,
  };

  beforeEach(() => {
    vi.mocked(prisma.rateupPlan.findUnique).mockReset();
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue(FREE as never);
    vi.mocked(prisma.subscription.create)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  function grantedPlanId() {
    const call = vi.mocked(prisma.subscription.create).mock.calls[0]?.[0];
    return (call as { data?: { basePlanId?: string } } | undefined)?.data?.basePlanId;
  }

  test.each([
    ["a linked Razorpay plan", { monthlyPaymentPlanId: "pp-1" }],
    ["a linked yearly plan", { yearlyPaymentPlanId: "pp-2" }],
    ["a legacy gateway link", { paymentPlanId: "pp-3" }],
    ["a Stripe product", { stripeId: "sp-1" }],
    ["a yearly price", { yearlyPrice: 24_000 }],
    ["a monthly price", { monthlyPrice: 2_400 }],
    ["a headline price", { price: 2_000 }],
  ])("falls back to Free when the requested tier has %s", async (_label, paidMarker) => {
    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValue({
      ...FREE,
      id: "tier-pro",
      name: "PRO PLAN",
      ...paidMarker,
    } as never);

    await createFreePlanSubscription("org-1", prisma, "tier-pro");

    expect(grantedPlanId()).toBe("tier-free");
  });

  test("honours a genuinely free tier, so the menu/free products still work", async () => {
    const menuFree = { ...FREE, id: "tier-menu-free", name: "MENU FREE PLAN" };
    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValue(menuFree as never);

    await createFreePlanSubscription("org-1", prisma, "tier-menu-free");

    expect(grantedPlanId()).toBe("tier-menu-free");
  });

  test("falls back to Free when no plan is requested at all", async () => {
    await createFreePlanSubscription("org-1", prisma);

    expect(prisma.rateupPlan.findUnique).not.toHaveBeenCalled();
    expect(grantedPlanId()).toBe("tier-free");
  });

  test("falls back to Free when the requested tier does not exist", async () => {
    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValue(null as never);

    await createFreePlanSubscription("org-1", prisma, "tier-nonsense");

    expect(grantedPlanId()).toBe("tier-free");
  });
});
