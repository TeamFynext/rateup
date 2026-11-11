import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: { usageStats: { findUnique: vi.fn() } },
}));

import prisma from "../../../utils/prisma.js";
import { currentPeriodStart } from "./billingPeriod.js";
import { countPlacedOrder, shopOrdersThisMonth } from "./shopOrders.js";

const findUnique = vi.mocked(prisma.usageStats.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shopOrdersThisMonth", () => {
  test("reads the counter for this month", async () => {
    findUnique.mockResolvedValue({
      shopOrdersCount: 12,
      shopOrdersPeriodStart: currentPeriodStart(),
    } as never);
    expect(await shopOrdersThisMonth("org-1")).toBe(12);
  });

  test("a counter left from last month reads as zero", async () => {
    findUnique.mockResolvedValue({
      shopOrdersCount: 50,
      shopOrdersPeriodStart: new Date("2020-01-01T00:00:00Z"),
    } as never);
    expect(await shopOrdersThisMonth("org-1")).toBe(0);
  });

  test("an org that has never placed an order has used none", async () => {
    findUnique.mockResolvedValue(null as never);
    expect(await shopOrdersThisMonth("org-1")).toBe(0);
  });
});

describe("countPlacedOrder", () => {
  test("restarts the count in a new month and returns the month's total", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ count: 1 }]) };
    const at = new Date("2026-11-03T10:00:00Z");

    expect(await countPlacedOrder(tx as never, "org-1", at)).toBe(1);

    const [sql, ...values] = tx.$queryRaw.mock.calls[0];
    expect(sql.join("?")).toMatch(
      /"shopOrdersPeriodStart" = \?::date\s+THEN "UsageStats"\."shopOrdersCount" \+ 1\s+ELSE 1/,
    );
    expect(values).toContain("2026-11-01");
  });
});
