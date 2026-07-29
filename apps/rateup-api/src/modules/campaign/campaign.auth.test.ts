import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    usageStats: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import {
  getSubscription,
  getUsageStats,
  verifyMessageMonthlyLimitRestrictionForCampaign,
} from "./campaign.auth.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  usageStats: { findUnique: Mock };
  subscription: { findUnique: Mock };
};

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.usageStats.findUnique.mockResolvedValue({ monthlyTemplateMessageCount: 0 });
  db.subscription.findUnique.mockResolvedValue({ features: {} });
});

describe("getUsageStats and getSubscription", () => {
  test("read the org's usage counters", async () => {
    await getUsageStats("org-1");

    expect(db.usageStats.findUnique.mock.calls[0][0]).toEqual({ where: { orgId: "org-1" } });
  });

  test("read the org's subscription", async () => {
    await getSubscription("org-1");

    expect(db.subscription.findUnique.mock.calls[0][0]).toEqual({ where: { orgId: "org-1" } });
  });

  // NOTE: both are exported and neither has a caller. The only code that used them
  // is the commented-out body below. See issues.txt 17.1.
  test("are reachable only from the commented-out limit check", async () => {
    const auth = await import("./campaign.auth.js");

    expect(Object.keys(auth).sort()).toEqual([
      "getSubscription",
      "getUsageStats",
      "verifyMessageMonthlyLimitRestrictionForCampaign",
    ]);
  });
});

describe("verifyMessageMonthlyLimitRestrictionForCampaign", () => {
  // NOTE: pins current behaviour. The entire body of this preHandler is commented
  // out behind a "TODO: re-check", so it lets every request past without reading
  // anything. It is the preHandler on POST /api/campaign/send/:campaignId
  // (campaign.route.ts:80), which fans a template out to every participant.
  // This is the third of three send paths whose message limit is disabled — see
  // issues.txt 14.1(a) for the template and flow routes, which use a different but
  // equally commented-out function. See issues.txt 17.1.
  test("lets a campaign send past without looking at anything at all", async () => {
    const rep = reply();

    await expect(
      verifyMessageMonthlyLimitRestrictionForCampaign(
        { user: { orgId: "org-1" }, params: { campaignId: "camp-1" }, body: {} } as any,
        rep,
      ),
    ).resolves.toBeUndefined();

    expect(rep.code).not.toHaveBeenCalled();
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("reads neither the usage counters nor the subscription", async () => {
    await verifyMessageMonthlyLimitRestrictionForCampaign(
      { user: { orgId: "org-1" }, params: { campaignId: "camp-1" }, body: {} } as any,
      reply(),
    );

    expect(db.usageStats.findUnique).not.toHaveBeenCalled();
    expect(db.subscription.findUnique).not.toHaveBeenCalled();
  });

  test("does not even need a request to work with", async () => {
    const rep = reply();

    await expect(
      verifyMessageMonthlyLimitRestrictionForCampaign({} as any, rep),
    ).resolves.toBeUndefined();
  });
});
