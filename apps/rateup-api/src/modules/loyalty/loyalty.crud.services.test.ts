import { beforeEach, describe, expect, test, vi } from "vitest";

// The four small CRUD services behind the loyalty admin screens — program,
// tiers, rewards and earning rules — share one prisma stub.
vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
    customerLoyaltyAccount: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

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
  customerLoyaltyAccount: Record<string, Mock>;
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

  // NOTE: pins current behaviour. Rewards are written with the LoyaltyRewardStatus
  // enum, whose active value is "ACTIVE" — getActiveLoyaltyRewards filters on
  // exactly that. This include filters on lower-case "active", which no reward
  // ever has, so `program.rewards` comes back empty for every org.
  // See issues.txt 20.29.
  test("includes rewards under a status value no reward is ever written with", async () => {
    await getLoyaltyProgramByOrg(ORG);

    expect(db.loyaltyProgram.findUnique.mock.calls[0][0].include.rewards.where).toEqual({
      status: "active",
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
    await updateLoyaltyProgram(PROGRAM, { name: "New name" } as any);

    expect(db.loyaltyProgram.update.mock.calls[0][0]).toMatchObject({
      where: { id: PROGRAM },
      data: { name: "New name" },
    });
  });

  test("refuses to delete a program that still has customers", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(42);

    await expect(deleteLoyaltyProgram(PROGRAM)).rejects.toThrow(
      "Cannot delete program with existing customers. Archive it instead.",
    );
  });

  test("deletes an empty program", async () => {
    await deleteLoyaltyProgram(PROGRAM);

    expect(db.loyaltyProgram.delete).toHaveBeenCalledWith({ where: { id: PROGRAM } });
  });

  // NOTE: `force` overrides the guard entirely — a program with customers is
  // deleted, and CustomerLoyaltyAccount cascades from it, so every balance and
  // every ledger row goes with it. Nothing about this is reversible and nothing
  // records who did it. See issues.txt 20.30.
  test("force deletes a program together with all its customers", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(42);

    await deleteLoyaltyProgram(PROGRAM, true);

    expect(db.loyaltyProgram.delete).toHaveBeenCalledWith({ where: { id: PROGRAM } });
  });
});

describe("resetProgramPoints", () => {
  test("zeroes every balance and sends everyone back to the entry tier", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue({ id: "tier-entry" });

    await resetProgramPoints(PROGRAM);

    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith({
      where: { programId: PROGRAM },
      data: {
        currentPoints: 0,
        lifetimePoints: 0,
        totalSpend: 0,
        currentTierId: "tier-entry",
      },
    });
  });

  test("picks the entry tier by lowest threshold", async () => {
    await resetProgramPoints(PROGRAM);

    expect(db.loyaltyTier.findFirst.mock.calls[0][0]).toEqual({
      where: { programId: PROGRAM },
      orderBy: { threshold: "asc" },
    });
  });

  // NOTE: this wipes every customer's balance and lifetime total in one
  // statement, writes no LoyaltyTransaction rows to explain the change, and
  // notifies nobody. The ledger and the balances disagree from that moment on.
  // See issues.txt 20.30.
  test("writes no ledger entry for the points it destroys", async () => {
    await resetProgramPoints(PROGRAM);

    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledTimes(1);
    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("leaves customers untiered when the program has no tiers", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue(null);

    await resetProgramPoints(PROGRAM);

    expect(db.customerLoyaltyAccount.updateMany.mock.calls[0][0].data.currentTierId).toBeNull();
  });
});

// ===========================================================================
// tiers
// ===========================================================================

describe("createLoyaltyTier", () => {
  // NOTE: pins current behaviour. The FIRST tier of a program is created with
  // priority 0. createCustomerAccount looks for the entry tier at `priority: 1`
  // (issues.txt 20.11), so a program with a single tier enrols every customer
  // with no tier at all. See issues.txt 20.11.
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

  // NOTE: tier.schema declares `priority: z.number().default(1)`, but the service
  // computes its own and never reads the caller's. The field is accepted by the
  // API and silently discarded. See issues.txt 20.11.
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

  // NOTE: the move and the delete are separate statements with no transaction, so
  // a failure between them leaves customers pointing at a tier that is about to
  // disappear — or at one that no longer exists. See issues.txt 20.17.
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

  // NOTE: pins current behaviour. This helper sorts ASCENDING by priority, while
  // the engine that actually prices purchases sorts DESCENDING and takes the
  // first match. Anything built on this list sees the rules in the opposite
  // order to the one that decides the points. See issues.txt 20.31.
  test("the active list orders by priority ascending, opposite to the engine", async () => {
    await getActiveLoyaltyEarningRules(PROGRAM);

    expect(db.loyaltyEarningRule.findMany.mock.calls[0][0].orderBy).toEqual({ priority: "asc" });
  });
});
