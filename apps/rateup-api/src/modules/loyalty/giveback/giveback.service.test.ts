import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyEarningRule: { findFirst: vi.fn() },
    loyaltyReward: { findMany: vi.fn() },
    loyaltyTier: { findMany: vi.fn() },
  },
}));
vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { givebackResponseSchema } from "./giveback.schema.js";
import {
  buildGivebackInput,
  getProgramGiveback,
  loadProgramGivebackSources,
} from "./giveback.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ORG = "org-1";

/** Decimal columns arrive as objects with toString, the way Prisma hands them back. */
const decimal = (value: string) => ({ toString: () => value, toJSON: () => value });

const PROGRAM = {
  id: "prog-1",
  currencyName: "Beans",
  currencySymbol: "₹",
  currencyCode: "INR",
  averageOrderValue: decimal("250.00"),
  tiersEnabled: true,
  signupBonus: 50,
  referralBonus: 100,
  refereeBonus: 50,
  tiers: [
    { name: "Bronze", threshold: decimal("0"), pointsMultiplier: decimal("1.00"), color: "#a00" },
    { name: "Gold", threshold: decimal("5000"), pointsMultiplier: decimal("1.50"), color: "#fc0" },
  ],
  earningRules: [
    {
      id: "rule-2",
      name: "Happy hour",
      isDefault: false,
      pointsPerUnit: decimal("2"),
      multiplier: decimal("1"),
      bonusPoints: 0,
    },
    {
      id: "rule-1",
      name: "Standard",
      isDefault: true,
      pointsPerUnit: decimal("1.00"),
      multiplier: decimal("1.00"),
      bonusPoints: 0,
    },
  ],
  rewards: [
    { name: "Free Coffee", pointsCost: 500, rewardValue: { type: "free_item", item_value: 150 } },
    { name: "MONSOON50", pointsCost: 0, rewardValue: { type: "discount_fixed", amount: 50 } },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildGivebackInput", () => {
  test("coerces Decimal-like values and keeps a null order value null", () => {
    const input = buildGivebackInput(
      { ...PROGRAM, averageOrderValue: null },
      PROGRAM.earningRules[1],
      PROGRAM.rewards,
      PROGRAM.tiers,
    );

    expect(input.earnRate).toEqual({ pointsPerUnit: 1, multiplier: 1, bonusPoints: 0 });
    expect(input.averageOrderValue).toBeNull();
    expect(input.tiers[1]).toEqual({
      name: "Gold",
      threshold: 5000,
      pointsMultiplier: 1.5,
      color: "#fc0",
    });
    expect(input.bonuses).toEqual({ signupBonus: 50, referralBonus: 100, refereeBonus: 50 });
  });

  test("a missing default rule is an earn rate of zero, not a crash", () => {
    const input = buildGivebackInput(PROGRAM, null, [], []);
    expect(input.earnRate).toEqual({ pointsPerUnit: 0, multiplier: 1, bonusPoints: 0 });
    expect(input.averageOrderValue).toBe(250);
  });
});

describe("loadProgramGivebackSources", () => {
  test("reads the default active rule, ACTIVE rewards and tiers — the casing landmine", async () => {
    db.loyaltyEarningRule.findFirst.mockResolvedValue(null);
    db.loyaltyReward.findMany.mockResolvedValue([]);
    db.loyaltyTier.findMany.mockResolvedValue([]);

    await loadProgramGivebackSources("prog-1");

    expect(db.loyaltyEarningRule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { programId: "prog-1", isDefault: true, status: "active" },
      }),
    );
    expect(db.loyaltyReward.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { programId: "prog-1", status: "ACTIVE" } }),
    );
    expect(db.loyaltyTier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { programId: "prog-1" } }),
    );
  });
});

describe("getProgramGiveback", () => {
  test("returns an empty shape when the org has no programme", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);

    const res = await getProgramGiveback(ORG);

    expect(res).toEqual({ programExists: false, programId: null, result: null, inputs: null });
    expect(() => givebackResponseSchema.parse(res)).not.toThrow();
  });

  test("prices the programme from the default rule and serialises cleanly", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(PROGRAM);

    const res = await getProgramGiveback(ORG);

    // 1 point per ₹1, 500 points buys ₹150 → 30% of spend at the base tier.
    expect(res.result?.givebackPct).toBeCloseTo(30);
    expect(res.result?.band).toBe("excessive");
    expect(res.result?.skippedRewards).toEqual([{ name: "MONSOON50", reason: "no_points_cost" }]);
    expect(res.inputs?.defaultRule).toEqual({
      id: "rule-1",
      name: "Standard",
      pointsPerUnit: 1,
      multiplier: 1,
      bonusPoints: 0,
    });
    expect(res.inputs?.pointsName).toBe("Beans");
    expect(res.inputs?.rewardsConsidered).toBe(2);
    expect(() => givebackResponseSchema.parse(res)).not.toThrow();
  });

  test("reports no default rule as null inputs rather than inventing one", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
      ...PROGRAM,
      earningRules: [PROGRAM.earningRules[0]],
    });

    const res = await getProgramGiveback(ORG);

    expect(res.inputs?.defaultRule).toBeNull();
    expect(res.result?.status).toBe("no_earning");
  });
});
