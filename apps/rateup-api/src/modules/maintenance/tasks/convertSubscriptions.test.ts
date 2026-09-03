import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    rateupPlan: { findFirst: vi.fn() },
    subscription: { findMany: vi.fn(), update: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import {
  getFreeSubscriptionFeatures,
  UNLIMITED_COUNT,
} from "../../subscription/subscription.data.js";
import { runTask } from "../task.js";
import { convertSubscriptions } from "./convertSubscriptions.js";

const ENTERPRISE = { id: "tier-enterprise", name: "ENTERPRISE PLAN" };
const FREE = { id: "tier-free", name: "FREE PLAN" };

/**
 * A stored features blob as a legacy row carries one: real counts, plus keys the product
 * has since retired.
 */
function legacyFeatures(overrides: Record<string, unknown> = {}) {
  return {
    team: { active: true, count: { max: 3 }, teamMember: { active: true, count: { max: 12 } } },
    webSurvey: { active: true, count: { max: 40, monthlyResponseLimit: 8_000 } },
    whatsapp: { active: true, conversation: { active: true, count: { max: 25_000 } } },
    ai: { active: false, count: { promptTokens: 0, completionTokens: 0 } },
    // Retired: `menu` went with the menu product, `ticket` with the ticket boards.
    menu: { active: true, count: { max: 5 } },
    ticket: { active: true },
    ...overrides,
  };
}

function subscription(
  orgId: string,
  planName: string | null,
  options: { subscriptionRef?: string; features?: unknown } = {},
) {
  return {
    orgId,
    basePlanId: planName ? `tier-${planName}` : null,
    subscriptionRef: options.subscriptionRef ?? null,
    features: options.features ?? legacyFeatures(),
    basePlan: planName ? { name: planName } : null,
  };
}

/** The org ids written, in order. */
function updatedOrgs() {
  return vi
    .mocked(prisma.subscription.update)
    .mock.calls.map((call) => (call[0] as { where: { orgId: string } }).where.orgId);
}

/** The features written for one org. */
function writtenFeatures(orgId: string) {
  const call = vi
    .mocked(prisma.subscription.update)
    .mock.calls.find((c) => (c[0] as { where: { orgId: string } }).where.orgId === orgId);
  return (call?.[0] as { data: { features: any } } | undefined)?.data.features;
}

describe("converting production subscriptions", () => {
  beforeEach(() => {
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockImplementation((async (args: any) =>
        args?.where?.name === FREE.name ? FREE : ENTERPRISE) as never);
    vi.mocked(prisma.subscription.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("rewrites a Free org to today's Free numbers", async () => {
    // A legacy free account may have carried more than today's Free allows. Leaving it
    // means "FREE PLAN" keeps meaning several different things at once.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-free", "FREE PLAN"),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    const free = getFreeSubscriptionFeatures() as any;
    expect(writtenFeatures("org-free")).toEqual(free);
    expect(writtenFeatures("org-free").whatsapp.conversation.count.max).toBe(100);
    expect(result.details).toMatchObject({ freeRefreshed: 1, converted: 0 });
    // The transcript names the move, so a dry run shows who loses what.
    expect(result.lines.join("\n")).toMatch(/org-free 25,000 conversations.*→.*100 conversations/);
  });

  test("moves every other plan to Enterprise, keeping the counts it already had", async () => {
    // The point of the rule: nobody gains volume nobody sold them. Writing the tier's own
    // sentinel here would hand every converted org unlimited conversations.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-a", "PLUS PLAN"),
      subscription("org-b", "Rateup Essentials Yearly"),
    ] as never);

    await runTask(convertSubscriptions, true);

    expect(updatedOrgs()).toEqual(["org-a", "org-b"]);
    const written = vi.mocked(prisma.subscription.update).mock.calls[0]?.[0] as {
      data: { basePlanId: string; expiresAt: Date; features: any };
    };
    expect(written.data.basePlanId).toBe("tier-enterprise");
    expect(written.data.features.whatsapp.conversation.count.max).toBe(25_000);
    expect(written.data.features.team.count.max).toBe(3);
    expect(written.data.features.team.teamMember.count.max).toBe(12);
    expect(written.data.features.webSurvey.count.monthlyResponseLimit).toBe(8_000);
    // Enterprise does not lapse — the expiry sweep exempts it and billing is by invoice.
    expect(written.data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 365 * 864e5);
  });

  test("keeps only the fields the product still uses", async () => {
    // Each blob is rebuilt from the preset rather than edited in place, so a legacy row's
    // retired keys stop being migrated forward.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-a", "PLUS PLAN"),
    ] as never);

    await runTask(convertSubscriptions, true);

    const features = writtenFeatures("org-a");
    expect(features.menu).toBeUndefined();
    expect(features.ticket).toBeUndefined();
    expect(Object.keys(features).sort()).toEqual(["ai", "team", "webSurvey", "whatsapp"]);
    // The Enterprise gates still arrive from the tier.
    expect(features.whatsapp.campaign.active).toBe(true);
  });

  test("falls back to unlimited only for an allowance the old blob never carried", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-a", "PLUS PLAN", {
        features: { whatsapp: { conversation: { count: { max: 25_000 } } } },
      }),
    ] as never);

    await runTask(convertSubscriptions, true);

    const features = writtenFeatures("org-a");
    expect(features.whatsapp.conversation.count.max).toBe(25_000);
    expect(features.team.count.max).toBe(UNLIMITED_COUNT);
  });

  test("normalises an org already on Enterprise without moving its counts", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-ent", "ENTERPRISE PLAN"),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    const features = writtenFeatures("org-ent");
    expect(features.whatsapp.conversation.count.max).toBe(25_000);
    expect(features.menu).toBeUndefined();
    // Its plan is not rewritten, and it is not counted as a conversion.
    expect(vi.mocked(prisma.subscription.update).mock.calls[0][0]).not.toHaveProperty(
      "data.basePlanId",
    );
    expect(result.details).toMatchObject({ normalised: 1, converted: 0 });
  });

  test("adopts an org with no plan onto Enterprise and still counts it", async () => {
    // An unplanned row is invisible to every plan-keyed path in the app, so leaving it
    // alone leaves it broken. It is converted like any other, and reported as unplanned so
    // the transcript still says how many arrived that way.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-none", null),
      subscription("org-a", "PLUS PLAN"),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    expect(updatedOrgs()).toEqual(["org-none", "org-a"]);
    expect(result.details).toMatchObject({ converted: 2, unplanned: 1 });
    expect(result.lines.join("\n")).toMatch(/org-none: no plan -> Enterprise/);
  });

  test("reports a live Razorpay subscription without cancelling it", async () => {
    // A converted org that still bills through Razorpay keeps being charged, which is the
    // opposite of "invoiced on usage" — someone has to deal with that deliberately.
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-billing", "PLUS PLAN", { subscriptionRef: "sub_LIVE1" }),
    ] as never);

    const result = await runTask(convertSubscriptions, true);

    expect(result.details).toMatchObject({ stillBilling: ["org-billing"] });
    expect(result.lines.join("\n")).toMatch(/still billing.*sub_LIVE1.*NOT cancelled/s);
    expect(result.summary).toMatch(/still billing via Razorpay/);
  });

  test("writes nothing on a dry run", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription("org-a", "PLUS PLAN"),
      subscription("org-free", "FREE PLAN"),
      subscription("org-ent", "ENTERPRISE PLAN"),
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

  test("refuses when the catalog has no Free tier to rewrite Free orgs onto", async () => {
    vi.mocked(prisma.rateupPlan.findFirst).mockImplementation((async (args: any) =>
      args?.where?.name === FREE.name ? null : ENTERPRISE) as never);

    await expect(runTask(convertSubscriptions, true)).rejects.toThrow(/No FREE PLAN/);
  });
});
