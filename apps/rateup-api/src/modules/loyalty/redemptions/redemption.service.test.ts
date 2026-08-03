import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    customerReward: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyReward: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyRedemption: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("../redemptionValidator.js", () => ({
  validateRedemption: vi.fn(),
  generateRedemptionCode: vi.fn(() => "RU-ABC123"),
}));

vi.mock("../loyaltyWaDispatcher.js", () => ({ dispatchLoyaltyNotification: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { validateRedemption } from "../redemptionValidator.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  applyRedemption,
  getRedemptionsByCustomer,
  getTransactions,
  getTransactionsForExport,
  redeemReward,
  verifyRedemption,
} from "./redemption.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  customerLoyaltyAccount: Record<string, Mock>;
  customerReward: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

interface CustomerFixture {
  id: string;
  currentPoints: number;
  contact: { name: string; phone: string; orgId: string };
  currentTier: { id: string; name: string } | null;
}

interface RewardFixture {
  id: string;
  name: string;
  rewardType: string;
  pointsCost: number;
  rewardValue: Record<string, unknown>;
  stockQuantity: number | null;
  redemptionRules: Record<string, unknown>;
  waTemplateId: string | null;
}

function customer(over: Record<string, unknown> = {}) {
  const base: CustomerFixture = {
    id: "acct-1",
    currentPoints: 500,
    contact: { name: "Ann", phone: "919000000001", orgId: ORG },
    currentTier: null,
  };
  return { ...base, ...over };
}

function reward(over: Record<string, unknown> = {}) {
  const base: RewardFixture = {
    id: "rwd-1",
    name: "Free coffee",
    rewardType: "coupon",
    pointsCost: 100,
    rewardValue: {},
    stockQuantity: null,
    redemptionRules: {},
    waTemplateId: null,
  };
  return { ...base, ...over };
}

const input = { customerId: "acct-1", rewardId: "rwd-1" } as any;

beforeEach(() => {
  vi.clearAllMocks();
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer());
  db.customerLoyaltyAccount.update.mockResolvedValue({});
  db.customerReward.findUnique.mockResolvedValue(null);
  db.customerReward.update.mockResolvedValue({});
  db.loyaltyReward.findUnique.mockResolvedValue(reward());
  db.loyaltyReward.update.mockResolvedValue({});
  db.loyaltyRedemption.findUnique.mockResolvedValue(null);
  db.loyaltyRedemption.findMany.mockResolvedValue([]);
  db.loyaltyRedemption.create.mockResolvedValue({ id: "red-1" });
  db.loyaltyRedemption.update.mockResolvedValue({ id: "red-1" });
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
  db.loyaltyTransaction.findMany.mockResolvedValue([]);
  db.loyaltyTransaction.count.mockResolvedValue(0);
  (validateRedemption as Mock).mockResolvedValue({ valid: true, violations: [] });
});

// ===========================================================================
// Preconditions shared by every reward type
// ===========================================================================

describe("redeemReward — preconditions", () => {
  test("refuses an account that does not exist", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow("Customer account not found");
  });

  test("refuses a reward that does not exist", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(null);

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow("Reward not found");
  });

  test("refuses a customer who cannot afford the reward", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentPoints: 50 }));

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow(
      "Insufficient points. Required: 100, Available: 50",
    );
  });

  test("an assigned reward needs no points", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ rewardType: "assigned" }));
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer({ currentPoints: 0 }));

    await expect(redeemReward(PROGRAM, input)).resolves.toBeDefined();
  });

  test("surfaces every rule violation the validator reports", async () => {
    (validateRedemption as Mock).mockResolvedValue({
      valid: false,
      violations: ["This reward has expired", "Daily redemption limit reached"],
    });

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow(
      "Redemption validation failed: This reward has expired, Daily redemption limit reached",
    );
  });

  test("writes nothing when validation fails", async () => {
    (validateRedemption as Mock).mockResolvedValue({ valid: false, violations: ["nope"] });

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow();
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The balance is read at the top, compared, and
  // then written with an unconditional `decrement` — there is no
  // `where: { currentPoints: { gte: cost } }` and no transaction. Two redemptions
  // racing on the same account both pass the check and both deduct, taking the
  // balance negative. See issues.txt 20.17.
  test("deducts unconditionally rather than guarding the write on the balance", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0]).toEqual({
      where: { id: "acct-1" },
      data: { currentPoints: { decrement: 100 } },
    });
  });
});

// ===========================================================================
// Point rewards
// ===========================================================================

describe("redeemReward — point rewards", () => {
  beforeEach(() => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ rewardType: "point", rewardValue: { points: 300 } }),
    );
  });

  test("nets the awarded points against the cost in one update", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: 200 },
    });
  });

  test("marks the redemption used immediately", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.loyaltyRedemption.create.mock.calls[0][0].data).toMatchObject({
      status: "USED",
      rulesValidationPassed: true,
    });
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.usedAt).toBeInstanceOf(Date);
  });

  test("treats a reward with no points value as worth nothing", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ rewardType: "point", rewardValue: {} }));

    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: -100 },
    });
  });

  // NOTE: pins current behaviour. The ledger row records
  // `balanceAfter: currentPoints - pointsCost` while the balance is actually
  // moved by `pointsToAdd - pointsCost`. Every point-reward redemption leaves a
  // ledger entry understating the real balance by the points it just granted.
  // See issues.txt 20.15.
  test("the ledger row omits the points the redemption granted", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      points: -100,
      balanceAfter: 400, // real balance is 500 - 100 + 300 = 700
    });
  });

  // NOTE: the instant code is a millisecond timestamp, so two point redemptions
  // in the same millisecond collide on a unique column, and the code is entirely
  // predictable. See issues.txt 20.9.
  test("names the redemption after the current millisecond", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toMatch(/^INSTANT_[0-9A-Z]+$/);
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.redemptionCode).toBe(
      res.redemptionCode,
    );
  });

  test("burns stock only for a reward that tracks it", async () => {
    await redeemReward(PROGRAM, input);
    expect(db.loyaltyReward.update).not.toHaveBeenCalled();

    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ rewardType: "point", rewardValue: { points: 300 }, stockQuantity: 10 }),
    );
    await redeemReward(PROGRAM, input);
    expect(db.loyaltyReward.update.mock.calls[0][0].data).toEqual({
      stockRedeemed: { increment: 1 },
    });
  });

  test("tells the customer what they gained", async () => {
    await redeemReward(PROGRAM, input);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      expect.objectContaining({ points: 300, balanceAfter: 700 }),
    );
  });
});

// ===========================================================================
// Coupon rewards
// ===========================================================================

describe("redeemReward — coupon rewards", () => {
  test("deducts the points and approves it outright", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { decrement: 100 },
    });
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.status).toBe("APPROVED");
    expect(res.message).toContain("Coupon redeemed successfully");
  });

  test("leaves the points alone when the coupon needs approval", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ redemptionRules: { approval_rules: { requires_approval: true } } }),
    );

    const res: any = await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.status).toBe("PENDING");
    expect(res.message).toBe("Redemption pending approval");
  });

  test("a pending coupon still gets a redemption row to approve later", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({ redemptionRules: { approval_rules: { requires_approval: true } } }),
    );

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyRedemption.create).toHaveBeenCalled();
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.transactionId).toBeUndefined();
  });

  test("does not burn stock or notify while approval is pending", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        stockQuantity: 10,
        redemptionRules: { approval_rules: { requires_approval: true } },
      }),
    );

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyReward.update).not.toHaveBeenCalled();
    expect(dispatchLoyaltyNotification).not.toHaveBeenCalled();
  });

  test("hands the customer the coupon code", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toBe("RU-ABC123");
    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.REWARD_REDEEMED,
      expect.objectContaining({ redemptionCode: "RU-ABC123", points: -100 }),
    );
  });
});

// ===========================================================================
// Regular / assigned rewards
// ===========================================================================

describe("redeemReward — regular rewards", () => {
  const regular = reward({ rewardType: "gift" });

  beforeEach(() => {
    db.loyaltyReward.findUnique.mockResolvedValue(regular);
  });

  test("deducts the points and hands back a short code", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { decrement: 100 },
    });
    expect(res.shortCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(res.redemptionCode).toBeUndefined();
  });

  test("marks the customer's existing assignment as redeemed", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerReward.update.mock.calls[0][0]).toMatchObject({
      where: { rewardId_accountId: { rewardId: "rwd-1", accountId: "acct-1" } },
      data: { status: "REDEEMED" },
    });
  });

  test("records the redemption with both codes in its context", async () => {
    await redeemReward(PROGRAM, input);

    const data = db.loyaltyRedemption.create.mock.calls[0][0].data;
    expect(data.status).toBe("APPROVED");
    expect(data.usedContext.shortCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  // NOTE: pins current behaviour, and it is the sharpest defect in this file.
  // When the reward requires approval, the branch writes a zero-point ledger row
  // and NOTHING else — no LoyaltyRedemption is created. The function still
  // returns a redemptionCode to the caller, but that code exists nowhere in the
  // database, so verifyRedemption cannot find it and the approvals queue has no
  // request to act on. The pending redemption is simply lost.
  // See issues.txt 20.19.
  test("creates no redemption record at all when approval is required", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(
      reward({
        rewardType: "gift",
        redemptionRules: { approval_rules: { requires_approval: true } },
      }),
    );

    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toBe("RU-ABC123");
    expect(db.loyaltyRedemption.create).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      points: 0,
      metadata: expect.objectContaining({ status: "pending_approval" }),
    });
  });

  // NOTE: the assignment update runs AFTER the points have been deducted and the
  // ledger row written, and it is keyed on a CustomerReward row that only exists
  // if the reward was previously assigned. For a regular reward that was never
  // assigned, prisma raises P2025 here — leaving the customer charged with no
  // reward and no redemption record. See issues.txt 20.19.
  test("charges the customer before discovering there is no assignment to update", async () => {
    db.customerReward.update.mockRejectedValue(
      Object.assign(
        new Error(
          "An operation failed because it depends on one or more records that were required but not found",
        ),
        {
          code: "P2025",
        },
      ),
    );

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow();

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).toHaveBeenCalled();
    expect(db.loyaltyRedemption.create).not.toHaveBeenCalled();
  });

  test("burns stock for a reward that tracks it", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(reward({ rewardType: "gift", stockQuantity: 5 }));

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyReward.update.mock.calls[0][0].data).toEqual({
      stockRedeemed: { increment: 1 },
    });
  });

  test("tells the customer their reward is ready", async () => {
    await redeemReward(PROGRAM, input);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.REWARD_ISSUED,
      expect.objectContaining({ rewardName: "Free coffee", balanceAfter: 400 }),
    );
  });
});

// ===========================================================================
// verifyRedemption / applyRedemption
// ===========================================================================

describe("verifyRedemption", () => {
  test("refuses a code that matches nothing", async () => {
    await expect(verifyRedemption("NOPE")).rejects.toThrow("Redemption not found");
  });

  test("an approved, unused redemption is valid", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({
      status: "APPROVED",
      usedAt: null,
      account: {},
      reward: {},
    });

    expect((await verifyRedemption("RU-ABC123")).valid).toBe(true);
  });

  test.each([
    ["PENDING", null],
    ["REJECTED", null],
    ["APPROVED", new Date()],
  ])("a %s redemption is not valid", async (status, usedAt) => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({ status, usedAt, account: {}, reward: {} });

    expect((await verifyRedemption("RU-ABC123")).valid).toBe(false);
  });

  // NOTE: the lookup is by code alone. Nothing ties it to the caller's org, so a
  // cashier in any org can verify — and then apply — another org's redemption
  // code. Combined with the code's low entropy (issues.txt 20.9) this is
  // guessable rather than merely reachable. See issues.txt 20.20.
  test("resolves a code with no org restriction", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({
      status: "APPROVED",
      usedAt: null,
      account: {},
      reward: {},
    });

    await verifyRedemption("RU-ABC123");

    expect(db.loyaltyRedemption.findUnique.mock.calls[0][0].where).toEqual({
      redemptionCode: "RU-ABC123",
    });
  });
});

describe("applyRedemption", () => {
  const approved: {
    id: string;
    status: string;
    usedAt: Date | null;
    rewardId: string;
    usedContext: { shortCode: string };
    reward: { id: string; name: string; rewardType: string; stockQuantity: number | null };
    account: { contact: { name: string; phone: string; orgId: string } };
  } = {
    id: "red-1",
    status: "APPROVED",
    usedAt: null,
    rewardId: "rwd-1",
    usedContext: { shortCode: "SHORT123" },
    reward: { id: "rwd-1", name: "Free coffee", rewardType: "gift", stockQuantity: 10 },
    account: { contact: { name: "Ann", phone: "919000000001", orgId: ORG } },
  };

  const applyInput = { redemptionCode: "RU-ABC123", appliedBy: "cashier-1" } as any;

  beforeEach(() => {
    db.loyaltyRedemption.findUnique.mockResolvedValue(approved);
    db.loyaltyRedemption.update.mockResolvedValue({
      ...approved,
      status: "USED",
      account: approved.account,
      reward: approved.reward,
    });
  });

  test("refuses a code that matches nothing", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue(null);

    await expect(applyRedemption(applyInput)).rejects.toThrow("Redemption not found");
  });

  test("refuses a redemption that is not approved", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({ ...approved, status: "PENDING" });

    await expect(applyRedemption(applyInput)).rejects.toThrow("Redemption is not approved");
  });

  test("refuses to apply the same redemption twice", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({ ...approved, usedAt: new Date() });

    await expect(applyRedemption(applyInput)).rejects.toThrow("Redemption already applied");
  });

  test("stamps who applied it and when, preserving the original context", async () => {
    await applyRedemption({ ...applyInput, notes: "at till 3" });

    const data = db.loyaltyRedemption.update.mock.calls[0][0].data;
    expect(data.status).toBe("USED");
    expect(data.usedAt).toBeInstanceOf(Date);
    expect(data.usedContext).toMatchObject({
      shortCode: "SHORT123",
      appliedBy: "cashier-1",
      applyNotes: "at till 3",
    });
  });

  test("marks the underlying assignment redeemed for a non-coupon reward", async () => {
    await applyRedemption(applyInput);

    expect(db.customerReward.update).toHaveBeenCalledWith({
      where: { shortCode: "SHORT123" },
      data: { status: "REDEEMED" },
    });
  });

  test("leaves assignments alone for a coupon", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({
      ...approved,
      reward: { ...approved.reward, rewardType: "coupon" },
    });

    await applyRedemption(applyInput);

    expect(db.customerReward.update).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. redeemReward already incremented stockRedeemed
  // when it approved the redemption; applying it at the till increments a second
  // time. Every reward that is redeemed and then presented consumes TWO units of
  // stock, so a limited reward sells out at half its configured quantity.
  // See issues.txt 20.21.
  test("increments the stock a second time at the till", async () => {
    await applyRedemption(applyInput);

    expect(db.loyaltyReward.update).toHaveBeenCalledWith({
      where: { id: "rwd-1" },
      data: { stockRedeemed: { increment: 1 } },
    });
  });

  test("skips the stock write for an unlimited reward", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue({
      ...approved,
      reward: { ...approved.reward, stockQuantity: null },
    });

    await applyRedemption(applyInput);

    expect(db.loyaltyReward.update).not.toHaveBeenCalled();
  });

  test("tells the customer the reward was used", async () => {
    await applyRedemption(applyInput);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.REWARD_REDEEMED,
      expect.objectContaining({ redemptionCode: "RU-ABC123" }),
    );
  });

  test("applies a code with no org restriction", async () => {
    await applyRedemption(applyInput);

    expect(db.loyaltyRedemption.findUnique.mock.calls[0][0].where).toEqual({
      redemptionCode: "RU-ABC123",
    });
  });
});

// ===========================================================================
// Ledger reads
// ===========================================================================

describe("getRedemptionsByCustomer", () => {
  // NOTE: scoped to the account id alone, with no program or org filter.
  // See issues.txt 20.20.
  test("lists an account's redemptions newest first, unscoped", async () => {
    await getRedemptionsByCustomer("acct-1");

    expect(db.loyaltyRedemption.findMany.mock.calls[0][0]).toMatchObject({
      where: { accountId: "acct-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getTransactions", () => {
  test("always scopes to the program", async () => {
    await getTransactions(PROGRAM, {});

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].where).toEqual({ programId: PROGRAM });
  });

  test("builds a closed date range from both bounds", async () => {
    await getTransactions(PROGRAM, { fromDate: "2026-01-01", toDate: "2026-01-31" });

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].where.createdAt).toEqual({
      gte: new Date("2026-01-01"),
      lte: new Date("2026-01-31"),
    });
  });

  test.each([
    ["transactionType", "earn", "transactionType"],
    ["source", "purchase", "source"],
    ["customerId", "acct-1", "accountId"],
  ])("maps the %s filter onto %s", async (key, value, column) => {
    await getTransactions(PROGRAM, { [key]: value } as any);

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].where[column]).toBe(value);
  });

  test("builds a points range from either bound", async () => {
    await getTransactions(PROGRAM, { minPoints: -100, maxPoints: 100 });

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].where.points).toEqual({
      gte: -100,
      lte: 100,
    });
  });

  test("keeps a zero bound rather than treating it as absent", async () => {
    await getTransactions(PROGRAM, { minPoints: 0 });

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].where.points).toEqual({ gte: 0 });
  });

  test("counts and lists with the same condition", async () => {
    await getTransactions(PROGRAM, { source: "purchase" });

    expect(db.loyaltyTransaction.count.mock.calls[0][0].where).toEqual(
      db.loyaltyTransaction.findMany.mock.calls[0][0].where,
    );
  });

  test("reports the page count alongside the rows", async () => {
    db.loyaltyTransaction.count.mockResolvedValue(45);

    const res = await getTransactions(PROGRAM, { limit: 20 });

    expect(res.pagination).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  // NOTE: pins current behaviour. Paging here is ONE-based — `skip: (page - 1) *
  // limit` — while every other list endpoint in the codebase is zero-based (see
  // issues.txt 8.2, 13.6, 17.9). `filters.page || 1` then swallows the mistake
  // rather than surfacing it: a zero-based client asking for page 0 and page 1
  // gets the SAME first page twice, and can never reach the final page.
  // See issues.txt 20.22.
  test("treats the page number as one-based, and silently folds page 0 into page 1", async () => {
    await getTransactions(PROGRAM, { page: 1, limit: 20 });
    await getTransactions(PROGRAM, { page: 0, limit: 20 });
    await getTransactions(PROGRAM, { page: 2, limit: 20 });

    const skips = db.loyaltyTransaction.findMany.mock.calls.map((c) => c[0].skip);
    expect(skips).toEqual([0, 0, 20]);
  });

  test("defaults to the first twenty rows", async () => {
    await getTransactions(PROGRAM, {});

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });
  });
});

describe("getTransactionsForExport", () => {
  test("applies the same filters as the paginated read", async () => {
    await getTransactionsForExport(PROGRAM, { source: "purchase", minPoints: 10 });

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      source: "purchase",
      points: { gte: 10 },
    });
  });

  // NOTE: no take, so an export with no filters materialises the program's whole
  // ledger. Same shape as issues.txt 19.6 and 18.20. See issues.txt 20.22.
  test("reads every matching row with no limit", async () => {
    await getTransactionsForExport(PROGRAM, {});

    const call = db.loyaltyTransaction.findMany.mock.calls[0][0];
    expect(call).not.toHaveProperty("take");
    expect(call).not.toHaveProperty("skip");
  });
});
