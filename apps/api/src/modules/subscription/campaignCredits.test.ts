import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    usageStats: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    subscriptionAddon: { findMany: vi.fn() },
  },
}));
vi.mock("./limitAlerts.js", () => ({ maybeNotifyLimitReached: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { currentPeriodStart } from "./billingPeriod.js";
import { consumeCampaignCredit, getCampaignCreditBudget } from "./campaignCredits.js";
import { maybeNotifyLimitReached } from "./limitAlerts.js";
import { UNLIMITED_COUNT } from "./subscription.data.js";

const queryRaw = vi.mocked(prisma.$queryRaw);

function onPlan(max: number | undefined, planUsed = 0, packCredits: [number, number][] = []) {
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
    features:
      max === undefined ? {} : { whatsapp: { campaignCredits: { active: true, count: { max } } } },
  } as never);
  vi.mocked(prisma.usageStats.findUnique).mockResolvedValue({
    campaignCreditsUsed: planUsed,
    campaignCreditsPeriodStart: currentPeriodStart(),
  } as never);
  vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue(
    packCredits.map(([granted, used]) => ({
      quantity: 1,
      creditsGranted: granted,
      creditsUsed: used,
    })) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  queryRaw.mockReset();
});

describe("getCampaignCreditBudget", () => {
  test("remaining is the plan's credits left plus unspent pack credits", async () => {
    onPlan(10_000, 10_000, [
      [10_000, 5_800],
      [10_000, 10_000],
    ]);

    expect(await getCampaignCreditBudget("org-1")).toMatchObject({
      metered: true,
      planMax: 10_000,
      planUsed: 10_000,
      packRemaining: 4_200,
      remaining: 4_200,
      exhausted: false,
    });
  });

  test("is exhausted when the plan and every pack are spent", async () => {
    onPlan(500, 500);
    expect(await getCampaignCreditBudget("org-1")).toMatchObject({
      remaining: 0,
      exhausted: true,
    });
  });

  test("ignores last month's plan usage", async () => {
    onPlan(500, 500);
    vi.mocked(prisma.usageStats.findUnique).mockResolvedValue({
      campaignCreditsUsed: 500,
      campaignCreditsPeriodStart: new Date("2020-01-01T00:00:00Z"),
    } as never);

    expect(await getCampaignCreditBudget("org-1")).toMatchObject({ planUsed: 0, remaining: 500 });
  });

  test("does not meter an uncapped plan", async () => {
    onPlan(UNLIMITED_COUNT, 50_000_000);

    const budget = await getCampaignCreditBudget("org-1");

    expect(budget).toMatchObject({ metered: false, exhausted: false });
    expect(budget.remaining).toBeUndefined();
  });
});

describe("consumeCampaignCredit", () => {
  test("spends a plan credit first", async () => {
    onPlan(10_000, 0, [[10_000, 0]]);
    queryRaw.mockResolvedValueOnce([{ used: 1 }] as never);

    expect(await consumeCampaignCredit("org-1")).toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(maybeNotifyLimitReached).not.toHaveBeenCalled();
  });

  test("alerts when the last plan credit goes and no pack is left", async () => {
    onPlan(500, 499);
    queryRaw.mockResolvedValueOnce([{ used: 500 }] as never);

    expect(await consumeCampaignCredit("org-1")).toBe(true);
    expect(maybeNotifyLimitReached).toHaveBeenCalledWith(
      "org-1",
      "campaignCredits",
      currentPeriodStart(),
    );
  });

  test("falls to a pack once the plan's credits are spent", async () => {
    onPlan(500, 500, [[10_000, 3]]);
    queryRaw.mockResolvedValueOnce([] as never);
    queryRaw.mockResolvedValueOnce([{ id: "pack-1" }] as never);

    expect(await consumeCampaignCredit("org-1")).toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(maybeNotifyLimitReached).not.toHaveBeenCalled();
  });

  test("alerts when a pack's last credit is spent", async () => {
    onPlan(500, 500);
    queryRaw.mockResolvedValueOnce([] as never);
    queryRaw.mockResolvedValueOnce([{ id: "pack-1" }] as never);

    expect(await consumeCampaignCredit("org-1")).toBe(true);
    expect(maybeNotifyLimitReached).toHaveBeenCalledWith(
      "org-1",
      "campaignCredits",
      currentPeriodStart(),
    );
  });

  test("refuses and alerts when neither the plan nor a pack has a credit", async () => {
    onPlan(500, 500);
    queryRaw.mockResolvedValue([] as never);

    expect(await consumeCampaignCredit("org-1")).toBe(false);
    expect(maybeNotifyLimitReached).toHaveBeenCalledWith(
      "org-1",
      "campaignCredits",
      currentPeriodStart(),
    );
  });

  test("picks again when a concurrent send took the pack's credit first", async () => {
    onPlan(500, 500, [[10_000, 9_000]]);
    queryRaw.mockResolvedValueOnce([] as never);
    queryRaw.mockResolvedValueOnce([] as never);
    queryRaw.mockResolvedValueOnce([{ id: "pack-2" }] as never);

    expect(await consumeCampaignCredit("org-1")).toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(3);
  });

  test("always allows an uncapped plan, still counting the send", async () => {
    onPlan(UNLIMITED_COUNT);

    expect(await consumeCampaignCredit("org-1")).toBe(true);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
