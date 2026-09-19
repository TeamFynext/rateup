import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => {
  const client = {
    customerLoyaltyAccount: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    customerReward: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    loyaltyReward: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    loyaltyRedemption: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loyaltyTransaction: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    // Every write in this file now runs inside one transaction; the mock hands
    // the callback the same client so the assertions below read unchanged.
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { default: client };
});

vi.mock("../redemptionValidator.js", () => ({
  validateRedemption: vi.fn(),
  generateRedemptionCode: vi.fn(() => "RU-ABC123"),
}));

vi.mock("../messaging/send.js", () => ({ sendLoyaltyEvent: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { validateRedemption } from "../redemptionValidator.js";
import { sendLoyaltyEvent } from "../messaging/send.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  applyRedemption,
  getRedemptionsByCustomer,
  getTransactions,
  getTransactionsForExport,
  redeemReward,
  verifyRedemption,
} from "./redemption.service.js";

/** The `sendLoyaltyEvent` call made for `event`: org, recipient, data and options. */
function sentEvent(event: string) {
  const call = (sendLoyaltyEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
    (args) => args[1] === event,
  );
  return call && { orgId: call[0], to: call[2], data: call[3], options: call[4] };
}

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  customerLoyaltyAccount: Record<string, Mock>;
  customerReward: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  $transaction: Mock;
};

/** P2025 — the shape prisma raises when a conditional update matches no row. */
function notFound() {
  return Object.assign(new Error("Record to update not found"), { code: "P2025" });
}

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
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer());
  db.customerLoyaltyAccount.findFirst.mockResolvedValue(customer());
  // The conditional deduction returns the row as it now stands; 500 - 100.
  db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 400 });
  db.customerReward.findUnique.mockResolvedValue(null);
  db.customerReward.update.mockResolvedValue({});
  db.customerReward.upsert.mockResolvedValue({});
  db.loyaltyReward.findUnique.mockResolvedValue(reward());
  db.loyaltyReward.findFirst.mockResolvedValue(reward());
  db.loyaltyReward.update.mockResolvedValue({});
  db.loyaltyRedemption.findUnique.mockResolvedValue(null);
  db.loyaltyRedemption.findFirst.mockResolvedValue(null);
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
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow("Customer account not found");
  });

  test("refuses a reward that does not exist", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(null);

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow("Reward not found");
  });

  test("refuses a customer who cannot afford the reward", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(customer({ currentPoints: 50 }));

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow(
      "Insufficient points. Required: 100, Available: 50",
    );
  });

  test("an assigned reward needs no points", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ rewardType: "assigned" }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(customer({ currentPoints: 0 }));

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

  test("guards the deduction on the balance in the write itself", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0]).toEqual({
      where: { id: "acct-1", currentPoints: { gte: 100 } },
      data: { currentPoints: { increment: -100 } },
    });
  });

  test("reports insufficient points when the guarded write matches no row", async () => {
    db.customerLoyaltyAccount.update.mockRejectedValueOnce(notFound());

    await expect(redeemReward(PROGRAM, input)).rejects.toThrow(
      "Insufficient points. Required: 100",
    );
  });

  test("does every write in one transaction", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  test("resolves the account and the reward within the caller's program", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where).toEqual({
      id: "acct-1",
      programId: PROGRAM,
    });
    expect(db.loyaltyReward.findFirst.mock.calls[0][0].where).toEqual({
      id: "rwd-1",
      programId: PROGRAM,
    });
  });
});

// ===========================================================================
// Point rewards
// ===========================================================================

describe("redeemReward — point rewards", () => {
  beforeEach(() => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ rewardType: "point", rewardValue: { points: 300 } }),
    );
  });

  test("nets the awarded points against the cost in one update", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: 200 },
    });
  });

  // The guard is the COST, not the net movement: a point reward that grants more
  // than it costs still requires the customer to hold the cost.
  test("still requires the cost even though the net movement is positive", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].where).toEqual({
      id: "acct-1",
      currentPoints: { gte: 100 },
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
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ rewardType: "point", rewardValue: {} }));

    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: -100 },
    });
  });

  test("the ledger row records the balance the write actually produced", async () => {
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 700 });

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      points: 200,
      balanceAfter: 700,
    });
  });

  test("takes its code from the shared generator, not the clock", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toBe("RU-ABC123");
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.redemptionCode).toBe("RU-ABC123");
  });

  test("burns stock only for a reward that tracks it", async () => {
    await redeemReward(PROGRAM, input);
    expect(db.loyaltyReward.update).not.toHaveBeenCalled();

    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ rewardType: "point", rewardValue: { points: 300 }, stockQuantity: 10 }),
    );
    await redeemReward(PROGRAM, input);
    expect(db.loyaltyReward.update.mock.calls[0][0].data).toEqual({
      stockRedeemed: { increment: 1 },
    });
  });

  test("tells the customer what they gained", async () => {
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 700 });

    await redeemReward(PROGRAM, input);

    expect(sentEvent(LoyaltyEventType.POINTS_ISSUED)).toMatchObject({
      orgId: ORG,
      data: { points: 300, balance: 700 },
    });
  });

  // Every reward the setup wizard writes is `rewardType: "point"` with no points in its
  // value — it is bought with points, it does not pay any out. Announcing one as
  // "you just earned 0 points" was the only message the customer got for it.
  test("a reward that pays nothing out is announced as a redemption, not as points earned", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ rewardType: "point", rewardValue: { type: "free_item", item_name: "Latte" } }),
    );
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 700 });

    await redeemReward(PROGRAM, input);

    expect(sentEvent(LoyaltyEventType.REWARD_REDEEMED)).toMatchObject({
      orgId: ORG,
      data: { rewardName: "Free coffee", code: "RU-ABC123", cost: 100 },
    });
    expect(sentEvent(LoyaltyEventType.POINTS_ISSUED)).toBeUndefined();
  });
});

// ===========================================================================
// Coupon rewards
// ===========================================================================

describe("redeemReward — coupon rewards", () => {
  test("deducts the points and approves it outright", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: -100 },
    });
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.status).toBe("APPROVED");
    expect(res.message).toContain("Coupon redeemed successfully");
  });

  test("leaves the points alone when the coupon needs approval", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ redemptionRules: { approval_rules: { requires_approval: true } } }),
    );

    const res: any = await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.status).toBe("PENDING");
    expect(res.message).toBe("Redemption pending approval");
  });

  test("a pending coupon still gets a redemption row to approve later", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ redemptionRules: { approval_rules: { requires_approval: true } } }),
    );

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyRedemption.create).toHaveBeenCalled();
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data.transactionId).toBeUndefined();
  });

  test("does not burn stock or notify while approval is pending", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({
        stockQuantity: 10,
        redemptionRules: { approval_rules: { requires_approval: true } },
      }),
    );

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyReward.update).not.toHaveBeenCalled();
    expect(sendLoyaltyEvent).not.toHaveBeenCalled();
  });

  test("does not touch the balance at all when approval is pending", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({ redemptionRules: { approval_rules: { requires_approval: true } } }),
    );

    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("hands the customer the coupon code", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toBe("RU-ABC123");
    expect(sentEvent(LoyaltyEventType.REWARD_REDEEMED)).toMatchObject({
      orgId: ORG,
      data: { code: "RU-ABC123", cost: 100 },
    });
  });
});

// ===========================================================================
// Regular / assigned rewards
// ===========================================================================

describe("redeemReward — regular rewards", () => {
  const regular = reward({ rewardType: "gift" });

  beforeEach(() => {
    db.loyaltyReward.findFirst.mockResolvedValue(regular);
  });

  test("deducts the points and hands back a short code", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: -100 },
    });
    expect(res.shortCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  test("returns both codes", async () => {
    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toBe("RU-ABC123");
    expect(res.shortCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  test("resolves the assignment before charging, creating it if there is none", async () => {
    await redeemReward(PROGRAM, input);

    const call = db.customerReward.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      rewardId_accountId: { rewardId: "rwd-1", accountId: "acct-1" },
    });
    expect(call.create).toMatchObject({
      rewardId: "rwd-1",
      accountId: "acct-1",
      status: "REDEEMED",
    });
    expect(call.update).toMatchObject({ status: "REDEEMED" });

    const upsertOrder = db.customerReward.upsert.mock.invocationCallOrder[0];
    const deductOrder = db.customerLoyaltyAccount.update.mock.invocationCallOrder[0];
    expect(upsertOrder).toBeLessThan(deductOrder);
  });

  test("records the redemption with both codes in its context", async () => {
    await redeemReward(PROGRAM, input);

    const data = db.loyaltyRedemption.create.mock.calls[0][0].data;
    expect(data.status).toBe("APPROVED");
    expect(data.usedContext.shortCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  test("records the pending redemption, so there is something to approve", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({
        rewardType: "gift",
        redemptionRules: { approval_rules: { requires_approval: true } },
      }),
    );

    const res: any = await redeemReward(PROGRAM, input);

    expect(res.redemptionCode).toBe("RU-ABC123");
    expect(db.loyaltyRedemption.create.mock.calls[0][0].data).toMatchObject({
      status: "PENDING",
      redemptionCode: "RU-ABC123",
      transactionId: "txn-1",
    });
    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      points: 0,
      metadata: expect.objectContaining({ status: "pending_approval" }),
    });
  });

  test("takes no points and burns no stock while approval is pending", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(
      reward({
        rewardType: "gift",
        stockQuantity: 5,
        redemptionRules: { approval_rules: { requires_approval: true } },
      }),
    );

    await redeemReward(PROGRAM, input);

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyReward.update).not.toHaveBeenCalled();
    expect(db.customerReward.upsert.mock.calls[0][0].create.status).toBe("ISSUED");
  });

  test("writes the charge and the record in a single transaction", async () => {
    await redeemReward(PROGRAM, input);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.loyaltyRedemption.create).toHaveBeenCalled();
  });

  test("burns stock for a reward that tracks it", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(reward({ rewardType: "gift", stockQuantity: 5 }));

    await redeemReward(PROGRAM, input);

    expect(db.loyaltyReward.update.mock.calls[0][0].data).toEqual({
      stockRedeemed: { increment: 1 },
    });
  });

  test("tells the customer their reward is ready", async () => {
    await redeemReward(PROGRAM, input);

    expect(sentEvent(LoyaltyEventType.REWARD_ISSUED)).toMatchObject({
      orgId: ORG,
      data: { rewardName: "Free coffee", cost: 100 },
    });
  });
});

// ===========================================================================
// verifyRedemption / applyRedemption
// ===========================================================================

describe("verifyRedemption", () => {
  test("refuses a code that matches nothing", async () => {
    await expect(verifyRedemption("NOPE", ORG)).rejects.toThrow("Redemption not found");
  });

  test("an approved, unused redemption is valid", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue({
      status: "APPROVED",
      usedAt: null,
      account: {},
      reward: {},
    });

    expect((await verifyRedemption("RU-ABC123", ORG)).valid).toBe(true);
  });

  test.each([
    ["PENDING", null],
    ["REJECTED", null],
    ["APPROVED", new Date()],
  ])("a %s redemption is not valid", async (status, usedAt) => {
    db.loyaltyRedemption.findFirst.mockResolvedValue({ status, usedAt, account: {}, reward: {} });

    expect((await verifyRedemption("RU-ABC123", ORG)).valid).toBe(false);
  });

  test("resolves a code only within the caller's org", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue({
      status: "APPROVED",
      usedAt: null,
      account: {},
      reward: {},
    });

    await verifyRedemption("RU-ABC123", ORG);

    expect(db.loyaltyRedemption.findFirst.mock.calls[0][0].where).toEqual({
      redemptionCode: "RU-ABC123",
      account: { program: { orgId: ORG } },
    });
  });

  test("another org's code is not found at all", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue(null);

    await expect(verifyRedemption("RU-ABC123", "other-org")).rejects.toThrow(
      "Redemption not found",
    );
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
    db.loyaltyRedemption.findFirst.mockResolvedValue(approved);
    db.loyaltyRedemption.update.mockResolvedValue({
      ...approved,
      status: "USED",
      account: approved.account,
      reward: approved.reward,
    });
  });

  test("refuses a code that matches nothing", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue(null);

    await expect(applyRedemption(applyInput, ORG)).rejects.toThrow("Redemption not found");
  });

  test("refuses a redemption that is not approved", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue({ ...approved, status: "PENDING" });

    await expect(applyRedemption(applyInput, ORG)).rejects.toThrow("Redemption is not approved");
  });

  test("refuses to apply the same redemption twice", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue({ ...approved, usedAt: new Date() });

    await expect(applyRedemption(applyInput, ORG)).rejects.toThrow("Redemption already applied");
  });

  test("stamps who applied it and when, preserving the original context", async () => {
    await applyRedemption({ ...applyInput, notes: "at till 3" }, ORG);

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
    await applyRedemption(applyInput, ORG);

    expect(db.customerReward.update).toHaveBeenCalledWith({
      where: { shortCode: "SHORT123" },
      data: { status: "REDEEMED" },
    });
  });

  test("leaves assignments alone for a coupon", async () => {
    db.loyaltyRedemption.findFirst.mockResolvedValue({
      ...approved,
      reward: { ...approved.reward, rewardType: "coupon" },
    });

    await applyRedemption(applyInput, ORG);

    expect(db.customerReward.update).not.toHaveBeenCalled();
  });

  test("does not touch the stock a second time at the till", async () => {
    await applyRedemption(applyInput, ORG);

    expect(db.loyaltyReward.update).not.toHaveBeenCalled();
  });

  test("tells the customer the reward was used", async () => {
    await applyRedemption(applyInput, ORG);

    expect(sentEvent(LoyaltyEventType.REWARD_REDEEMED)).toMatchObject({
      orgId: ORG,
      data: { code: "RU-ABC123" },
    });
  });

  test("applies a code only within the caller's org", async () => {
    await applyRedemption(applyInput, ORG);

    expect(db.loyaltyRedemption.findFirst.mock.calls[0][0].where).toEqual({
      redemptionCode: "RU-ABC123",
      account: { program: { orgId: ORG } },
    });
  });

  test("guards the apply on usedAt in the write itself", async () => {
    await applyRedemption(applyInput, ORG);

    expect(db.loyaltyRedemption.update.mock.calls[0][0].where).toEqual({
      id: "red-1",
      usedAt: null,
    });
  });

  test("reports an already-applied redemption when the guarded write loses the race", async () => {
    db.loyaltyRedemption.update.mockRejectedValueOnce(notFound());

    await expect(applyRedemption(applyInput, ORG)).rejects.toThrow("Redemption already applied");
  });
});

// ===========================================================================
// Ledger reads
// ===========================================================================

describe("getRedemptionsByCustomer", () => {
  test("lists an account's redemptions newest first, within the caller's org", async () => {
    await getRedemptionsByCustomer("acct-1", ORG);

    expect(db.loyaltyRedemption.findMany.mock.calls[0][0]).toMatchObject({
      where: { accountId: "acct-1", account: { program: { orgId: ORG } } },
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

  test("pages one-based, and clamps anything below the first page", async () => {
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

  test("reads at most one row beyond the cap, so it can tell it was hit", async () => {
    await getTransactionsForExport(PROGRAM, {});

    expect(db.loyaltyTransaction.findMany.mock.calls[0][0].take).toBe(50_001);
  });

  test("refuses rather than silently truncating an export past the cap", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue(
      Array.from({ length: 50_001 }, (_, i) => ({ id: String(i) })),
    );

    await expect(getTransactionsForExport(PROGRAM, {})).rejects.toThrow(
      "covers more than 50000 transactions",
    );
  });

  test("returns the rows when the export fits", async () => {
    db.loyaltyTransaction.findMany.mockResolvedValue([{ id: "txn-1" }]);

    await expect(getTransactionsForExport(PROGRAM, {})).resolves.toHaveLength(1);
  });
});
