import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyReward: { findFirst: vi.fn() },
    customerLoyaltyAccount: { findUnique: vi.fn() },
    customerReward: { findUnique: vi.fn() },
    loyaltyRedemption: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
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
const PROGRAM = "prog-1";

interface RewardFixture {
  id: string;
  name: string;
  rewardType: string;
  pointsCost: number;
  stockQuantity: number | null;
  stockRedeemed: number;
  redemptionRules: Record<string, unknown>;
}

function reward(over: Record<string, unknown> = {}) {
  const base: RewardFixture = {
    id: REWARD,
    name: "Free coffee",
    rewardType: "coupon",
    pointsCost: 100,
    stockQuantity: null,
    stockRedeemed: 0,
    redemptionRules: {},
  };
  return { ...base, ...over };
}

function customer(over: Record<string, unknown> = {}) {
  return {
    id: CUSTOMER,
    programId: PROGRAM,
    currentPoints: 500,
    currentTierId: "tier-gold",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyReward.findFirst.mockResolvedValue(reward());
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer());
  db.customerReward.findUnique.mockResolvedValue(null);
  db.loyaltyRedemption.findUnique.mockResolvedValue(null);
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
    db.loyaltyReward.findFirst.mockResolvedValue(null);

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

  // Both lookups used to be by id alone, with nothing checking that the reward and
  // the account belonged to the same loyalty program, let alone the same org. This
  // is the one function whose whole job is to decide whether a redemption is
  // allowed, and "do these two things belong together" was the precondition it
  // never established. See issues.txt 20.1 and 20.20.
  test("looks the reward up through the account's program", async () => {
    await validateRedemption(CUSTOMER, REWARD, {} as any);

    expect(db.loyaltyReward.findFirst.mock.calls[0][0]).toEqual({
      where: { id: REWARD, programId: PROGRAM },
    });
    expect(db.customerLoyaltyAccount.findUnique.mock.calls[0][0].where).toEqual({ id: CUSTOMER });
  });

  test("a reward in another program is simply not found", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(null);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toEqual([
      "Reward not found",
    ]);
  });

  // The account is resolved first, so a request naming an account that does not
  // exist never reaches the reward lookup at all.
  test("resolves the account before the reward", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    await validateRedemption("nope", REWARD, {} as any);

    expect(db.loyaltyReward.findFirst).not.toHaveBeenCalled();
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
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ rewardType: "assigned" }));
    db.customerReward.findUnique.mockResolvedValue({ id: "assignment-1" });
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentPoints: 0 }));

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("an assigned reward must actually be assigned to that customer", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ rewardType: "assigned" }));
    db.customerReward.findUnique.mockResolvedValue(null);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Reward is not assigned to the customer",
    );
  });

  test("the assignment lookup keys on the reward and account together", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ rewardType: "assigned" }));

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
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ redemptionRules: { time_restrictions: { enabled: true, ...restrictions } } }),
    );
  }

  test("does nothing at all when the block is not enabled", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
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
    // Thursday 15 January 2026, in UTC — which is the only clock this file reads.
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    withTime({ allowed_days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Only available on: monday, tuesday",
    );
  });

  test("allows a day that is in the allowed list", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z")); // Thursday, UTC
    withTime({ allowed_days: [DayOfWeek.THURSDAY] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("refuses a time outside every allowed range", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T22:30:00.000Z"));
    withTime({ allowed_time_ranges: [{ start: "09:00", end: "17:00" }] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Only available during specified hours",
    );
  });

  test("allows a time inside one of the ranges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:30:00.000Z"));
    withTime({
      allowed_time_ranges: [
        { start: "09:00", end: "11:00" },
        { start: "12:00", end: "14:00" },
      ],
    });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  // Days and time ranges used to be read off the SERVER's clock — `getDay()` and
  // `toTimeString()` — while blackout dates in the same function were compared
  // against the UTC date. Near midnight the two halves actively disagreed: a
  // reward could be inside its allowed local day and inside its UTC blackout at
  // the same time, and the whole restriction set shifted if the API moved region.
  // All three read UTC now. It is not the right timezone — that is the merchant's,
  // and nothing in the codebase carries one — but it is a consistent one.
  // See issues.txt 20.2.
  test("blackout dates are matched on the same UTC clock as days and hours", async () => {
    vi.useFakeTimers();
    // 23:30 UTC on the 15th. Under the old split this same instant was the 16th
    // for the blackout check in any timezone east of UTC, and the 15th for the day
    // and hour checks.
    vi.setSystemTime(new Date("2026-01-15T23:30:00.000Z"));
    withTime({ blackout_dates: ["2026-01-15"] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Not available on this date",
    );
  });

  test("a date that is not blacked out passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    withTime({ blackout_dates: ["2020-01-01"] });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("collects every time violation rather than stopping at the first", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T22:30:00.000Z")); // Thursday, out of hours
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
    db.loyaltyReward.findFirst.mockResolvedValue(
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

  test("the daily limit counts from UTC midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T14:30:00.000Z"));
    withQuantity({ max_redemptions_per_day: 1 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const since = db.loyaltyRedemption.count.mock.calls[0][0].where.createdAt.gte;
    expect(since).toEqual(new Date("2026-01-15T00:00:00.000Z"));
  });

  test("refuses once the daily limit is reached", async () => {
    withQuantity({ max_redemptions_per_day: 2 });
    db.loyaltyRedemption.count.mockResolvedValue(2);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Daily redemption limit reached",
    );
  });

  // The day limit counted from local midnight (a calendar day), the week limit
  // counted back seven days from now (rolling), and the month limit used
  // `setMonth(getMonth() - 1)` — rolling, and subject to JS's month-length
  // roll-forward, so on the 31st of a month 31 March became 3 March and the
  // "monthly" window silently became 28 days. Three limits on one reward therefore
  // applied three different notions of a period, and neither the week nor the
  // month ever reset on a boundary a customer could predict. All three are
  // calendar windows in UTC now. See issues.txt 20.3.
  test("the weekly limit is a calendar week, not a rolling seven days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T14:30:00.000Z")); // Thursday
    withQuantity({ max_redemptions_per_week: 1 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const since = db.loyaltyRedemption.count.mock.calls[0][0].where.createdAt.gte;
    expect(since).toEqual(new Date("2026-01-11T00:00:00.000Z")); // the Sunday
  });

  test("the monthly window is a calendar month, on the 31st like any other day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));
    withQuantity({ max_redemptions_per_month: 1 });

    await validateRedemption(CUSTOMER, REWARD, {} as any);

    const since = db.loyaltyRedemption.count.mock.calls[0][0].where.createdAt.gte;
    expect(since).toEqual(new Date("2026-03-01T00:00:00.000Z"));
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
    db.loyaltyReward.findFirst.mockResolvedValue(
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

  // `period_hours` used to be read with a non-null assertion over a value the
  // rules JSON need not contain, and every comparison against undefined is false,
  // so `hoursSince < undefined` never fired: the rule looked active in the admin
  // UI and enforced nothing. A cooldown that cannot be evaluated is a
  // configuration error, and the safe reading of one is to refuse.
  // See issues.txt 20.4.
  test("a cooldown enabled without a period is a configuration error, not a pass", async () => {
    withCooldown({});

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "This reward's cooldown is not configured correctly",
    );
  });

  test("a cooldown of zero hours is refused the same way", async () => {
    withCooldown({ period_hours: 0 });

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(false);
  });
});

// ===========================================================================
// Spend, tier and stock
// ===========================================================================

describe("validateRedemption — spend requirements", () => {
  function withSpend(minimum: number) {
    db.loyaltyReward.findFirst.mockResolvedValue(
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

  // The check used to be guarded by
  // `rules.spend_requirements?.enabled && context.purchase_amount`, which let the
  // CALLER decide whether the rule applied: omitting the amount, or sending 0,
  // skipped it entirely rather than failing it. redeemReward builds its context as
  // `{ locationId }` and never sets purchase_amount at all, so the minimum-spend
  // rule was not enforced on any redemption made through the only path that
  // exists. See issues.txt 20.5.
  test("omitting the purchase amount fails the minimum-spend rule", async () => {
    withSpend(500);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Minimum spend of 500 required",
    );
  });

  test("a zero purchase amount fails it too", async () => {
    withSpend(500);

    expect((await validateRedemption(CUSTOMER, REWARD, { purchase_amount: 0 } as any)).valid).toBe(
      false,
    );
  });
});

describe("validateRedemption — tier restrictions", () => {
  function withTiers(allowed: string[]) {
    db.loyaltyReward.findFirst.mockResolvedValue(
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

  // The guard used to end `&& customerTierId`, so a customer with NO tier fell
  // straight through and was granted every tier-exclusive reward, including the
  // top one. That was not an edge case: new accounts were created untiered
  // whenever the entry-tier lookup missed, which it did for every single-tier
  // program (issues.txt 20.11). A null tier is not in any list, so it does not
  // match one. See issues.txt 20.6.
  test("a customer with no tier does not satisfy a tier restriction", async () => {
    withTiers(["tier-platinum"]);
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentTierId: null }));

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "Your tier does not have access to this reward",
    );
  });

  test("an empty allowed list restricts nobody", async () => {
    withTiers([]);

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });
});

describe("validateRedemption — stock", () => {
  test("refuses a reward that has sold out", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
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
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({
        stockQuantity: 10,
        stockRedeemed: 9,
        redemptionRules: { inventory: { enabled: true } },
      }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  test("an unlimited reward never runs out", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({
        stockQuantity: null,
        stockRedeemed: 999,
        redemptionRules: { inventory: { enabled: true } },
      }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });

  // The stock check used to run only when the rules JSON opted in with
  // `inventory.enabled`, while stockQuantity and stockRedeemed live on the reward
  // row and are set from the reward form — so the two halves of one feature were
  // gated by different switches. A reward carrying a real quantity but no
  // inventory block oversold without limit, while the redemption service still
  // incremented stockRedeemed past it and nothing acted on the number.
  // See issues.txt 20.7.
  test("a sold-out reward is refused whether or not an inventory block is present", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ stockQuantity: 10, stockRedeemed: 10, redemptionRules: {} }),
    );

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).violations).toContain(
      "This reward is out of stock",
    );
  });
});

describe("validateRedemption — the rules column itself", () => {
  // `redemptionRules` is nullable on LoyaltyReward and used to be read as
  // `reward.redemptionRules as LoyaltyRedemptionRules` with no fallback, so the
  // first `rules.time_restrictions` access threw a TypeError — while the
  // redemption service guarded the very same column with `?.`. Two files
  // disagreeing about one nullable column is the kind of thing that changes
  // behaviour on a data migration. See issues.txt 20.8.
  test("a reward whose rules column is null simply has no rules", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ redemptionRules: null }));

    expect((await validateRedemption(CUSTOMER, REWARD, {} as any)).valid).toBe(true);
  });
});

// ===========================================================================
// generateRedemptionCode
// ===========================================================================

describe("generateRedemptionCode", () => {
  // A redemption code is a bearer token for a discount. It used to be
  // `"RU-" + Math.random().toString(36).substring(2, 8).toUpperCase()`:
  // non-cryptographic, never compared against the table, and length-dependent on
  // the value it happened to draw — `(0.5).toString(36)` is "0.i", so the code
  // became "RU-I", and a draw of exactly 0 yielded a bare "RU-".
  // See issues.txt 20.9.
  test("is a fixed-length code from the unambiguous alphabet", async () => {
    expect(await generateRedemptionCode()).toMatch(/^RU-[A-HJ-NP-Z2-9]{10}$/);
  });

  test("does not repeat itself, and does not depend on Math.random", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const codes = new Set(await Promise.all(Array.from({ length: 50 }, generateRedemptionCode)));
    expect(codes.size).toBe(50);

    spy.mockRestore();
  });

  test("checks each candidate against the table before handing it out", async () => {
    await generateRedemptionCode();

    expect(db.loyaltyRedemption.findUnique.mock.calls[0][0].where.redemptionCode).toMatch(/^RU-/);
  });

  test("redraws when the code it picked is already taken", async () => {
    db.loyaltyRedemption.findUnique
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce(null);

    const code = await generateRedemptionCode();

    expect(db.loyaltyRedemption.findUnique).toHaveBeenCalledTimes(2);
    expect(db.loyaltyRedemption.findUnique.mock.calls[1][0].where.redemptionCode).toBe(code);
  });

  test("gives up rather than looping forever", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({ id: "taken" });

    await expect(generateRedemptionCode()).rejects.toThrow(
      "Could not generate a unique redemption code",
    );
  });
});
