import dayjs from "dayjs";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    usageStats: { upsert: vi.fn(), updateMany: vi.fn() },
    subscription: { findUnique: vi.fn() },
    // The allowance now includes conversation packs, so the lookup goes through
    // getConversationAllowance rather than reading the plan's number directly.
    subscriptionAddon: { findMany: vi.fn(() => Promise.resolve([])) },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../notification/notification.service.js", () => ({
  notifyConversationLimitReached: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { notifyConversationLimitReached } from "../notification/notification.service.js";
import {
  incrementConversationCount,
  incrementMeteredConversationCount,
  resetMonthlyCounts,
} from "./stats.service.js";

const upsertMock = prisma.usageStats.upsert as unknown as ReturnType<typeof vi.fn>;
const updateManyMock = prisma.usageStats.updateMany as unknown as ReturnType<typeof vi.fn>;
const subMock = prisma.subscription.findUnique as unknown as ReturnType<typeof vi.fn>;
const notifyMock = notifyConversationLimitReached as unknown as ReturnType<typeof vi.fn>;

function seedSubscription({ max = 500, isAnnual = false }: { max?: number; isAnnual?: boolean }) {
  subMock.mockResolvedValue({
    isAnnualMessageLimit: isAnnual,
    features: { whatsapp: { conversation: { count: { max } } } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  subMock.mockResolvedValue(null); // default: no limit → never notifies
  // The notifier claims the one-shot flag with a conditional updateMany; a claim of
  // 1 row is the "we won the race" default.
  updateManyMock.mockResolvedValue({ count: 1 });
});

describe("incrementConversationCount", () => {
  test("upserts, incrementing BOTH the monthly and annual counters", async () => {
    upsertMock.mockResolvedValue({});
    await incrementConversationCount("org-1");

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      update: {
        monthlyConversationsCount: { increment: 1 },
        annualConversationsCount: { increment: 1 },
      },
      create: { orgId: "org-1", monthlyConversationsCount: 1, annualConversationsCount: 1 },
    });
  });

  test("is best-effort: swallows errors and logs instead of throwing", async () => {
    upsertMock.mockRejectedValue(new Error("db down"));
    await expect(incrementConversationCount("org-1")).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("incrementConversationCount no longer meters the plan", () => {
  test("does not notify, even at the limit — the inbox counter is analytics only", async () => {
    seedSubscription({ max: 500 });
    upsertMock.mockResolvedValue({
      monthlyConversationsCount: 500,
      annualConversationsCount: 500,
      conversationLimitNotifiedAt: null,
    });

    await incrementConversationCount("org-1");
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe("incrementMeteredConversationCount", () => {
  test("upserts, incrementing BOTH metered counters", async () => {
    upsertMock.mockResolvedValue({});
    await incrementMeteredConversationCount("org-1");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      update: {
        monthlyMeteredConversationsCount: { increment: 1 },
        annualMeteredConversationsCount: { increment: 1 },
      },
      create: {
        orgId: "org-1",
        monthlyMeteredConversationsCount: 1,
        annualMeteredConversationsCount: 1,
      },
    });
  });

  test("is best-effort: swallows errors and logs instead of throwing", async () => {
    upsertMock.mockRejectedValue(new Error("db down"));
    await expect(incrementMeteredConversationCount("org-1")).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("incrementMeteredConversationCount — limit-reached notification", () => {
  const usage = (over: Partial<Record<string, unknown>> = {}) => ({
    monthlyMeteredConversationsCount: 0,
    annualMeteredConversationsCount: 0,
    conversationLimitNotifiedAt: null,
    ...over,
  });

  test("notifies on the increment that reaches the monthly limit", async () => {
    seedSubscription({ max: 500 });
    upsertMock.mockResolvedValue(usage({ monthlyMeteredConversationsCount: 500 }));

    await incrementMeteredConversationCount("org-1");

    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith("org-1");
  });

  test("does not notify below the limit", async () => {
    seedSubscription({ max: 500 });
    upsertMock.mockResolvedValue(usage({ monthlyMeteredConversationsCount: 499 }));

    await incrementMeteredConversationCount("org-1");
    expect(notifyMock).not.toHaveBeenCalled();
  });

  test("still notifies when concurrent increments overshoot the limit", async () => {
    // The regression this replaces: `=== max` meant two racing increments stepping
    // 499 -> 501 skipped the notification for the entire cycle. `>=` catches up.
    seedSubscription({ max: 500 });
    upsertMock.mockResolvedValue(usage({ monthlyMeteredConversationsCount: 501 }));

    await incrementMeteredConversationCount("org-1");
    expect(notifyMock).toHaveBeenCalledWith("org-1");
  });

  test("does not re-notify once the cycle's flag is already set", async () => {
    seedSubscription({ max: 500 });
    upsertMock.mockResolvedValue(
      usage({ monthlyMeteredConversationsCount: 900, conversationLimitNotifiedAt: new Date() }),
    );

    await incrementMeteredConversationCount("org-1");
    expect(notifyMock).not.toHaveBeenCalled();
  });

  test("does not notify when another concurrent call won the claim", async () => {
    seedSubscription({ max: 500 });
    upsertMock.mockResolvedValue(usage({ monthlyMeteredConversationsCount: 500 }));
    updateManyMock.mockResolvedValue({ count: 0 });

    await incrementMeteredConversationCount("org-1");
    expect(notifyMock).not.toHaveBeenCalled();
  });

  test("annual plans notify at the pooled max * 12", async () => {
    seedSubscription({ max: 500, isAnnual: true });
    upsertMock.mockResolvedValue(
      usage({ monthlyMeteredConversationsCount: 10, annualMeteredConversationsCount: 6000 }),
    );

    await incrementMeteredConversationCount("org-1");
    expect(notifyMock).toHaveBeenCalledWith("org-1");
  });

  test("never notifies when the plan has no conversation limit", async () => {
    subMock.mockResolvedValue(null);
    upsertMock.mockResolvedValue(usage({ monthlyMeteredConversationsCount: 999 }));

    await incrementMeteredConversationCount("org-1");
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe("resetMonthlyCounts", () => {
  test("targets only orgs whose 30-day cycle elapsed (or was never reset)", async () => {
    updateManyMock.mockResolvedValue({ count: 3 });
    await resetMonthlyCounts();

    const arg = updateManyMock.mock.calls[0][0];
    expect(Array.isArray(arg.where.OR)).toBe(true);

    // Clause 1: last reset was at least ~30 days ago.
    const cutoff = arg.where.OR[0].lastMonthlyResettedDate.lte;
    expect(cutoff).toBeInstanceOf(Date);
    const daysAgo = dayjs().diff(dayjs(cutoff), "day");
    expect(daysAgo).toBeGreaterThanOrEqual(29);
    expect(daysAgo).toBeLessThanOrEqual(31);

    // Clause 2: never reset before.
    expect(arg.where.OR[1]).toEqual({ lastMonthlyResettedDate: null });
  });

  test("zeroes the monthly counters and stamps the reset date", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    await resetMonthlyCounts();

    const { data } = updateManyMock.mock.calls[0][0];
    expect(data.monthlyConversationsCount).toBe(0);
    expect(data.monthlySurveyResponses).toBe(0);
    expect(data.monthlyWaSurveyResponses).toBe(0);
    expect(data.monthlyAutomationTriggerCount).toBe(0);
    expect(data.monthlyTemplateMessageCount).toBe(0);
    expect(data.lastMonthlyResettedDate).toBeInstanceOf(Date);
  });

  test("never touches the annual conversation counter (that resets yearly)", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    await resetMonthlyCounts();

    const { data } = updateManyMock.mock.calls[0][0];
    expect("annualConversationsCount" in data).toBe(false);
  });

  test("wraps failures in a descriptive error", async () => {
    updateManyMock.mockRejectedValue(new Error("boom"));
    await expect(resetMonthlyCounts()).rejects.toThrow(/reseting monthly counts/i);
  });
});
