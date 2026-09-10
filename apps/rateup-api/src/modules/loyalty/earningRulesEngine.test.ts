import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyEarningRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    customerLoyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { count: vi.fn(), aggregate: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import { DayOfWeek } from "../../types/loyalty.js";
import {
  calculatePointsForPurchase,
  checkAndUpgradeTier,
  generateReferralCode,
} from "./earningRulesEngine.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyEarningRule: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
};

const PROGRAM = "prog-1";
const CUSTOMER = "cust-1";

interface RuleFixture {
  id: string;
  name: string;
  priority: number;
  pointsPerUnit: number;
  multiplier: number;
  bonusPoints: number;
  validFrom: string | Date | null;
  validUntil: string | Date | null;
  allowedDays: DayOfWeek[];
  allowedTimeRanges: { time_ranges: Array<{ start: string; end: string }> } | null;
  minPurchaseAmount: number | null;
  maxPurchaseAmount: number | null;
  applicableToTiers: string[];
  maxTotalUses: number | null;
  currentTotalUses: number;
  maxUsesPerCustomer: number | null;
  conditions: Record<string, unknown>;
  isDefault: boolean;
}

interface AccountFixture {
  id: string;
  currentTierId: string | null;
  currentTier: { pointsMultiplier: number } | null;
  program: { tiersEnabled: boolean };
}

function rule(over: Record<string, unknown> = {}) {
  const base: RuleFixture = {
    id: "rule-1",
    name: "Base rule",
    priority: 0,
    pointsPerUnit: 1,
    multiplier: 1,
    bonusPoints: 0,
    validFrom: null,
    validUntil: null,
    allowedDays: [],
    allowedTimeRanges: null,
    minPurchaseAmount: null,
    maxPurchaseAmount: null,
    applicableToTiers: [],
    maxTotalUses: null,
    currentTotalUses: 0,
    maxUsesPerCustomer: null,
    conditions: {},
    isDefault: false,
  };
  return { ...base, ...over };
}

function account(over: Record<string, unknown> = {}) {
  const base: AccountFixture = {
    id: CUSTOMER,
    currentTierId: null,
    currentTier: null,
    program: { tiersEnabled: true },
  };
  return { ...base, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyEarningRule.findMany.mockResolvedValue([rule()]);
  db.loyaltyEarningRule.findFirst.mockResolvedValue(null);
  db.loyaltyEarningRule.update.mockResolvedValue({});
  db.loyaltyEarningRule.updateMany.mockResolvedValue({ count: 1 });
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(account());
  db.customerLoyaltyAccount.update.mockResolvedValue({});
  db.loyaltyTransaction.count.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// Rule selection
// ===========================================================================

describe("calculatePointsForPurchase — which rule wins", () => {
  test("only considers active rules, highest priority first", async () => {
    await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(db.loyaltyEarningRule.findMany.mock.calls[0][0]).toEqual({
      where: { programId: PROGRAM, status: "active" },
      orderBy: { priority: "desc" },
    });
  });

  test("takes the first rule that matches and ignores the rest", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "high", priority: 10, pointsPerUnit: 5 }),
      rule({ id: "low", priority: 1, pointsPerUnit: 1 }),
    ]);

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.rule?.id).toBe("high");
    expect(res.points).toBe(500);
  });

  test("refuses to price a purchase for a customer that does not exist", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    await expect(calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rejects.toThrow(
      "Customer not found",
    );
  });

  test("throws when the program has no rule at all", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([]);

    await expect(calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rejects.toThrow(
      "No earning rule found for this program",
    );
  });

  test("skips a rule whose start date has not arrived", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "future", validFrom: "2026-06-01T00:00:00.000Z" }),
      rule({ id: "now" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "now",
    );
  });

  test("skips a rule that has expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "expired", validUntil: "2026-01-01T00:00:00.000Z" }),
      rule({ id: "now" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "now",
    );
  });

  test("skips a rule that does not run today", async () => {
    vi.useFakeTimers();
    // Thursday 15 January 2026 in UTC, which is the only clock this file reads.
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "mondays", allowedDays: [DayOfWeek.MONDAY] }),
      rule({ id: "anyday" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "anyday",
    );
  });

  test("skips a rule outside its hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T22:00:00.000Z"));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({
        id: "happyhour",
        allowedTimeRanges: { time_ranges: [{ start: "16:00", end: "18:00" }] },
      }),
      rule({ id: "anytime" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "anytime",
    );
  });

  test("matches a rule inside its hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T17:00:00.000Z"));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({
        id: "happyhour",
        allowedTimeRanges: { time_ranges: [{ start: "16:00", end: "18:00" }] },
      }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "happyhour",
    );
  });

  test("skips a rule whose minimum purchase is not met", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "big", minPurchaseAmount: 500 }),
      rule({ id: "any" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "any",
    );
  });

  test("skips a rule whose maximum purchase is exceeded", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "small", maxPurchaseAmount: 50 }),
      rule({ id: "any" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "any",
    );
  });

  test("skips a rule that has been used up program-wide", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "spent", maxTotalUses: 10, currentTotalUses: 10 }),
      rule({ id: "any" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "any",
    );
  });

  test("skips a rule this customer has already used to its limit", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "onceper", maxUsesPerCustomer: 1 }),
      rule({ id: "any" }),
    ]);
    db.loyaltyTransaction.count.mockResolvedValue(1);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "any",
    );
    expect(db.loyaltyTransaction.count.mock.calls[0][0].where).toEqual({
      accountId: CUSTOMER,
      earningRuleId: "onceper",
    });
  });

  test("matches a rule restricted to the customer's tier", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(account({ currentTierId: "tier-gold" }));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "gold", applicableToTiers: ["tier-gold"] }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "gold",
    );
  });

  test("skips a rule restricted to a tier the customer is not in", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(
      account({ currentTierId: "tier-bronze" }),
    );
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "gold", applicableToTiers: ["tier-gold"] }),
      rule({ id: "any" }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "any",
    );
  });

  test("a customer with no tier does not match a tier-exclusive rule", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(account({ currentTierId: null }));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "platinum-only", applicableToTiers: ["tier-platinum"], pointsPerUnit: 10 }),
      rule({ id: "anyone", pointsPerUnit: 1 }),
    ]);

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.rule?.id).toBe("anyone");
    expect(res.points).toBe(100);
  });
});

// ===========================================================================
// The default-rule fallback
// ===========================================================================

describe("calculatePointsForPurchase — the default rule", () => {
  // The default rule is an ordinary row in the same filtered, ordered list as
  // every other rule, so it wins on the same terms: lowest priority, matching
  // everything, reached when nothing above it matched.
  test("the default rule prices a purchase no other rule matched", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "big-spenders", priority: 10, minPurchaseAmount: 5000 }),
      rule({ id: "default", priority: 0, isDefault: true }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "default",
    );
  });

  test("a deactivated default rule does not price anything", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([]);

    await expect(calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rejects.toThrow(
      "No earning rule found for this program",
    );
    expect(db.loyaltyEarningRule.findFirst).not.toHaveBeenCalled();
  });

  test("a default rule outside its validity window is skipped like any other", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "default", isDefault: true, validUntil: "2026-01-01T00:00:00.000Z" }),
    ]);

    await expect(calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rejects.toThrow(
      "No earning rule found for this program",
    );
  });
});

// ===========================================================================
// The arithmetic
// ===========================================================================

describe("calculatePointsForPurchase — the maths", () => {
  test("multiplies the purchase by the rule's rate", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ pointsPerUnit: 2 })]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 250, {} as any)).points).toBe(500);
  });

  test("applies the rule multiplier, then the bonus, then the tier multiplier", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(
      account({ currentTier: { pointsMultiplier: 2 } }),
    );
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ pointsPerUnit: 1, multiplier: 3, bonusPoints: 50 }),
    ]);

    // 100 * 1 = 100 -> * 3 = 300 -> + 50 = 350 -> * 2 = 700
    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.points).toBe(700);
    expect(res.calculation).toEqual({
      base_amount: 100,
      base_points: 100,
      rule_multiplier: 3,
      rule_bonus: 50,
      tier_multiplier: 2,
      final_points: 700,
    });
  });

  test("the bonus is multiplied by the tier rate but not by the rule multiplier", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(
      account({ currentTier: { pointsMultiplier: 2 } }),
    );
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ pointsPerUnit: 0, multiplier: 5, bonusPoints: 10 }),
    ]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).points).toBe(20);
  });

  test("ignores the tier multiplier when the programme has tiers switched off", async () => {
    // `currentTierId` survives the flag being turned off so standing is not lost if it is
    // turned back on — which is exactly why the multiplier has to be gated on the flag and
    // not on the customer still having a tier.
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(
      account({
        currentTierId: "gold",
        currentTier: { pointsMultiplier: 3 },
        program: { tiersEnabled: false },
      }),
    );
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ pointsPerUnit: 1 })]);

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.points).toBe(100);
    expect(res.calculation.tier_multiplier).toBe(1);
  });

  test("an untiered customer is treated as a 1x multiplier", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ pointsPerUnit: 1 })]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).points).toBe(100);
  });

  test("rounds down, so fractional points are never awarded", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ pointsPerUnit: 0.1 })]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 99, {} as any)).points).toBe(9);
  });

  test("a zero purchase earns only the bonus", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ bonusPoints: 25 })]);

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 0, {} as any)).points).toBe(25);
  });

  test("returns the rule under the key `rule`", async () => {
    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res).toHaveProperty("rule");
    expect(res).not.toHaveProperty("appliedRule");
  });
});

describe("calculatePointsForPurchase — the usage counter", () => {
  test("burns one use of the matched rule", async () => {
    await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(db.loyaltyEarningRule.updateMany).toHaveBeenCalledWith({
      where: { id: "rule-1" },
      data: { currentTotalUses: { increment: 1 } },
    });
  });

  test("burns no use for a purchase that earns nothing", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ pointsPerUnit: 0, bonusPoints: 0 })]);

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.points).toBe(0);
    expect(db.loyaltyEarningRule.updateMany).not.toHaveBeenCalled();
  });

  test("counts the use through the client it is given", async () => {
    const tx = { loyaltyEarningRule: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };

    await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any, tx as any);

    expect(tx.loyaltyEarningRule.updateMany).toHaveBeenCalled();
    expect(db.loyaltyEarningRule.updateMany).not.toHaveBeenCalled();
  });

  test("makes the cap part of the write's own condition", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ maxTotalUses: 5, currentTotalUses: 0 }),
    ]);

    await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(db.loyaltyEarningRule.updateMany.mock.calls[0][0].where).toEqual({
      id: "rule-1",
      currentTotalUses: { lt: 5 },
    });
  });

  test("an uncapped rule is counted with no condition beyond its id", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ maxTotalUses: null })]);

    await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(db.loyaltyEarningRule.updateMany.mock.calls[0][0].where).toEqual({ id: "rule-1" });
  });

  test("refuses the purchase when the cap was taken concurrently", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ maxTotalUses: 5, currentTotalUses: 0 }),
    ]);
    db.loyaltyEarningRule.updateMany.mockResolvedValue({ count: 0 });

    await expect(calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rejects.toThrow(
      "This earning rule has reached its usage limit",
    );
  });
});

// ===========================================================================
// Additional conditions
// ===========================================================================

describe("calculatePointsForPurchase — additional conditions", () => {
  function withConditions(conditions: Record<string, unknown>) {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "conditional", conditions }),
      rule({ id: "fallback" }),
    ]);
  }

  /// The id of the rule that wins for a given earning context.
  async function matched(context: Record<string, unknown> = {}) {
    return (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, context as any)).rule?.id;
  }

  test("a location-restricted rule needs a matching location", async () => {
    withConditions({ locations: { enabled: true, location_ids: ["store-1"] } });

    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { location_id: "store-1" } as any))
        .rule?.id,
    ).toBe("conditional");
  });

  test("a location-restricted rule is skipped for another location", async () => {
    withConditions({ locations: { enabled: true, location_ids: ["store-1"] } });

    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { location_id: "store-2" } as any))
        .rule?.id,
    ).toBe("fallback");
  });

  test("a location-restricted rule is skipped when no location is supplied", async () => {
    withConditions({ locations: { enabled: true, location_ids: ["store-1"] } });

    expect(await matched()).toBe("fallback");
  });

  test("an excluded category disqualifies the whole basket", async () => {
    withConditions({ products: { enabled: true, excluded_categories: ["tobacco"] } });

    expect(
      (
        await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {
          categories: ["snacks", "tobacco"],
        } as any)
      ).rule?.id,
    ).toBe("fallback");
  });

  test("an allowed category qualifies the basket", async () => {
    withConditions({ products: { enabled: true, categories: ["coffee"] } });

    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { categories: ["coffee"] } as any))
        .rule?.id,
    ).toBe("conditional");
  });

  test("a sku-restricted rule needs one of its skus in the basket", async () => {
    withConditions({ products: { enabled: true, product_skus: ["SKU-1"] } });

    expect(
      (
        await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {
          product_skus: ["SKU-9"],
        } as any)
      ).rule?.id,
    ).toBe("fallback");
  });

  test("a payment-method rule needs the right method", async () => {
    withConditions({ payment_methods: { enabled: true, allowed_methods: ["upi"] } });

    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { payment_method: "upi" } as any))
        .rule?.id,
    ).toBe("conditional");
    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { payment_method: "cash" } as any))
        .rule?.id,
    ).toBe("fallback");
  });

  test("a channel rule needs the right channel", async () => {
    withConditions({ channels: { enabled: true, allowed_channels: ["whatsapp"] } });

    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { channel: "whatsapp" } as any))
        .rule?.id,
    ).toBe("conditional");
  });

  test("a customer-type rule needs the right type", async () => {
    withConditions({ customer_type: { enabled: true, types: ["vip"] } });

    expect(
      (await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, { customer_type: "vip" } as any))
        .rule?.id,
    ).toBe("conditional");
  });

  test("a condition block that is not enabled restricts nothing", async () => {
    withConditions({ locations: { enabled: false, location_ids: ["store-1"] } });

    expect(await matched()).toBe("conditional");
  });

  test("an empty conditions object is not evaluated at all", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ id: "plain", conditions: {} })]);

    expect(await matched()).toBe("plain");
  });
});

// ===========================================================================
// checkAndUpgradeTier
// ===========================================================================

describe("checkAndUpgradeTier", () => {
  function withTiers(tiers: Array<Record<string, unknown>>, over: Record<string, unknown> = {}) {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      id: CUSTOMER,
      currentTierId: null,
      program: { id: PROGRAM, tiersEnabled: true, tierQualificationWindowMonths: null, tiers },
      ...over,
    });
  }

  /** A programme that judges tiers on the trailing `months`, with `spent` inside them. */
  function withWindow(
    tiers: Array<Record<string, unknown>>,
    months: number,
    spent: number,
    over: Record<string, unknown> = {},
  ) {
    withTiers(tiers, {
      program: { id: PROGRAM, tiersEnabled: true, tierQualificationWindowMonths: months, tiers },
      ...over,
    });
    db.loyaltyTransaction.aggregate.mockResolvedValue({ _sum: { purchaseAmount: spent } });
  }

  test("does nothing when the program has tiers switched off", async () => {
    withTiers([{ id: "gold", threshold: 100 }], { program: { tiersEnabled: false, tiers: [] } });

    expect(await checkAndUpgradeTier(CUSTOMER, 5000)).toEqual({
      upgraded: false,
      direction: "none",
      currentTier: null,
      nextTier: null,
      amountToNext: null,
    });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("does nothing for a customer that does not exist", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    expect(await checkAndUpgradeTier(CUSTOMER, 5000)).toEqual({
      upgraded: false,
      direction: "none",
      currentTier: null,
      nextTier: null,
      amountToNext: null,
    });
  });

  test("moves the customer into the highest tier they qualify for", async () => {
    // The include orders tiers by threshold desc, so the first match is the best.
    withTiers([
      { id: "platinum", threshold: 10000 },
      { id: "gold", threshold: 1000 },
      { id: "bronze", threshold: 0 },
    ]);

    const res = await checkAndUpgradeTier(CUSTOMER, 5000);

    expect(res.upgraded).toBe(true);
    expect(res.direction).toBe("up");
    expect(res.newTier?.id).toBe("gold");
    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: CUSTOMER },
      data: { currentTierId: "gold" },
    });
  });

  test("does nothing when the customer is already in that tier", async () => {
    withTiers([{ id: "gold", threshold: 1000 }], { currentTierId: "gold" });

    expect(await checkAndUpgradeTier(CUSTOMER, 5000)).toMatchObject({
      upgraded: false,
      direction: "none",
      nextTier: null,
      amountToNext: null,
    });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("does nothing when the spend qualifies for no tier, but says how far the first is", async () => {
    withTiers([{ id: "gold", threshold: 1000 }]);

    expect(await checkAndUpgradeTier(CUSTOMER, 10)).toMatchObject({
      upgraded: false,
      direction: "none",
      nextTier: { id: "gold" },
      amountToNext: 990,
    });
  });

  test("reports the tier now held and the next one up, with the spend still needed", async () => {
    withTiers([
      { id: "platinum", threshold: 10000, name: "Platinum" },
      { id: "gold", threshold: 1000, name: "Gold" },
      { id: "bronze", threshold: 0, name: "Bronze" },
    ]);

    const res = await checkAndUpgradeTier(CUSTOMER, 5000);

    expect(res.currentTier?.id).toBe("gold");
    expect(res.nextTier?.id).toBe("platinum");
    expect(res.amountToNext).toBe(5000);
  });

  test("at the top tier there is no next tier", async () => {
    withTiers(
      [
        { id: "platinum", threshold: 10000 },
        { id: "bronze", threshold: 0 },
      ],
      {
        currentTierId: "platinum",
        currentTier: { id: "platinum", threshold: 10000 },
      },
    );

    expect(await checkAndUpgradeTier(CUSTOMER, 20000)).toMatchObject({
      nextTier: null,
      amountToNext: null,
    });
  });

  test("never moves a customer down on a lifetime ladder", async () => {
    withTiers(
      [
        { id: "platinum", threshold: 10000, name: "Platinum" },
        { id: "bronze", threshold: 0, name: "Bronze" },
      ],
      { currentTierId: "platinum", currentTier: { id: "platinum", threshold: 10000 } },
    );

    // Lifetime spend only grows, so a "down" here could only be undoing a manual placement.
    const res = await checkAndUpgradeTier(CUSTOMER, 5);

    expect(res).toMatchObject({
      upgraded: false,
      direction: "none",
      currentTier: { id: "platinum" },
    });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("uses trailing-window spend, not lifetime spend, when the programme sets a window", async () => {
    withWindow(
      [
        { id: "vip", threshold: 10000, name: "VIP" },
        { id: "member", threshold: 0, name: "Member" },
      ],
      6,
      12000,
      { currentTierId: "member", currentTier: { id: "member", threshold: 0 } },
    );

    // Lifetime spend says Member; the last six months say VIP.
    const res = await checkAndUpgradeTier(CUSTOMER, 500);

    expect(res).toMatchObject({ upgraded: true, direction: "up", newTier: { id: "vip" } });
    expect(db.loyaltyTransaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: CUSTOMER,
          programId: PROGRAM,
          transactionType: "earn",
          source: "purchase",
        }),
      }),
    );
  });

  test("moves the customer DOWN when a window is set and the spend inside it lapsed", async () => {
    withWindow(
      [
        { id: "platinum", threshold: 10000, name: "Platinum" },
        { id: "bronze", threshold: 0, name: "Bronze" },
      ],
      6,
      5,
      { currentTierId: "platinum", currentTier: { id: "platinum", threshold: 10000 } },
    );

    const res = await checkAndUpgradeTier(CUSTOMER, 50000);

    expect(res.upgraded).toBe(false);
    expect(res.direction).toBe("down");
    expect(res.newTier?.id).toBe("bronze");
    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.currentTierId).toBe("bronze");
  });

  test("a move up is an upgrade", async () => {
    withTiers(
      [
        { id: "gold", threshold: 1000, name: "Gold" },
        { id: "bronze", threshold: 0, name: "Bronze" },
      ],
      { currentTierId: "bronze", currentTier: { id: "bronze", threshold: 0 } },
    );

    const res = await checkAndUpgradeTier(CUSTOMER, 5000);

    expect(res).toMatchObject({ upgraded: true, direction: "up" });
  });

  test("an untiered customer entering a tier is an upgrade", async () => {
    withTiers([{ id: "bronze", threshold: 0, name: "Bronze" }], { currentTier: null });

    expect(await checkAndUpgradeTier(CUSTOMER, 10)).toMatchObject({
      upgraded: true,
      direction: "up",
    });
  });
});

// ===========================================================================
// generateReferralCode
// ===========================================================================

describe("generateReferralCode", () => {
  beforeEach(() => {
    // No account holds the candidate code. The outer beforeEach points findUnique
    // at the customer fixture, which the uniqueness check would read as "taken".
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);
  });

  test("builds the code from the first six letters of the name", async () => {
    expect(await generateReferralCode("Alexander", "919000000001")).toMatch(
      /^ALEXAN-[A-HJ-NP-Z2-9]{10}$/,
    );
  });

  test("strips spaces out of the name part", async () => {
    expect(await generateReferralCode("An na Smith", "919000000001")).toMatch(/^ANNA-/);
  });

  test("falls back to USER when there is no name", async () => {
    expect(await generateReferralCode("", "919000000001")).toMatch(/^USER-/);
  });

  test("does not repeat itself, even with Math.random pinned", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const first = await generateReferralCode("Alexander", "919000000001");
    const second = await generateReferralCode("Alexander", "919999999999");
    expect(first).not.toBe(second);

    spy.mockRestore();
  });

  test("checks each candidate against the table before handing it out", async () => {
    await generateReferralCode("Ann", "919000000001");

    expect(db.customerLoyaltyAccount.findUnique.mock.calls[0][0].where.referralCode).toMatch(
      /^ANN-/,
    );
  });

  test("redraws when the code it picked is already taken", async () => {
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce(null);

    const code = await generateReferralCode("Ann", "919000000001");

    expect(db.customerLoyaltyAccount.findUnique).toHaveBeenCalledTimes(2);
    expect(db.customerLoyaltyAccount.findUnique.mock.calls[1][0].where.referralCode).toBe(code);
  });

  test("gives up rather than looping forever", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ id: "taken" });

    await expect(generateReferralCode("Ann", "919000000001")).rejects.toThrow(
      "Could not generate a unique referral code",
    );
  });
});
