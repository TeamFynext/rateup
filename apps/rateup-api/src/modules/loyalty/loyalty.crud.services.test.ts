import { beforeEach, describe, expect, test, vi } from "vitest";

// The four small CRUD services behind the loyalty admin screens — program,
// tiers, rewards and earning rules — share one prisma stub.
vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loyaltyTier: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loyaltyReward: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loyaltyEarningRule: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loyaltyRedemption: { count: vi.fn() },
    loyaltyTransaction: { createMany: vi.fn() },
    customerLoyaltyAccount: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import {
  createLoyaltyProgram,
  deleteLoyaltyProgram,
  getLoyaltyProgramByOrg,
  resetProgramPoints,
  updateLoyaltyProgram,
} from "./program/program.service.js";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyTiers,
  updateLoyaltyTier,
} from "./tiers/tier.service.js";
import {
  createLoyaltyReward,
  deleteLoyaltyReward,
  getActiveLoyaltyRewards,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  incrementRewardStock,
  updateLoyaltyReward,
} from "./rewards/reward.service.js";
import {
  createLoyaltyEarningRule,
  getActiveLoyaltyEarningRules,
  getLoyaltyEarningRules,
} from "./earningRules/earningRule.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyProgram: Record<string, Mock>;
  loyaltyTier: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  loyaltyEarningRule: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyProgram.findUnique.mockResolvedValue(null);
  db.loyaltyTier.findFirst.mockResolvedValue(null);
  db.loyaltyTier.findMany.mockResolvedValue([]);
  db.loyaltyReward.findMany.mockResolvedValue([]);
  db.loyaltyEarningRule.findMany.mockResolvedValue([]);
  db.loyaltyRedemption.count.mockResolvedValue(0);
  db.customerLoyaltyAccount.count.mockResolvedValue(0);
  db.customerLoyaltyAccount.findMany.mockResolvedValue([]);
});

// ===========================================================================
// program
// ===========================================================================

describe("createLoyaltyProgram", () => {
  test("refuses a second program for the same org", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue({ id: PROGRAM });

    await expect(createLoyaltyProgram({ name: "Rewards" } as any, ORG)).rejects.toThrow(
      "Loyalty program already exists for this organization",
    );
    expect(db.loyaltyProgram.create).not.toHaveBeenCalled();
  });

  test("stamps the org onto the new program", async () => {
    await createLoyaltyProgram({ name: "Rewards", signupBonus: 100 } as any, ORG);

    expect(db.loyaltyProgram.create.mock.calls[0][0].data).toMatchObject({
      orgId: ORG,
      name: "Rewards",
      signupBonus: 100,
    });
  });
});

describe("getLoyaltyProgramByOrg", () => {
  test("is keyed on the org, so a caller can only ever get its own", async () => {
    await getLoyaltyProgramByOrg(ORG);

    expect(db.loyaltyProgram.findUnique.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  test("brings the tiers back cheapest-threshold first", async () => {
    await getLoyaltyProgramByOrg(ORG);

    expect(db.loyaltyProgram.findUnique.mock.calls[0][0].include.tiers.orderBy).toEqual({
      threshold: "asc",
    });
  });

  test("includes rewards under the status value rewards are actually written with", async () => {
    await getLoyaltyProgramByOrg(ORG);

    expect(db.loyaltyProgram.findUnique.mock.calls[0][0].include.rewards.where).toEqual({
      status: "ACTIVE",
      // Review rewards are earned by tapping the Google review link, never bought.
      rewardType: { not: "review" },
    });
  });

  test("includes earning rules under the value they ARE written with", async () => {
    await getLoyaltyProgramByOrg(ORG);

    expect(db.loyaltyProgram.findUnique.mock.calls[0][0].include.earningRules.where).toEqual({
      status: "active",
    });
  });
});

describe("updateLoyaltyProgram / deleteLoyaltyProgram", () => {
  test("an update is keyed on the program id", async () => {
    await updateLoyaltyProgram(PROGRAM, { name: "New name" } as any, ORG);

    expect(db.loyaltyProgram.update.mock.calls[0][0]).toMatchObject({
      where: { id: PROGRAM },
      data: { name: "New name" },
    });
  });

  test("refuses to delete a program that still has customers", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(42);

    await expect(deleteLoyaltyProgram(PROGRAM, ORG)).rejects.toThrow(
      "Cannot delete program with existing customers. Archive it instead.",
    );
  });

  test("deletes an empty program", async () => {
    await deleteLoyaltyProgram(PROGRAM, ORG);

    expect(db.loyaltyProgram.delete).toHaveBeenCalledWith({
      where: { id: PROGRAM, orgId: ORG },
    });
  });

  test("force deletes a program together with all its customers", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(42);

    await deleteLoyaltyProgram(PROGRAM, ORG, true);

    expect(db.loyaltyProgram.delete).toHaveBeenCalledWith({
      where: { id: PROGRAM, orgId: ORG },
    });
  });
});

describe("resetProgramPoints", () => {
  beforeEach(() => {
    db.loyaltyProgram.findFirst.mockResolvedValue({ id: PROGRAM });
    db.customerLoyaltyAccount.findMany.mockResolvedValue([]);
    db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  });

  test("zeroes every balance and sends everyone back to the entry tier", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue({ id: "tier-entry" });

    await resetProgramPoints(PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith({
      where: { programId: PROGRAM },
      data: {
        currentPoints: 0,
        lifetimePoints: 0,
        totalSpend: 0,
        currentTierId: "tier-entry",
        pendingBonuses: Prisma.DbNull,
      },
    });
  });

  test("picks the entry tier by lowest threshold", async () => {
    await resetProgramPoints(PROGRAM, ORG);

    expect(db.loyaltyTier.findFirst.mock.calls[0][0]).toEqual({
      where: { programId: PROGRAM },
      orderBy: { threshold: "asc" },
    });
  });

  test("writes a reversing ledger entry for every balance it destroys", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      { id: "acct-1", currentPoints: 500 },
      { id: "acct-2", currentPoints: 40 },
    ]);

    await resetProgramPoints(PROGRAM, ORG, "user-1");

    expect(db.loyaltyTransaction.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ accountId: "acct-1", points: -500, balanceAfter: 0 }),
      expect.objectContaining({ accountId: "acct-2", points: -40, balanceAfter: 0 }),
    ]);
  });

  test("records who ran it on every row", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1", currentPoints: 500 }]);

    await resetProgramPoints(PROGRAM, ORG, "user-1");

    expect(db.loyaltyTransaction.createMany.mock.calls[0][0].data[0].metadata).toEqual({
      resetBy: "user-1",
      pointsBefore: 500,
    });
  });

  test("writes no ledger row for an account that already held nothing", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1", currentPoints: 0 }]);

    await resetProgramPoints(PROGRAM, ORG);

    expect(db.loyaltyTransaction.createMany).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalled();
  });

  test("reverses and wipes in a single transaction", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1", currentPoints: 500 }]);

    await resetProgramPoints(PROGRAM, ORG);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  // It used to take the program id from the path with no org check at all.
  test("refuses a program belonging to another org", async () => {
    db.loyaltyProgram.findFirst.mockResolvedValue(null);

    await expect(resetProgramPoints("prog-other", ORG)).rejects.toThrow(
      "Loyalty program not found",
    );
    expect(db.customerLoyaltyAccount.updateMany).not.toHaveBeenCalled();
  });

  test("leaves customers untiered when the program has no tiers", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue(null);

    await resetProgramPoints(PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.updateMany.mock.calls[0][0].data.currentTierId).toBeNull();
  });
});

// ===========================================================================
// tiers
// ===========================================================================

describe("createLoyaltyTier", () => {
  test("gives a program's first tier priority zero", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue(null);

    await createLoyaltyTier({ name: "Bronze", threshold: 0 } as any, PROGRAM);

    expect(db.loyaltyTier.create.mock.calls[0][0].data.priority).toBe(0);
  });

  test("gives each later tier the next priority up", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue({ priority: 3 });

    await createLoyaltyTier({ name: "Gold", threshold: 5000 } as any, PROGRAM);

    expect(db.loyaltyTier.create.mock.calls[0][0].data.priority).toBe(4);
  });

  test("ignores a priority supplied by the caller", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue({ priority: 3 });

    await createLoyaltyTier({ name: "Gold", threshold: 5000, priority: 99 } as any, PROGRAM);

    expect(db.loyaltyTier.create.mock.calls[0][0].data.priority).toBe(4);
  });
});

describe("getLoyaltyTiers", () => {
  test("lists a program's tiers cheapest first", async () => {
    await getLoyaltyTiers(PROGRAM);

    expect(db.loyaltyTier.findMany.mock.calls[0][0]).toMatchObject({
      where: { programId: PROGRAM },
      orderBy: { threshold: "asc" },
    });
  });
});

describe("updateLoyaltyTier / deleteLoyaltyTier", () => {
  test("an update is keyed on the tier id alone", async () => {
    await updateLoyaltyTier("tier-1", { name: "Silver" } as any);

    expect(db.loyaltyTier.update.mock.calls[0][0].where).toEqual({ id: "tier-1" });
  });

  test("deletes an empty tier outright", async () => {
    await deleteLoyaltyTier("tier-1");

    expect(db.loyaltyTier.delete).toHaveBeenCalledWith({ where: { id: "tier-1" } });
    expect(db.customerLoyaltyAccount.updateMany).not.toHaveBeenCalled();
  });

  test("refuses a populated tier until the caller confirms the downgrade", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1" }, { id: "acct-2" }]);

    await expect(deleteLoyaltyTier("tier-1")).rejects.toMatchObject({
      code: "TIER_HAS_CUSTOMERS",
      customerCount: 2,
    });
  });

  test("moves the customers to the tier below before deleting", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1" }]);
    db.loyaltyTier.findUnique.mockResolvedValue({ programId: PROGRAM, priority: 3 });
    db.loyaltyTier.findFirst.mockResolvedValue({ id: "tier-below", priority: 2 });

    await deleteLoyaltyTier("tier-1", { downgradeCustomers: true });

    expect(db.loyaltyTier.findFirst.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      priority: { lt: 3 },
    });
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith({
      where: { currentTierId: "tier-1" },
      data: { currentTierId: "tier-below" },
    });
    expect(db.loyaltyTier.delete).toHaveBeenCalled();
  });

  test("refuses when there is no tier below to move them to", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1" }]);
    db.loyaltyTier.findUnique.mockResolvedValue({ programId: PROGRAM, priority: 0 });
    db.loyaltyTier.findFirst.mockResolvedValue(null);

    await expect(deleteLoyaltyTier("tier-1", { downgradeCustomers: true })).rejects.toMatchObject({
      code: "TIER_DOWNGRADE_TARGET_NOT_FOUND",
    });
    expect(db.loyaltyTier.delete).not.toHaveBeenCalled();
  });

  test("refuses when the tier itself has vanished", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1" }]);
    db.loyaltyTier.findUnique.mockResolvedValue(null);

    await expect(deleteLoyaltyTier("tier-1", { downgradeCustomers: true })).rejects.toThrow(
      "Tier not found.",
    );
  });

  test("moves the customers and deletes the tier without a transaction", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([{ id: "acct-1" }]);
    db.loyaltyTier.findUnique.mockResolvedValue({ programId: PROGRAM, priority: 3 });
    db.loyaltyTier.findFirst.mockResolvedValue({ id: "tier-below" });

    await deleteLoyaltyTier("tier-1", { downgradeCustomers: true });

    expect(db.customerLoyaltyAccount.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      db.loyaltyTier.delete.mock.invocationCallOrder[0],
    );
  });
});

// ===========================================================================
// rewards
// ===========================================================================

describe("rewards", () => {
  test("a new reward defaults its rules to an empty object", async () => {
    await createLoyaltyReward({ name: "Free coffee", pointsCost: 100 } as any, PROGRAM);

    expect(db.loyaltyReward.create.mock.calls[0][0].data).toMatchObject({
      programId: PROGRAM,
      redemptionRules: {},
    });
  });

  test("lists a program's rewards cheapest first", async () => {
    await getLoyaltyRewards(PROGRAM);

    expect(db.loyaltyReward.findMany.mock.calls[0][0]).toEqual({
      where: { programId: PROGRAM },
      orderBy: { pointsCost: "asc" },
    });
  });

  test("the active list filters on the upper-case status rewards are written with", async () => {
    await getActiveLoyaltyRewards(PROGRAM);

    expect(db.loyaltyReward.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      status: "ACTIVE",
      rewardType: { not: "review" },
    });
  });

  test("a single reward comes back with its recent redemptions", async () => {
    await getLoyaltyRewardById("rwd-1");

    expect(db.loyaltyReward.findUnique.mock.calls[0][0].where).toEqual({ id: "rwd-1" });
  });

  test("an update is keyed on the reward id alone", async () => {
    await updateLoyaltyReward("rwd-1", { pointsCost: 200 } as any);

    expect(db.loyaltyReward.update.mock.calls[0][0].where).toEqual({ id: "rwd-1" });
  });

  test("refuses to delete a reward with live redemptions", async () => {
    db.loyaltyRedemption.count.mockResolvedValue(3);

    await expect(deleteLoyaltyReward("rwd-1")).rejects.toThrow(
      "Cannot delete reward with pending redemptions. Complete them first.",
    );
  });

  test("counts pending and approved redemptions as live", async () => {
    await deleteLoyaltyReward("rwd-1");

    expect(db.loyaltyRedemption.count.mock.calls[0][0].where.status).toEqual({
      in: ["PENDING", "APPROVED"],
    });
  });

  test("deletes a reward nobody is holding", async () => {
    await deleteLoyaltyReward("rwd-1");

    expect(db.loyaltyReward.delete).toHaveBeenCalledWith({ where: { id: "rwd-1" } });
  });

  test("stock can be moved by an arbitrary amount", async () => {
    await incrementRewardStock("rwd-1", 5);

    expect(db.loyaltyReward.update.mock.calls[0][0].data).toEqual({
      stockRedeemed: { increment: 5 },
    });
  });
});

// ===========================================================================
// earning rules
// ===========================================================================

describe("earning rules", () => {
  test("a new rule defaults its conditions to an empty object", async () => {
    await createLoyaltyEarningRule({ name: "Base", pointsPerUnit: 1 } as any, PROGRAM);

    expect(db.loyaltyEarningRule.create.mock.calls[0][0].data).toMatchObject({
      programId: PROGRAM,
      conditions: {},
    });
  });

  test("the admin list orders by priority, then newest", async () => {
    await getLoyaltyEarningRules(PROGRAM);

    expect(db.loyaltyEarningRule.findMany.mock.calls[0][0].orderBy).toEqual([
      { priority: "desc" },
      { createdAt: "desc" },
    ]);
  });

  test("the active list excludes rules outside their validity window", async () => {
    await getActiveLoyaltyEarningRules(PROGRAM);

    const where = db.loyaltyEarningRule.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("active");
    expect(where.OR).toEqual([{ validFrom: null }, { validFrom: { lte: expect.any(Date) } }]);
    expect(where.AND[0].OR).toEqual([
      { validUntil: null },
      { validUntil: { gte: expect.any(Date) } },
    ]);
  });

  test("the active list orders by priority the same way the engine does", async () => {
    await getActiveLoyaltyEarningRules(PROGRAM);

    expect(db.loyaltyEarningRule.findMany.mock.calls[0][0].orderBy).toEqual({ priority: "desc" });
  });
});
