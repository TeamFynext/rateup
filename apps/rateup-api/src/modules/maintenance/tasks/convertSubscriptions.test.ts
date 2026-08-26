import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    rateupPlan: { findFirst: vi.fn() },
    subscription: { findMany: vi.fn(), update: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import { runTask } from "../task.js";
import { convertSubscriptions } from "./convertSubscriptions.js";

const ENTERPRISE = { id: "tier-enterprise", name: "ENTERPRISE PLAN" };

function subscription(orgId: string, planName: string | null, subscriptionRef?: string) {
  return {
    orgId,
    basePlanId: planName ? `tier-${planName}` : null,
    subscriptionRef: subscriptionRef ?? null,
    basePlan: planName ? { name: planName } : null,
  };
}

/** The org ids written, in order. */
function updatedOrgs() {
  return vi
    .mocked(prisma.subscription.update)
    .mock.calls.map((call) => (call[0] as { where: { orgId: string } }).where.orgId);
}

describe("converting production subscriptions", () => {
  beforeEach(() => {
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue(ENTERPRISE as never);
    vi.mocked(prisma.subscription.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("leaves Free orgs exactly as they are", async () => {
    // Legacy Free carried a larger conversation allowance than today's Free. Rewriting it
    // would take capability away in a migration that was not about free accounts.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-free", "FREE PLAN"),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(result.details).toMatchObject({ converted: 0, leftOnFree: 1 });
  });

  test("moves every other plan to Enterprise", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-a", "PLUS PLAN"),
      subscription("org-b", "Rateup Essentials Yearly"),
      subscription("org-c", "MAX PLAN"),
    ] as never);

    await runTask(convertSubscriptions, true);

    expect(updatedOrgs()).toEqual(["org-a", "org-b", "org-c"]);
    const written = vi.mocked(prisma.subscription.update).mock.calls[0]?.[0] as {
      data: { basePlanId: string; expiresAt: Date };
    };
    expect(written.data.basePlanId).toBe("tier-enterprise");
    // Enterprise does not lapse — the expiry sweep exempts it and billing is by invoice.
    expect(written.data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 365 * 864e5);
  });

  test("skips an org already on Enterprise rather than churning it", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-ent", "ENTERPRISE PLAN"),
    ] as never);

    await runTask(convertSubscriptions, true);

    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("leaves an org with no plan alone rather than gifting it Enterprise", async () => {
    // Handing out unlimited features because a column is null is a gift, not a migration.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-none", null),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(result.details).toMatchObject({ unplanned: 1 });
  });

  test("reports a live Razorpay subscription without cancelling it", async () => {
    // A converted org that still bills through Razorpay keeps being charged, which is the
    // opposite of "invoiced on usage" — someone has to deal with that deliberately.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-billing", "PLUS PLAN", "sub_LIVE1"),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    expect(result.details).toMatchObject({ stillBilling: ["org-billing"] });
    expect(result.lines.join("\n")).toMatch(/still billing.*sub_LIVE1.*NOT cancelled/s);
    expect(result.summary).toMatch(/still billing via Razorpay/);
  });

  test("writes nothing on a dry run", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-a", "PLUS PLAN"),
    ] as never);

    const result = await runTask(convertSubscriptions, false);

    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(result.summary).toMatch(/^Would move 1 org/);
    expect(result.lines.every((line) => line.startsWith("[dry-run]"))).toBe(true);
  });

  test("refuses when the catalog has no Enterprise tier to move anyone to", async () => {
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue(null as never);

    await expect(runTask(convertSubscriptions, true)).rejects.toThrow(/No ENTERPRISE PLAN/);
    expect(prisma.subscription.findMany).not.toHaveBeenCalled();
  });
});
