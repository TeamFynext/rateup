import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyReward: { findUnique: vi.fn() },
    customerLoyaltyAccount: { findUnique: vi.fn() },
    customerReward: { findUnique: vi.fn() },
    loyaltyRedemption: { findFirst: vi.fn(), count: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import { DayOfWeek } from "../../types/loyalty.js";
import { generateRedemptionCode, validateRedemption } from "./redemptionValidator.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyReward: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  customerReward: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
};

const CUSTOMER = "cust-1";
const REWARD = "rwd-1";

function reward(over: Record<string, unknown> = {}) {
  return {
    id: REWARD,
    name: "Free coffee",
    rewardType: "coupon",
    pointsCost: 100,
    stockQuantity: null,
    stockRedeemed: 0,
    redemptionRules: {},
    ...over,
  };
}

function customer(over: Record<string, unknown> = {}) {
  return { id: CUSTOMER, currentPoints: 500, currentTierId: "tier-gold", ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyReward.findUnique.mockResolvedValue(reward());
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer());
  db.customerReward.findUnique.mockResolvedValue(null);
  db.loyaltyRedemption.findFirst.mockResolvedValue(null);
  db.loyaltyRedemption.count.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// The two lookups
// ===========================================================================

describe("validateRedemption — subjects", () => {
  test("refuses a reward that does not exist", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(null);

    expect(await validateRedemption(CUSTOMER, "nope", {} as any)).toEqual({
      valid: false,
      violations: ["Reward not found"],
      reward: null,
      customer: null,
    });
  });

  test("refuses a customer that does not exist", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    expect((await validateRedemption("nope", REWARD, {} as any)).violations).toEqual([
      "Customer not found",
    ]);
  });

  test("approves a redemption that breaks no rule", async () => {
    const res = await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(res.valid).toBe(true);
    expect(res.violations).toEqual([]);
  });

  // NOTE: pins current behaviour. Both lookups are by id alone — nothing checks
  // that the reward and the account belong to the same loyalty program, let alone
  // the same org. See issues.txt 20.1.
  test("never checks that the reward and the account share a program", async () => {
    await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(db.loyaltyReward.findUnique.mock.calls[0][0]).toEqual({ where: { id: REWARD } });
    expect(db.customerLoyaltyAccount.findUnique.mock.calls[0][0].where).toEqual({ id: CUSTOMER });
  });
});

// ===========================================================================
// Points and assignment
// ===========================================================================

describe("validateRedemption — points balance", () => {
  test("refuses when the customer cannot afford the reward, naming both numbers", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentPoints: 40 }));

    const res = await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(res.valid).toBe(false);
    expect(res.violations).toEqual(["Not enough points. Need 100, have 40"]);
  });

  test("an exact balance is enough", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentPoints: 100 }));

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("an assigned reward costs no points", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ rewardType: "assigned" }));
    db.customerReward.findUnique.mockResolvedValue({ id: "assignment-1" });
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentPoints: 0 }));

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("an assigned reward must actually be assigned to that customer", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ rewardType: "assigned" }));
    db.customerReward.findUnique.mockResolvedValue(null);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Reward is not assigned to the customer",
    );
  });

  test("the assignment lookup keys on the reward and account together", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ rewardType: "assigned" }));

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(db.customerReward.findUnique.mock.calls[0][0].where).toEqual({
      rewardId_accountId: { rewardId: REWARD, accountId: CUSTOMER },
    });
  });
});

// ===========================================================================
// Time restrictions
// ===========================================================================

describe("validateRedemption — time restrictions", () => {
  function withTime(restrictions: Record<string, unknown>) {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ redemptionRules: { time_restrictions: { enabled: true, ...restrictions } } }),
    );
  }

  test("does nothing at all when the block is not enabled", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        redemptionRules: {
          time_restrictions: { enabled: false, valid_until: "1999-01-01T00:00:00.000Z" },
        },
      }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("refuses a reward whose start date has not arrived", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    withTime({ valid_from: "2026-06-01T00:00:00.000Z" });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "This reward is not yet available",
    );
  });

  test("refuses a reward that has expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
    withTime({ valid_until: "2026-06-01T00:00:00.000Z" });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "This reward has expired",
    );
  });

  test("allows a reward inside its validity window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
    withTime({ valid_from: "2026-01-01T00:00:00.000Z", valid_until: "2026-06-01T00:00:00.000Z" });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("refuses a day that is not in the allowed list", async () => {
    vi.useFakeTimers();
    // A Thursday in every timezone this could plausibly run in.
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    withTime({ allowed_days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Only available on: monday, tuesday",
    );
  });

  test("allows a day that is in the allowed list", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12)); // Thursday
    withTime({ allowed_days: [DayOfWeek.THURSDAY] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("refuses a time outside every allowed range", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 22, 30));
    withTime({ allowed_time_ranges: [{ start: "09:00", end: "17:00" }] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Only available during specified hours",
    );
  });

  test("allows a time inside one of the ranges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 30));
    withTime({
      allowed_time_ranges: [
        { start: "09:00", end: "11:00" },
        { start: "12:00", end: "14:00" },
      ],
    });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  // NOTE: pins current behaviour. Days and time ranges are read off the SERVER's
  // clock (`getDay()`, `toTimeString()`) while blackout dates are compared
  // against the UTC date (`toISOString().split("T")[0]`). The same reward can
  // therefore be simultaneously inside its allowed day and inside a blackout —
  // and the whole restriction set shifts if the API moves region.
  // See issues.txt 20.2.
  test("blackout dates are matched in UTC while days and hours are matched locally", async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 0, 15, 23, 30);
    vi.setSystemTime(now);
    const utcDate = now.toISOString().split("T")[0];
    withTime({ blackout_dates: [utcDate] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Not available on this date",
    );
  });

  test("a date that is not blacked out passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    withTime({ blackout_dates: ["2020-01-01"] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("collects every time violation rather than stopping at the first", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 22, 30)); // Thursday, out of hours
    withTime({
      valid_until: "2020-01-01T00:00:00.000Z",
      allowed_days: [DayOfWeek.MONDAY],
      allowed_time_ranges: [{ start: "09:00", end: "17:00" }],
    });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toHaveLength(3);
  });
});

// ===========================================================================
// Quantity restrictions
// ===========================================================================

describe("validateRedemption — quantity restrictions", () => {
  function withQuantity(restrictions: Record<string, unknown>) {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ redemptionRules: { quantity_restrictions: restrictions } }),
    );
  }

  test("a one-time reward is refused once it has been taken", async () => {
    withQuantity({ one_time_use: true });
    db.loyaltyRedemption.findFirst.mockResolvedValue({ id: "prev" });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "This reward can only be used once",
    );
  });

  test("a pending redemption already counts against the one-time limit", async () => {
    withQuantity({ one_time_use: true });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(db.loyaltyRedemption.findFirst.mock.calls[0][0].where.status).toEqual({
      in: ["APPROVED", "PENDING", "USED"],
    });
  });

  test("a rejected or cancelled redemption does not consume the allowance", async () => {
    withQuantity({ one_time_use: true });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const statuses = db.loyaltyRedemption.findFirst.mock.calls[0][0].where.status.in;
    expect(statuses).not.toContain("REJECTED");
    expect(statuses).not.toContain("CANCELLED");
  });

  test("refuses once the per-customer maximum is reached", async () => {
    withQuantity({ max_redemptions_per_customer: 3 });
    db.loyaltyRedemption.count.mockResolvedValue(3);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Maximum redemption limit reached for this reward",
    );
  });

  test("allows the redemption that reaches the maximum", async () => {
    withQuantity({ max_redemptions_per_customer: 3 });
    db.loyaltyRedemption.count.mockResolvedValue(2);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("the daily limit counts from local midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 14, 30));
    withQuantity({ max_redemptions_per_day: 1 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const since = db.loyaltyRedemption.count.mock.calls[0][0].where.createdAt.gte;
    expect(since).toEqual(new Date(2026, 0, 15, 0, 0, 0, 0));
  });

  test("refuses once the daily limit is reached", async () => {
    withQuantity({ max_redemptions_per_day: 2 });
    db.loyaltyRedemption.count.mockResolvedValue(2);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Daily redemption limit reached",
    );
  });

  // NOTE: the day limit is a calendar day (since local midnight) but the week and
  // month limits are rolling windows measured back from *now*. Three limits on
  // the same reward therefore use two different notions of a period, and neither
  // week nor month ever resets on a boundary the customer can predict.
  // See issues.txt 20.3.
  test("the weekly limit is a rolling seven days, not a calendar week", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 14, 30));
    withQuantity({ max_redemptions_per_week: 1 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const since = db.loyaltyRedemption.count.mock.calls[0][0].where.createdAt.gte;
    expect(since).toEqual(new Date(2026, 0, 8, 14, 30));
  });

  // NOTE: `setMonth(getMonth() - 1)` on a day that the previous month does not
  // have rolls forward instead of clamping — 31 March becomes 3 March, so the
  // "monthly" window is 28 days rather than 31. See issues.txt 20.3.
  test("the monthly window collapses when today is the 31st", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 31, 12, 0));
    withQuantity({ max_redemptions_per_month: 1 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const since = db.loyaltyRedemption.count.mock.calls[0][0].where.createdAt.gte;
    expect(since.getMonth()).toBe(2); // March, not February
    expect(since.getDate()).toBe(3);
  });

  test("reports every quantity limit that is breached at once", async () => {
    withQuantity({
      one_time_use: true,
      max_redemptions_per_customer: 1,
      max_redemptions_per_day: 1,
    });
    db.loyaltyRedemption.findFirst.mockResolvedValue({ id: "prev" });
    db.loyaltyRedemption.count.mockResolvedValue(5);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toHaveLength(3);
  });
});

// ===========================================================================
// Cooldown
// ===========================================================================

describe("validateRedemption — cooldown", () => {
  function withCooldown(cooldown: Record<string, unknown>) {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ redemptionRules: { cooldown: { enabled: true, ...cooldown } } }),
    );
  }

  test("refuses inside the cooldown and says how long is left", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    withCooldown({ period_hours: 24 });
    db.loyaltyRedemption.findFirst.mockResolvedValue({
      createdAt: new Date("2026-01-15T04:00:00.000Z"),
    });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Please wait 16 hours",
    );
  });

  test("allows once the cooldown has elapsed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    withCooldown({ period_hours: 24 });
    db.loyaltyRedemption.findFirst.mockResolvedValue({
      createdAt: new Date("2026-01-14T04:00:00.000Z"),
    });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("allows a customer who has never redeemed this reward", async () => {
    withCooldown({ period_hours: 24 });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("measures from the most recent redemption", async () => {
    withCooldown({ period_hours: 24 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(db.loyaltyRedemption.findFirst.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  // NOTE: pins current behaviour. `period_hours` is read with a non-null
  // assertion; when the block is enabled without one, every comparison against
  // undefined is false and the cooldown silently does not apply.
  // See issues.txt 20.4.
  test("a cooldown enabled without a period silently does nothing", async () => {
    withCooldown({});
    db.loyaltyRedemption.findFirst.mockResolvedValue({ createdAt: new Date() });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });
});

// ===========================================================================
// Spend, tier and stock
// ===========================================================================

describe("validateRedemption — spend requirements", () => {
  function withSpend(minimum: number) {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        redemptionRules: { spend_requirements: { enabled: true, minimum_spend: minimum } },
      }),
    );
  }

  test("refuses a purchase below the minimum", async () => {
    withSpend(500);

    expect(
      (await validateRedemption(CUSTOMER, REWARD, { purchase_amount: 100 } as any)).violations,
    ).toContain("Minimum spend of 500 required");
  });

  test("allows a purchase at the minimum", async () => {
    withSpend(500);

    expect(
      (await validateRedemption(CUSTOMER, REWARD, { purchase_amount: 500 } as any)).valid,
    ).toBe(true);
  });

  // NOTE: pins current behaviour. The check is guarded by
  // `rules.spend_requirements?.enabled && context.purchase_amount`, so a caller
  // that simply omits the purchase amount — or sends 0 — skips the minimum-spend
  // rule entirely rather than failing it. See issues.txt 20.5.
  test("omitting the purchase amount skips the minimum-spend rule", async () => {
    withSpend(500);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("a zero purchase amount also skips it", async () => {
    withSpend(500);

    expect((await validateRedemption(CUSTOMER, REWARD, { purchase_amount: 0 } as any)).valid).toBe(
      true,
    );
  });
});

describe("validateRedemption — tier restrictions", () => {
  function withTiers(allowed: string[]) {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ redemptionRules: { tier_restrictions: { enabled: true, allowed_tiers: allowed } } }),
    );
  }

  test("refuses a customer whose tier is not allowed", async () => {
    withTiers(["tier-platinum"]);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Your tier does not have access to this reward",
    );
  });

  test("allows a customer whose tier is on the list", async () => {
    withTiers(["tier-gold", "tier-platinum"]);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  // NOTE: pins current behaviour. The guard is
  // `allowed_tiers.length > 0 && customerTierId`, so a customer with NO tier
  // falls straight through and is granted a tier-exclusive reward. New accounts
  // are exactly this case — see issues.txt 20.11, where the entry-tier lookup
  // leaves currentTierId null. See issues.txt 20.6.
  test("a customer with no tier bypasses the tier restriction entirely", async () => {
    withTiers(["tier-platinum"]);
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentTierId: null }));

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("an empty allowed list restricts nobody", async () => {
    withTiers([]);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });
});

describe("validateRedemption — stock", () => {
  test("refuses a reward that has sold out", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        stockQuantity: 10,
        stockRedeemed: 10,
        redemptionRules: { inventory: { enabled: true } },
      }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "This reward is out of stock",
    );
  });

  test("allows a reward with stock left", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        stockQuantity: 10,
        stockRedeemed: 9,
        redemptionRules: { inventory: { enabled: true } },
      }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("an unlimited reward never runs out", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        stockQuantity: null,
        stockRedeemed: 999,
        redemptionRules: { inventory: { enabled: true } },
      }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  // NOTE: pins current behaviour. The stock check runs only when the rules JSON
  // opts in with `inventory.enabled`. A reward that carries a real stockQuantity
  // but no inventory block oversells without limit — and the redemption service
  // increments stockRedeemed for it regardless. See issues.txt 20.7.
  test("a sold-out reward is allowed when the inventory block is not enabled", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ stockQuantity: 10, stockRedeemed: 10, redemptionRules: {} }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });
});

describe("validateRedemption — the rules column itself", () => {
  // NOTE: `redemptionRules` is nullable on LoyaltyReward and is read as
  // `reward.redemptionRules as LoyaltyRedemptionRules` with no fallback, so the
  // first `rules.time_restrictions` access throws. The redemption service guards
  // the same column with `?.` — the two files disagree. See issues.txt 20.8.
  test("throws for a reward whose rules column is null", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ redemptionRules: null }));

    await expect(validateRedemption(CUSTOMER, REWARD, {} as any)).rejects.toThrow(TypeError);
  });
});

// ===========================================================================
// generateRedemptionCode
// ===========================================================================

describe("generateRedemptionCode", () => {
  test("is prefixed and upper-cased", () => {
    expect(generateRedemptionCode()).toMatch(/^RU-[0-9A-Z]*$/);
  });

  // NOTE: pins current behaviour. A redemption code is a bearer token for a
  // discount, but it is drawn from Math.random (not a CSPRNG) and never checked
  // for uniqueness against the table — unlike the reward short code, which loops
  // until it finds a free one. See issues.txt 20.9.
  test("is drawn from Math.random with no uniqueness check", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    expect(generateRedemptionCode()).toBe(generateRedemptionCode());
    expect(db.loyaltyRedemption.findFirst).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  // NOTE: `Math.random().toString(36).substring(2, 8)` assumes the string always
  // has eight characters. When the random value is short the code is shorter
  // than the intended six — in the extreme, empty. See issues.txt 20.9.
  test("produces a shorter code when the random value is short", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    // (0.5).toString(36) is "0.i" — substring(2, 8) is a single character.
    expect(generateRedemptionCode()).toBe("RU-I");

    spy.mockRestore();
  });

  test("produces an empty suffix when the random value is exactly zero", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateRedemptionCode()).toBe("RU-");

    spy.mockRestore();
  });
});
