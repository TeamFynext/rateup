import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    rateupPlan: { findFirst: vi.fn() },
    subscription: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { downgradeExpiredSubscriptions } from "./subscription.service.js";

const FREE = { id: "tier-free", name: "FREE PLAN" };
const DAY = 24 * 60 * 60 * 1000;

describe("returning expired subscriptions to the free plan", () => {
  beforeEach(() => {
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue(FREE as never);
    vi.mocked(prisma.subscription.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  function selection() {
    return vi.mocked(prisma.subscription.findMany).mock.calls[0]?.[0] as {
      where: {
        expiresAt: { lt: Date };
        NOT: { basePlanId: string };
        basePlan: { OR: { [key: string]: unknown }[] };
      };
    };
  }

  function written() {
    const call = vi.mocked(prisma.subscription.update).mock.calls[0]?.[0];
    return call as { where: { orgId: string }; data: Record<string, unknown> };
  }

  test("only looks at subscriptions past their grace period", async () => {
    // A renewal charges at exactly `expiresAt` and its webhook lands slightly after.
    // Without slack, a renewal processed a few minutes late would downgrade the org and
    // then immediately re-grant the plan.
    await downgradeExpiredSubscriptions();

    const cutoff = selection().where.expiresAt.lt.getTime();
    expect(Date.now() - cutoff).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    expect(Date.now() - cutoff).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  test("excludes orgs already on the free plan", async () => {
    await downgradeExpiredSubscriptions();

    expect(selection().where.NOT).toEqual({ basePlanId: "tier-free" });
  });

  test("only sweeps plans a gateway bills on a schedule", async () => {
    // Enterprise and bespoke `custom` tiers link no gateway product — they are renewed by
    // conversation, so a lapsed date means an admin has not got to it, not that the
    // customer should lose what they contracted for.
    await downgradeExpiredSubscriptions();

    expect(selection().where.basePlan.OR).toEqual([
      { paymentPlanId: { not: null } },
      { monthlyPaymentPlanId: { not: null } },
      { yearlyPaymentPlanId: { not: null } },
      { stripeId: { not: null } },
    ]);
  });

  test("moves an expired org onto the free plan and its features", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { orgId: "org-1", expiresAt: new Date(Date.now() - 5 * DAY), basePlan: { name: "PRO PLAN" } },
    ] as never);

    const result = await downgradeExpiredSubscriptions();

    expect(result).toEqual({ downgraded: 1 });
    expect(written().where).toEqual({ orgId: "org-1" });
    expect(written().data).toMatchObject({
      basePlanId: "tier-free",
      lastLimitAlertSentAt: null,
      // The gateway subscription is over; a stray webhook must not find it again.
      subscriptionRef: null,
    });
    expect(written().data.features).toBeTruthy();
  });

  test("gives the downgraded org a non-lapsing expiry", async () => {
    // Free does not expire. Leaving the old date in place would re-select the same org
    // on every run, forever.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { orgId: "org-1", expiresAt: new Date(Date.now() - DAY), basePlan: { name: "PRO PLAN" } },
    ] as never);

    await downgradeExpiredSubscriptions();

    const expiresAt = written().data.expiresAt as Date;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 365 * DAY);
  });

  test("one failure does not strand the rest of the batch", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { orgId: "org-1", expiresAt: new Date(0), basePlan: { name: "PRO PLAN" } },
      { orgId: "org-2", expiresAt: new Date(0), basePlan: { name: "PRO PLAN" } },
      { orgId: "org-3", expiresAt: new Date(0), basePlan: { name: "PRO PLAN" } },
    ] as never);
    vi.mocked(prisma.subscription.update).mockRejectedValueOnce(new Error("row is locked"));

    expect(await downgradeExpiredSubscriptions()).toEqual({ downgraded: 2 });
    expect(prisma.subscription.update).toHaveBeenCalledTimes(3);
  });

  test("does nothing when the catalog has no free plan to fall back to", async () => {
    // Downgrading to a plan that does not exist would strip features with nothing to
    // replace them; refusing loudly is the safer failure.
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue(null as never);

    expect(await downgradeExpiredSubscriptions()).toEqual({ downgraded: 0 });
    expect(prisma.subscription.findMany).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("writes nothing when nothing has expired", async () => {
    expect(await downgradeExpiredSubscriptions()).toEqual({ downgraded: 0 });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });
});
