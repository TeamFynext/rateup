import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: { usageStats: { updateMany: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../notification/notification.service.js", () => ({
  notifyLimitReached: vi.fn(),
  notifyOrderLimitNearing: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import {
  notifyLimitReached,
  notifyOrderLimitNearing,
} from "../notification/notification.service.js";
import { maybeNotifyLimitReached, maybeNotifyOrderUsage } from "./limitAlerts.js";

const period = new Date("2026-10-01T00:00:00Z");
const updateMany = vi.mocked(prisma.usageStats.updateMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("maybeNotifyLimitReached", () => {
  test.each([
    ["activeContacts", "activeContactLimitNotifiedPeriod"],
    ["campaignCredits", "campaignCreditLimitNotifiedPeriod"],
    ["shopOrders", "shopOrderLimitNotifiedPeriod"],
  ] as const)("claims the %s period on its own column", async (limit, column) => {
    updateMany.mockResolvedValue({ count: 1 } as never);

    await maybeNotifyLimitReached("org-1", limit, period);

    expect(updateMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", OR: [{ [column]: null }, { [column]: { not: period } }] },
      data: { [column]: period },
    });
    expect(notifyLimitReached).toHaveBeenCalledWith("org-1", limit);
  });

  test("does not notify when this period was already claimed", async () => {
    updateMany.mockResolvedValue({ count: 0 } as never);

    await maybeNotifyLimitReached("org-1", "activeContacts", period);

    expect(notifyLimitReached).not.toHaveBeenCalled();
  });

  test("never throws into the metering that called it", async () => {
    updateMany.mockRejectedValue(new Error("db down"));

    await expect(maybeNotifyLimitReached("org-1", "campaignCredits", period)).resolves.toBe(
      undefined,
    );
    expect(log.error).toHaveBeenCalled();
  });
});

describe("maybeNotifyOrderUsage", () => {
  test("stays quiet below 80% of the month's orders", async () => {
    await maybeNotifyOrderUsage("org-1", 39, 50, period);
    expect(updateMany).not.toHaveBeenCalled();
  });

  test("warns once at 80%, on its own column", async () => {
    updateMany.mockResolvedValue({ count: 1 } as never);
    await maybeNotifyOrderUsage("org-1", 40, 50, period);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        OR: [{ shopOrderLimitWarnedPeriod: null }, { shopOrderLimitWarnedPeriod: { not: period } }],
      },
      data: { shopOrderLimitWarnedPeriod: period },
    });
    expect(notifyOrderLimitNearing).toHaveBeenCalledWith("org-1", 40, 50);

    updateMany.mockResolvedValue({ count: 0 } as never);
    await maybeNotifyOrderUsage("org-1", 41, 50, period);
    expect(notifyOrderLimitNearing).toHaveBeenCalledTimes(1);
  });

  test("sends the limit alert at 100%", async () => {
    updateMany.mockResolvedValue({ count: 1 } as never);
    await maybeNotifyOrderUsage("org-1", 50, 50, period);
    expect(notifyLimitReached).toHaveBeenCalledWith("org-1", "shopOrders");
    expect(notifyOrderLimitNearing).not.toHaveBeenCalled();
  });

  test("does nothing for an unmetered plan", async () => {
    await maybeNotifyOrderUsage("org-1", 5_000, undefined, period);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
