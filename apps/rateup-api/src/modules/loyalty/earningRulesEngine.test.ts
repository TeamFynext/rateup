import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyEarningRule: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    customerLoyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { count: vi.fn() },
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
  const base: AccountFixture = { id: CUSTOMER, currentTierId: null, currentTier: null };
  return { ...base, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyEarningRule.findMany.mockResolvedValue([rule()]);
  db.loyaltyEarningRule.findFirst.mockResolvedValue(null);
  db.loyaltyEarningRule.update.mockResolvedValue({});
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
    vi.setSystemTime(new Date(2026, 0, 15, 12)); // Thursday
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
    vi.setSystemTime(new Date(2026, 0, 15, 22, 0));
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
    vi.setSystemTime(new Date(2026, 0, 15, 17, 0));
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

  // NOTE: pins current behaviour. The guard is
  // `applicableToTiers.length > 0 && customer.currentTierId`, so a customer with
  // no tier matches every tier-exclusive rule — the same shape as the redemption
  // validator's tier bypass (issues.txt 20.6). Because new accounts are created
  // with a null tier (issues.txt 20.11), this is the default state.
  // See issues.txt 20.6.
  test("a customer with no tier matches a tier-exclusive rule", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(account({ currentTierId: null }));
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ id: "platinum-only", applicableToTiers: ["tier-platinum"], pointsPerUnit: 10 }),
    ]);

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.rule?.id).toBe("platinum-only");
    expect(res.points).toBe(1000);
  });
});

// ===========================================================================
// The default-rule fallback
// ===========================================================================

describe("calculatePointsForPurchase — the default rule", () => {
  test("falls back to the program's default when nothing matched", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ minPurchaseAmount: 5000 })]);
    db.loyaltyEarningRule.findFirst.mockResolvedValue(rule({ id: "default", isDefault: true }));

    expect((await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any)).rule?.id).toBe(
      "default",
    );
  });

  // NOTE: pins current behaviour. The primary query filters `status: "active"`;
  // the fallback query does not. A default rule that an operator deliberately
  // deactivated still awards points whenever no other rule matches — and its
  // date window, tier list and usage caps are not re-checked either.
  // See issues.txt 20.10.
  test("the fallback ignores status, dates and every usage cap", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([]);
    db.loyaltyEarningRule.findFirst.mockResolvedValue(
      rule({ id: "default", isDefault: true, status: "inactive" }),
    );

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.rule?.id).toBe("default");
    expect(db.loyaltyEarningRule.findFirst.mock.calls[0][0]).toEqual({
      where: { programId: PROGRAM, isDefault: true },
    });
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

    expect(db.loyaltyEarningRule.update).toHaveBeenCalledWith({
      where: { id: "rule-1" },
      data: { currentTotalUses: { increment: 1 } },
    });
  });

  // NOTE: pins current behaviour. The counter is bumped inside this function,
  // before the caller has written the points or the ledger row, and nothing here
  // is transactional. A purchase that fails after pricing still consumes one of
  // a limited-use promotion's slots. See issues.txt 20.10.
  test("burns a use even for a purchase that earns nothing", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([rule({ pointsPerUnit: 0, bonusPoints: 0 })]);

    const res = await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    expect(res.points).toBe(0);
    expect(db.loyaltyEarningRule.update).toHaveBeenCalled();
  });

  // NOTE: maxTotalUses is read from the row fetched at the top of the function
  // and the increment is a separate statement, so two concurrent purchases both
  // see the same count and both proceed. See issues.txt 20.10.
  test("checks the cap against a value read before the increment", async () => {
    db.loyaltyEarningRule.findMany.mockResolvedValue([
      rule({ maxTotalUses: 1, currentTotalUses: 0 }),
    ]);

    await calculatePointsForPurchase(PROGRAM, CUSTOMER, 100, {} as any);

    const order = [
      db.loyaltyEarningRule.findMany.mock.invocationCallOrder[0],
      db.loyaltyEarningRule.update.mock.invocationCallOrder[0],
    ];
    expect(order[0]).toBeLessThan(order[1]);
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
      program: { tiersEnabled: true, tiers },
      ...over,
    });
  }

  test("does nothing when the program has tiers switched off", async () => {
    withTiers([{ id: "gold", threshold: 100 }], { program: { tiersEnabled: false, tiers: [] } });

    expect(await checkAndUpgradeTier(CUSTOMER, 5000)).toEqual({ upgraded: false });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("does nothing for a customer that does not exist", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    expect(await checkAndUpgradeTier(CUSTOMER, 5000)).toEqual({ upgraded: false });
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
    expect(res.newTier?.id).toBe("gold");
    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: CUSTOMER },
      data: { currentTierId: "gold" },
    });
  });

  test("does nothing when the customer is already in that tier", async () => {
    withTiers([{ id: "gold", threshold: 1000 }], { currentTierId: "gold" });

    expect(await checkAndUpgradeTier(CUSTOMER, 5000)).toEqual({ upgraded: false });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("does nothing when the spend qualifies for no tier", async () => {
    withTiers([{ id: "gold", threshold: 1000 }]);

    expect(await checkAndUpgradeTier(CUSTOMER, 10)).toEqual({ upgraded: false });
  });

  // NOTE: pins current behaviour. The function writes whichever tier the spend
  // qualifies for, in either direction, and reports `upgraded: true` for a move
  // DOWN as readily as a move up. Its callers use that flag to send a
  // "congratulations, you've been upgraded" WhatsApp message.
  // See issues.txt 20.12.
  test("moves the customer DOWN a tier and still calls it an upgrade", async () => {
    withTiers(
      [
        { id: "platinum", threshold: 10000, name: "Platinum" },
        { id: "bronze", threshold: 0, name: "Bronze" },
      ],
      { currentTierId: "platinum" },
    );

    const res = await checkAndUpgradeTier(CUSTOMER, 5);

    expect(res.upgraded).toBe(true);
    expect(res.newTier?.id).toBe("bronze");
    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.currentTierId).toBe("bronze");
  });
});

// ===========================================================================
// generateReferralCode
// ===========================================================================

describe("generateReferralCode", () => {
  test("builds the code from the first six letters of the name", () => {
    expect(generateReferralCode("Alexander", "919000000001")).toMatch(/^ALEXAN-[0-9A-Z]*$/);
  });

  test("strips spaces out of the name part", () => {
    expect(generateReferralCode("An na Smith", "919000000001")).toMatch(/^ANNA-/);
  });

  test("falls back to USER when there is no name", () => {
    expect(generateReferralCode("", "919000000001")).toMatch(/^USER-/);
  });

  // NOTE: pins current behaviour. A referral code earns its owner the program's
  // referral bonus every time someone signs up with it. It is built from the
  // customer's own name plus four Math.random characters, is never checked
  // against the table for uniqueness, and the phone argument is ignored
  // entirely. Knowing a customer's name reduces the search space to ~1.6M — and
  // the public signup route (issues.txt 20.13) will accept every guess.
  // See issues.txt 20.9.
  test("is name-derived, short and never checked for uniqueness", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    expect(generateReferralCode("Alexander", "919000000001")).toBe(
      generateReferralCode("Alexander", "919999999999"),
    );

    spy.mockRestore();
  });

  test("produces a shorter suffix when the random value is short", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(generateReferralCode("Ann", "919000000001")).toBe("ANN-I");

    spy.mockRestore();
  });
});
