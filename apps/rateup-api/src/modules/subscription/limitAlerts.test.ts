import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { usageStats: { updateMany: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../notification/notification.service.js", () => ({ notifyLimitReached: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { notifyLimitReached } from "../notification/notification.service.js";
import { maybeNotifyLimitReached } from "./limitAlerts.js";

const period = new Date("2026-10-01T00:00:00Z");
const updateMany = vi.mocked(prisma.usageStats.updateMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("maybeNotifyLimitReached", () => {
  test.each([
    ["activeContacts", "activeContactLimitNotifiedPeriod"],
    ["campaignCredits", "campaignCreditLimitNotifiedPeriod"],
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
