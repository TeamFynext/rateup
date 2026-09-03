import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    org: { count: vi.fn() },
    user: { count: vi.fn() },
    payments: { aggregate: vi.fn() },
    order: { groupBy: vi.fn() },
    usageStats: { aggregate: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import prisma from "../../utils/prisma.js";
import { getAdminOverview } from "./admin.service.js";

/**
 * `$queryRaw` is called in a fixed order inside one `Promise.all`: monthly revenue, org
 * signups, user signups, plan mix, then the busiest accounts. Queueing the results keeps
 * the test readable without asserting on SQL text.
 */
function queueRawResults(results: unknown[]) {
  const queue = [...results];
  vi.mocked(prisma.$queryRaw).mockImplementation(
    () => Promise.resolve(queue.shift() ?? []) as never,
  );
}

describe("the admin overview", () => {
  beforeEach(() => {
    vi.mocked(prisma.org.count)
      .mockReset()
      .mockResolvedValue(0 as never);
    vi.mocked(prisma.user.count)
      .mockReset()
      .mockResolvedValue(0 as never);
    vi.mocked(prisma.payments.aggregate)
      .mockReset()
      .mockResolvedValue({ _sum: { amount: 0 } } as never);
    vi.mocked(prisma.order.groupBy)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.usageStats.aggregate)
      .mockReset()
      .mockResolvedValue({ _sum: {} } as never);
    queueRawResults([[], [], [], [], []]);
  });

  test("reports revenue in rupees, not the gateway's minor units", async () => {
    // `Payments.amount` holds what Razorpay sent, which is paise. `RateupPlan.price` is
    // rupees. Reporting them unconverted puts revenue and MRR a hundredfold apart, and a
    // ₹2,400 charge reads as ₹2,40,000 on the dashboard.
    vi.mocked(prisma.payments.aggregate).mockResolvedValue({
      _sum: { amount: 240_000 },
    } as never);

    const overview = await getAdminOverview(3);

    expect(overview.totals.revenueAllTime).toBe(2_400);
  });

  test("counts recurring revenue only from tiers that carry a price", async () => {
    // Free and sales-led tiers have no price. Counting their orgs as revenue would make
    // MRR a headcount rather than money.
    queueRawResults([
      [],
      [],
      [],
      [
        { plan: "Free", orgs: 40n, price: null },
        { plan: "Plus", orgs: 3n, price: 2_000 },
        { plan: "Max", orgs: 2n, price: 9_000 },
        { plan: "Enterprise", orgs: 1n, price: null },
      ],
      [],
    ]);

    const overview = await getAdminOverview(3);

    expect(overview.totals.mrr).toBe(3 * 2_000 + 2 * 9_000);
    expect(overview.totals.paidSubscriptions).toBe(5);
    expect(overview.totals.arpa).toBe(Math.round(24_000 / 5));
  });

  test("has no ARPA to report when nobody is paying", async () => {
    const overview = await getAdminOverview(3);

    expect(overview.totals.paidSubscriptions).toBe(0);
    expect(overview.totals.arpa).toBe(0);
  });

  test("zero-fills every month so a quiet month is a zero, not a gap", async () => {
    const overview = await getAdminOverview(6);

    expect(overview.revenue).toHaveLength(6);
    expect(overview.signups.orgs).toHaveLength(6);
    expect(overview.signups.users).toHaveLength(6);
    expect(overview.revenue.every((point) => point.value === 0)).toBe(true);
  });

  test("returns the months in ascending order, ending with the current one", async () => {
    const overview = await getAdminOverview(4);

    const months = overview.revenue.map((point) => point.month);
    expect([...months].sort()).toEqual(months);
    expect(months.at(-1)).toBe(new Date().toISOString().slice(0, 8) + "01");
  });
});
