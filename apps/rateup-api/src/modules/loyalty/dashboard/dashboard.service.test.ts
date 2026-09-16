import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
    loyaltyTransaction: { findMany: vi.fn() },
    loyaltyRedemption: { groupBy: vi.fn() },
    loyaltyReward: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { dashboardResponseSchema } from "./dashboard.schema.js";
import { calcChangePercent, getLoyaltyDashboardStats } from "./dashboard.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  customerLoyaltyAccount: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  $queryRaw: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";
const NOW = new Date("2026-09-03T10:00:00Z");

/** Decimal columns arrive as objects with toString, the way Prisma hands them back. */
const decimal = (value: string) => ({ toString: () => value, toJSON: () => value });

const REWARD = {
  id: "rwd-1",
  name: "Free coffee",
  pointsCost: 500,
  rewardValue: { type: "free_item", item_value: 150 },
};

function program(over: Record<string, unknown> = {}) {
  return {
    id: PROGRAM,
    currencySymbol: "₹",
    currencyName: "Beans",
    averageOrderValue: decimal("250"),
    tiersEnabled: false,
    signupBonus: 0,
    referralBonus: 0,
    refereeBonus: 0,
    enablePointsExpiration: true,
    pointsExpirationMonths: 12,
    tiers: [],
    earningRules: [
      {
        id: "rule-1",
        isDefault: true,
        pointsPerUnit: decimal("1"),
        multiplier: decimal("1"),
        bonusPoints: 0,
      },
    ],
    rewards: [REWARD],
    ...over,
  };
}

/**
 * Six raw statements run per request; each is tagged with a comment so the mock can
 * answer by statement rather than by call order.
 */
type RawRows = Partial<
  Record<"windows" | "repeat" | "redemptions" | "members" | "tx-days" | "member-days", unknown[]>
>;

function armRaw(rows: RawRows) {
  db.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    for (const tag of Object.keys(rows) as Array<keyof RawRows>) {
      if (sql.includes(`loyalty-dashboard: ${tag}`)) return Promise.resolve(rows[tag]);
    }
    return Promise.resolve([]);
  });
}

function rawSqlFor(tag: string): string {
  const call = db.$queryRaw.mock.calls.find((c) =>
    (c[0] as TemplateStringsArray).join("?").includes(`loyalty-dashboard: ${tag}`),
  );
  return call ? (call[0] as TemplateStringsArray).join("?") : "";
}

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue(program());
  db.customerLoyaltyAccount.count.mockResolvedValue(0);
  db.customerLoyaltyAccount.groupBy.mockResolvedValue([]);
  db.customerLoyaltyAccount.aggregate.mockResolvedValue({
    _sum: { currentPoints: null, totalSpend: null },
  });
  db.loyaltyTransaction.findMany.mockResolvedValue([]);
  db.loyaltyRedemption.groupBy.mockResolvedValue([]);
  db.loyaltyReward.findMany.mockResolvedValue([]);
  armRaw({});
});

const run = (opts: Record<string, unknown> = {}) =>
  getLoyaltyDashboardStats(ORG, { now: NOW, ...opts });

describe("getLoyaltyDashboardStats — no program", () => {
  test("returns a zeroed shape that still carries the period, and touches no tables", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);

    const res = await run();

    expect(res.programExists).toBe(false);
    expect(res.metrics.totalMembers).toBe(0);
    expect(res.metrics.redemptionRate).toEqual({ current: null, previous: null, changePct: null });
    expect(res.period.label).toBe("Last 30 days");
    expect(res.liability.monetaryValue).toBeNull();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(() => dashboardResponseSchema.parse(res)).not.toThrow();
  });
});

describe("getLoyaltyDashboardStats — period selection", () => {
  test("defaults to the last 30 days in UTC", async () => {
    const res = await run();

    expect(res.period).toMatchObject({ key: "30d", granularity: "week", tz: "UTC" });
    expect(res.period.current.start).toBe("2026-08-05T00:00:00.000Z");
  });

  test("honours period and tz, and maps a legacy days value", async () => {
    expect((await run({ period: "12m", tz: "Asia/Kolkata" })).period).toMatchObject({
      key: "12m",
      granularity: "month",
      tz: "Asia/Kolkata",
    });
    expect((await run({ days: 90 })).period.key).toBe("90d");
  });

  test("passes the window bounds and programme to every raw statement", async () => {
    await run();

    const calls = db.$queryRaw.mock.calls;
    expect(calls).toHaveLength(6);
    for (const call of calls) {
      expect(call.slice(1)).toContain(PROGRAM);
    }
    expect(rawSqlFor("windows")).toContain("FILTER (WHERE type = 'earn')");
    expect(rawSqlFor("tx-days")).toContain("AT TIME ZONE");
  });
});

describe("getLoyaltyDashboardStats — the metrics", () => {
  test("reads both windows from one scan and coerces bigint and numeric strings", async () => {
    armRaw({
      windows: [
        {
          is_current: true,
          issued: 6240n,
          redeemed: 2150n,
          revenue: "58420.50",
          active_members: 40n,
        },
        {
          is_current: false,
          issued: 5600n,
          redeemed: 1800n,
          revenue: "51260",
          active_members: 32n,
        },
      ],
    });

    const res = await run();

    expect(res.metrics.pointsIssued).toEqual({ current: 6240, previous: 5600, changePct: 11.4 });
    expect(res.metrics.pointsRedeemed.current).toBe(2150);
    expect(res.metrics.revenue).toEqual({ current: 58420.5, previous: 51260, changePct: 14 });
    expect(res.metrics.activeMembers.current).toBe(40);
    expect(() => dashboardResponseSchema.parse(res)).not.toThrow();
  });

  test("a missing window row reads as zero and a zero previous window has no change", async () => {
    armRaw({
      windows: [{ is_current: true, issued: 100n, redeemed: 0n, revenue: 0, active_members: 1n }],
    });

    const res = await run();

    expect(res.metrics.pointsIssued).toEqual({ current: 100, previous: 0, changePct: null });
  });

  test("redemption rate is redeemed over issued, null when nothing was issued", async () => {
    armRaw({
      windows: [
        { is_current: true, issued: 1000n, redeemed: 340n, revenue: 0, active_members: 0n },
        { is_current: false, issued: 0n, redeemed: 0n, revenue: 0, active_members: 0n },
      ],
    });

    const res = await run();

    expect(res.metrics.redemptionRate).toEqual({ current: 34, previous: null, changePct: null });
  });

  test("repeat visit rate is repeaters over buyers, null with no buyers", async () => {
    armRaw({
      repeat: [
        { is_current: true, buyers: 4n, repeaters: 2n },
        { is_current: false, buyers: 0n, repeaters: 0n },
      ],
    });

    const res = await run();

    expect(res.metrics.repeatVisitRate).toEqual({
      current: 50,
      previous: null,
      changePct: null,
      buyers: 4,
      repeaters: 2,
    });
    expect(rawSqlFor("repeat")).toContain("source = 'purchase'");
  });

  test("counts only completed redemptions as rewards redeemed", async () => {
    armRaw({
      redemptions: [
        { is_current: true, n: 43n },
        { is_current: false, n: 36n },
      ],
    });

    const res = await run();

    expect(res.metrics.rewardsRedeemed).toEqual({ current: 43, previous: 36, changePct: 19.4 });
    expect(rawSqlFor("redemptions")).toContain("IN ('APPROVED', 'USED')");
  });

  test("members: total, new in each window", async () => {
    armRaw({
      members: [{ total: 957n, new_current: 70n, new_previous: 50n, total_at_period_start: 887n }],
    });

    const res = await run();

    expect(res.metrics.totalMembers).toBe(957);
    expect(res.metrics.newMembers).toEqual({ current: 70, previous: 50, changePct: 40 });
  });

  test("actual giveback values redeemed points at the best reward over loyalty revenue", async () => {
    // Free coffee: 500 points for ₹150 → ₹0.30 a point. 2000 points redeemed on ₹20,000.
    armRaw({
      windows: [
        { is_current: true, issued: 5000n, redeemed: 2000n, revenue: "20000", active_members: 1n },
      ],
    });

    const res = await run();

    expect(res.metrics.actualGivebackPct.current).toBe(3);
    expect(res.giveback).toEqual({
      modelledPct: 30,
      band: "excessive",
      pointValue: { best: 0.3, worst: 0.3 },
    });
  });
});

describe("getLoyaltyDashboardStats — liability and affordability", () => {
  test("values outstanding points at the best reward", async () => {
    db.customerLoyaltyAccount.aggregate.mockResolvedValue({
      _sum: { currentPoints: 184300, totalSpend: decimal("584200.00") },
    });

    const res = await run();

    expect(res.liability).toEqual({
      outstandingPoints: 184300,
      monetaryValue: 55290,
      enablePointsExpiration: true,
      pointsExpirationMonths: 12,
    });
    expect(res.revenue.lifetimeTotalSpend).toBe(584200);
  });

  test("has no monetary liability when no reward prices a point", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(program({ rewards: [] }));
    db.customerLoyaltyAccount.aggregate.mockResolvedValue({
      _sum: { currentPoints: 500, totalSpend: null },
    });

    const res = await run();

    expect(res.liability.monetaryValue).toBeNull();
    expect(res.giveback.pointValue).toBeNull();
  });

  test("counts members below the cheapest priced reward, ignoring free coupons", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(
      program({
        rewards: [
          { ...REWARD, pointsCost: 500 },
          {
            id: "rwd-2",
            name: "₹50 off",
            pointsCost: 250,
            rewardValue: { type: "discount_fixed", amount: 50 },
          },
          {
            id: "rwd-3",
            name: "MONSOON50",
            pointsCost: 0,
            rewardValue: { type: "discount_fixed", amount: 50 },
          },
        ],
      }),
    );
    db.customerLoyaltyAccount.count.mockResolvedValue(604);

    const res = await run();

    expect(res.rewardsAffordability).toEqual({
      cheapestRewardCost: 250,
      cheapestRewardName: "₹50 off",
      membersBelowCheapestReward: 604,
    });
    expect(db.customerLoyaltyAccount.count).toHaveBeenCalledWith({
      where: { programId: PROGRAM, currentPoints: { lt: 250 } },
    });
  });

  test("skips the count entirely when no reward is priced", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(program({ rewards: [] }));

    const res = await run();

    expect(res.rewardsAffordability.membersBelowCheapestReward).toBeNull();
    expect(db.customerLoyaltyAccount.count).not.toHaveBeenCalled();
  });
});

describe("getLoyaltyDashboardStats — timeline", () => {
  test("buckets daily rows into weeks and accumulates members from the period start", async () => {
    armRaw({
      members: [{ total: 120n, new_current: 20n, new_previous: 0n, total_at_period_start: 100n }],
      "tx-days": [
        { day: "2026-08-05", issued: 100n, redeemed: 0n },
        { day: "2026-08-09", issued: 50n, redeemed: 20n },
        { day: "2026-08-12", issued: 10n, redeemed: 0n },
        { day: "2026-09-03", issued: 5n, redeemed: 5n },
      ],
      "member-days": [
        { day: "2026-08-06", joined: 15n },
        { day: "2026-08-20", joined: 5n },
      ],
    });

    const res = await run();

    expect(res.timeline).toHaveLength(5);
    expect(res.timeline[0]).toEqual({
      start: "2026-08-05T00:00:00.000Z",
      label: "5 Aug",
      issued: 150,
      redeemed: 20,
      members: 115,
      newMembers: 15,
    });
    expect(res.timeline[1]).toMatchObject({ issued: 10, members: 115, newMembers: 0 });
    expect(res.timeline[2]).toMatchObject({ members: 120, newMembers: 5 });
    expect(res.timeline[4]).toMatchObject({ label: "2 Sep", issued: 5, redeemed: 5, members: 120 });
  });

  test("uses monthly buckets for the 12 month period", async () => {
    armRaw({ "tx-days": [{ day: "2026-03-14", issued: 900n, redeemed: 300n }] });

    const res = await run({ period: "12m" });

    expect(res.timeline).toHaveLength(12);
    expect(res.timeline[5]).toMatchObject({ label: "Mar 2026", issued: 900, redeemed: 300 });
  });

  test("ignores a day the database reports outside the window", async () => {
    armRaw({ "tx-days": [{ day: "2020-01-01", issued: 900n, redeemed: 0n }] });

    const res = await run();

    expect(res.timeline.every((b) => b.issued === 0)).toBe(true);
  });
});

describe("getLoyaltyDashboardStats — the breakdowns", () => {
  test("lists every configured tier, empty ones included, then the untiered bucket", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(
      program({
        tiers: [
          {
            id: "tier-1",
            name: "Bronze",
            threshold: decimal("0"),
            pointsMultiplier: decimal("1.00"),
            color: "#a00",
          },
          {
            id: "tier-2",
            name: "Gold",
            threshold: decimal("15000"),
            pointsMultiplier: decimal("1.50"),
            color: "#fc0",
          },
        ],
      }),
    );
    db.customerLoyaltyAccount.groupBy.mockResolvedValue([
      { currentTierId: "tier-1", _count: 812 },
      { currentTierId: null, _count: 40 },
    ]);

    const res = await run();

    expect(res.tierDistribution).toEqual([
      {
        id: "tier-1",
        name: "Bronze",
        value: 812,
        threshold: 0,
        pointsMultiplier: 1,
        color: "#a00",
      },
      {
        id: "tier-2",
        name: "Gold",
        value: 0,
        threshold: 15000,
        pointsMultiplier: 1.5,
        color: "#fc0",
      },
      {
        id: null,
        name: "No Tier",
        value: 40,
        threshold: null,
        pointsMultiplier: null,
        color: null,
      },
    ]);
    expect(() => dashboardResponseSchema.parse(res)).not.toThrow();
  });

  test("names the top rewards from the loaded catalogue without a follow-up query", async () => {
    db.loyaltyRedemption.groupBy.mockResolvedValue([
      { rewardId: "rwd-1", _count: { rewardId: 9 } },
    ]);

    const res = await run();

    expect(res.popularRewards).toEqual([
      { id: "rwd-1", name: "Free coffee", pointsCost: 500, redeemed: 9 },
    ]);
    expect(db.loyaltyReward.findMany).not.toHaveBeenCalled();
  });

  test("looks up a retired reward once, and labels one that is gone", async () => {
    db.loyaltyRedemption.groupBy.mockResolvedValue([
      { rewardId: "rwd-old", _count: { rewardId: 3 } },
      { rewardId: "rwd-gone", _count: { rewardId: 1 } },
    ]);
    db.loyaltyReward.findMany.mockResolvedValue([
      { id: "rwd-old", name: "Cake slice", pointsCost: 1200 },
    ]);

    const res = await run();

    expect(res.popularRewards).toEqual([
      { id: "rwd-old", name: "Cake slice", pointsCost: 1200, redeemed: 3 },
      { id: "rwd-gone", name: "Unknown Reward", pointsCost: 0, redeemed: 1 },
    ]);
    expect(db.loyaltyReward.findMany).toHaveBeenCalledTimes(1);
  });

  test("popular rewards are the completed redemptions of this window, top five", async () => {
    await run();

    const args = db.loyaltyRedemption.groupBy.mock.calls[0][0];
    expect(args.take).toBe(5);
    expect(args.where).toEqual({
      reward: { programId: PROGRAM },
      status: { in: ["APPROVED", "USED"] },
      createdAt: { gte: new Date("2026-08-05T00:00:00Z"), lt: new Date("2026-09-04T00:00:00Z") },
    });
  });
});

describe("getLoyaltyDashboardStats — recent activity", () => {
  const txn = (over: Record<string, unknown> = {}) => ({
    transactionType: "earn",
    points: 100,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    description: null,
    source: "purchase",
    account: { contact: { name: "Ann" } },
    reward: null,
    ...over,
  });

  test("takes the five most recent transactions", async () => {
    await run();

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0]).toMatchObject({
      where: { programId: PROGRAM },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  });

  test("renders each transaction type as a past-tense verb, whatever its casing", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([
      txn({ transactionType: "earn" }),
      txn({ transactionType: "REDEEM" }),
      txn({ transactionType: "adjust" }),
      txn({ transactionType: "expire" }),
    ]);

    const res = await run();

    expect(res.recentActivity.map((a) => a.action)).toEqual([
      "earned",
      "redeemed",
      "adjusted",
      "expired",
    ]);
    expect(res.recentActivity[0].createdAt).toBe("2026-03-01T00:00:00.000Z");
  });

  test("prefers the reward's name, then the description, then the source", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([
      txn({ reward: { name: "Free coffee" } }),
      txn({ description: "Manual top-up" }),
      txn(),
    ]);

    const res = await run();

    expect(res.recentActivity.map((a) => a.item)).toEqual([
      "Free coffee",
      "Manual top-up",
      "purchase",
    ]);
  });

  test("labels a contact with no name as Unknown", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([
      txn({ account: { contact: { name: null } } }),
    ]);

    expect((await run()).recentActivity[0].user).toBe("Unknown");
  });
});

describe("calcChangePercent", () => {
  test("rounds to one decimal, signs a fall, and is null against an empty base", () => {
    expect(calcChangePercent(150, 120)).toBe(25);
    expect(calcChangePercent(90, 120)).toBe(-25);
    expect(calcChangePercent(500, 0)).toBeNull();
  });
});
