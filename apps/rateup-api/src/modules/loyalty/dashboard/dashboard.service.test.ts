import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { count: vi.fn(), groupBy: vi.fn() },
    loyaltyTransaction: { groupBy: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    loyaltyRedemption: { count: vi.fn(), groupBy: vi.fn() },
    loyaltyReward: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { getLoyaltyDashboardStats } from "./dashboard.service.js";

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

interface ProgramFixture {
  id: string;
  currencySymbol: string;
  tiers: Array<Record<string, unknown>>;
}

function program(over: Record<string, unknown> = {}) {
  const base: ProgramFixture = { id: PROGRAM, currencySymbol: "₹", tiers: [] };
  return { ...base, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue(program());
  db.customerLoyaltyAccount.count.mockResolvedValue(0);
  db.customerLoyaltyAccount.groupBy.mockResolvedValue([]);
  db.loyaltyTransaction.groupBy.mockResolvedValue([]);
  db.loyaltyTransaction.aggregate.mockResolvedValue({ _sum: { points: null } });
  db.loyaltyTransaction.findMany.mockResolvedValue([]);
  db.loyaltyRedemption.count.mockResolvedValue(0);
  db.loyaltyRedemption.groupBy.mockResolvedValue([]);
  db.loyaltyReward.findMany.mockResolvedValue([]);
  db.$queryRaw.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getLoyaltyDashboardStats — no program", () => {
  test("returns a fully zeroed shape rather than throwing", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res).toEqual({
      programExists: false,
      programId: null,
      currencySymbol: null,
      summary: {
        totalMembers: 0,
        totalMembersChange: null,
        activeThisMonth: 0,
        activeThisMonthChange: null,
        pointsIssued: 0,
        pointsIssuedChange: null,
        rewardsRedeemed: 0,
        rewardsRedeemedChange: null,
      },
      memberGrowth: [],
      pointsActivity: [],
      tierDistribution: [],
      popularRewards: [],
      recentActivity: [],
    });
    expect(db.customerLoyaltyAccount.count).not.toHaveBeenCalled();
  });
});

describe("getLoyaltyDashboardStats — the summary", () => {
  test("scopes every count to the caller's program", async () => {
    await getLoyaltyDashboardStats(ORG);

    expect(db.customerLoyaltyAccount.count.mock.calls[0][0].where).toEqual({ programId: PROGRAM });
    expect(db.loyaltyRedemption.count.mock.calls[0][0].where).toEqual({
      account: { programId: PROGRAM },
      createdAt: { gte: expect.any(Date) },
    });
  });

  test("counts distinct active accounts, not transactions", async () => {
    db.loyaltyTransaction.groupBy.mockResolvedValue([{ accountId: "a" }, { accountId: "b" }]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.activeThisMonth).toBe(2);
    expect(db.loyaltyTransaction.groupBy.mock.calls[0][0].by).toEqual(["accountId"]);
  });

  test("treats an empty points sum as zero", async () => {
    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.pointsIssued).toBe(0);
  });

  test("reports the month-on-month change to one decimal place", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(150).mockResolvedValueOnce(120);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.totalMembersChange).toBe(25);
  });

  test("reports a fall as a negative change", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(90).mockResolvedValueOnce(120);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.totalMembersChange).toBe(-25);
  });

  test("reports no change at all when both months are empty", async () => {
    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.totalMembersChange).toBeNull();
  });

  // Growth from an empty previous month used to be reported as exactly +100%,
  // which is also the honest answer for a genuine doubling — the two were
  // indistinguishable on the card. There is no percentage change from zero, so it
  // answers null and the client shows the figure without a delta. Same shape as
  test("reports no percentage at all when there is nothing to compare against", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(500).mockResolvedValueOnce(0);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.totalMembersChange).toBeNull();
  });

  test("a genuine doubling is still +100%", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValueOnce(500).mockResolvedValueOnce(250);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.summary.totalMembersChange).toBe(100);
  });

  // NOTE: pins current behaviour. "Points issued" filters transactionType on the
  // lower-case "earn" and the monthly SQL filters 'earn'/'redeem' the same way,
  // but the approvals path writes "REDEEM" and "ADJUST" in upper case.
  // Every approved redemption and every manual adjustment is
  // therefore invisible to this dashboard.
  test("counts only lower-case transaction types", async () => {
    await getLoyaltyDashboardStats(ORG);

    expect(db.loyaltyTransaction.aggregate.mock.calls[0][0].where.transactionType).toBe("earn");
  });
});

describe("getLoyaltyDashboardStats — the breakdowns", () => {
  test("names each tier from the program, falling back for untiered members", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(
      program({ tiers: [{ id: "tier-1", name: "Gold" }] }),
    );
    db.customerLoyaltyAccount.groupBy.mockResolvedValue([
      { currentTierId: "tier-1", _count: 12 },
      { currentTierId: null, _count: 40 },
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.tierDistribution).toEqual([
      { name: "Gold", value: 12 },
      { name: "No Tier", value: 40 },
    ]);
  });

  test("resolves the top rewards' names and costs in one follow-up query", async () => {
    db.loyaltyRedemption.groupBy.mockResolvedValue([
      { rewardId: "rwd-1", _count: { rewardId: 9 } },
    ]);
    db.loyaltyReward.findMany.mockResolvedValue([
      { id: "rwd-1", name: "Free coffee", pointsCost: 100 },
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.popularRewards).toEqual([
      { id: "rwd-1", name: "Free coffee", pointsCost: 100, redeemed: 9 },
    ]);
  });

  test("labels a reward that has since been deleted", async () => {
    db.loyaltyRedemption.groupBy.mockResolvedValue([
      { rewardId: "rwd-gone", _count: { rewardId: 3 } },
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.popularRewards[0]).toMatchObject({ name: "Unknown Reward", pointsCost: 0 });
  });

  test("takes only the top five rewards", async () => {
    await getLoyaltyDashboardStats(ORG);

    expect(db.loyaltyRedemption.groupBy.mock.calls[0][0].take).toBe(5);
  });

  test("turns each growth row into a month label", async () => {
    db.$queryRaw.mockResolvedValueOnce([
      { month: new Date(2026, 0, 1), total_members: 10n, active_members: 4n },
      { month: new Date(2026, 1, 1), total_members: 25n, active_members: 9n },
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.memberGrowth).toEqual([
      { month: "Jan 2026", members: 10, active: 4 },
      { month: "Feb 2026", members: 25, active: 9 },
    ]);
  });

  // The label used to be the month name alone, with no year, over a six-month
  // window — so a window crossing a year boundary produced two identical labels
  // and a chart with two points labelled the same cannot be read.
  test("labels months with their year, so a year boundary is legible", async () => {
    db.$queryRaw.mockResolvedValueOnce([
      { month: new Date(2025, 0, 1), total_members: 5n, active_members: 1n },
      { month: new Date(2026, 0, 1), total_members: 50n, active_members: 20n },
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.memberGrowth.map((m) => m.month)).toEqual(["Jan 2025", "Jan 2026"]);
  });

  test("turns each points-activity row into issued and redeemed totals", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ month: new Date(2026, 2, 1), issued: 900n, redeemed: 300n }]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.pointsActivity).toEqual([{ month: "Mar 2026", issued: 900, redeemed: 300 }]);
  });
});

describe("getLoyaltyDashboardStats — recent activity", () => {
  interface TxnFixture {
    transactionType: string;
    points: number;
    createdAt: Date;
    description: string | null;
    source: string;
    account: { contact: { name: string } };
    reward: { name: string } | null;
  }

  const txn = (over: Record<string, unknown> = {}) => {
    const base: TxnFixture = {
      transactionType: "earn",
      points: 100,
      createdAt: new Date(2026, 2, 1),
      description: null,
      source: "purchase",
      account: { contact: { name: "Ann" } },
      reward: null,
    };
    return { ...base, ...over };
  };

  test("takes the five most recent transactions", async () => {
    await getLoyaltyDashboardStats(ORG);

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0]).toMatchObject({
      where: { programId: PROGRAM },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  });

  test("renders each transaction type as a past-tense verb", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([
      txn({ transactionType: "earn" }),
      txn({ transactionType: "redeem" }),
      txn({ transactionType: "adjust" }),
      txn({ transactionType: "expire" }),
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.recentActivity.map((a) => a.action)).toEqual([
      "earned",
      "redeemed",
      "adjusted",
      "expired",
    ]);
  });

  // The verb map used to be keyed on the lower-case types only, so a transaction
  // written by the approvals path showed the raw column value and the feed read
  // "Ann REDEEM Free coffee". Every writer uses lower case now,
  // but rows written before that fix are still in the table, so the lookup folds
  // case.
  test("reads an approval-written transaction the same as any other", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([
      txn({ transactionType: "REDEEM" }),
      txn({ transactionType: "ADJUST" }),
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.recentActivity.map((a) => a.action)).toEqual(["redeemed", "adjusted"]);
  });

  test("prefers the reward's name, then the description, then the source", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([
      txn({ reward: { name: "Free coffee" } }),
      txn({ description: "Manual top-up" }),
      txn(),
    ]);

    const res = await getLoyaltyDashboardStats(ORG);

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

    const res = await getLoyaltyDashboardStats(ORG);

    expect(res.recentActivity[0].user).toBe("Unknown");
  });
});
