import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { update: vi.fn(), findUnique: vi.fn() },
    loyaltyTransaction: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("../earningRulesEngine.js", () => ({ checkAndUpgradeTier: vi.fn() }));
vi.mock("../messaging/send.js", () => ({ sendLoyaltyEvent: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { checkAndUpgradeTier } from "../earningRulesEngine.js";
import { sendLoyaltyEvent } from "../messaging/send.js";
import { reversePurchasePoints } from "./pointsReversal.service.js";

/** The `sendLoyaltyEvent` call made for `event`: org, recipient, data and options. */
function sentEvent(event: string) {
  const call = (sendLoyaltyEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
    (args) => args[1] === event,
  );
  return call && { orgId: call[0], to: call[2], data: call[3], options: call[4] };
}

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, any>;

const PROGRAM = "prog-1";
const ACCOUNT = "acct-1";
const KEY = "shopify:demo.myshopify.com:5551:reversal";

const input = (over: Record<string, unknown> = {}) => ({
  programId: PROGRAM,
  accountId: ACCOUNT,
  originalIdempotencyKey: "shopify:demo.myshopify.com:5551",
  orderId: "5551",
  idempotencyKey: KEY,
  source: "order_cancelled" as const,
  reason: "Shopify order cancelled",
  ...over,
});

/** The earn row being undone: 100 points on a 5000 purchase. */
const original = { id: "txn-earn", points: 100, purchaseAmount: "5000", metadata: {} };

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  // No prior reversal; the original is found by key.
  db.loyaltyTransaction.findUnique.mockImplementation(({ where }: any) =>
    where.programId_idempotencyKey.idempotencyKey === KEY ? null : original,
  );
  db.$queryRaw.mockResolvedValue([{ currentPoints: 250, totalSpend: "9000" }]);
  db.customerLoyaltyAccount.update.mockResolvedValue({
    currentPoints: 150,
    totalSpend: "4000",
  });
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-reversal" });
  db.customerLoyaltyAccount.findUnique.mockResolvedValue({
    contact: { name: "Ann", phone: "919000000001" },
  });
  (checkAndUpgradeTier as Mock).mockResolvedValue({ direction: "down", currentTier: null });
});

describe("reversePurchasePoints", () => {
  test("gives back points, lifetime points and the spend together", async () => {
    const res = await reversePurchasePoints(input());

    expect(res).toMatchObject({ status: "reversed", pointsRevoked: 100, shortfallPoints: 0 });
    // totalSpend is the half the hand-written Shopify version forgot, which is what left
    // cancelled orders propping a tier up forever.
    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { decrement: 100 },
      lifetimePoints: { decrement: 100 },
      totalSpend: { decrement: 5000 },
    });
  });

  test("balanceAfter comes from the updated row, not the balance read before it", async () => {
    await reversePurchasePoints(input());

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data.balanceAfter).toBe(150);
  });

  test("writes a negative typed purchase amount so the tier window nets it off", async () => {
    await reversePurchasePoints(input());

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      transactionType: "adjust",
      source: "purchase_reversal",
      points: -100,
      purchaseAmount: -5000,
      idempotencyKey: KEY,
    });
  });

  test("re-evaluates the tier against the spend as it stands afterwards", async () => {
    await reversePurchasePoints(input());

    expect(checkAndUpgradeTier).toHaveBeenCalledWith(ACCOUNT, 4000);
  });

  test("tells the customer their balance changed", async () => {
    await reversePurchasePoints(input({ orgId: "org-1" }));

    expect(sentEvent("POINTS_ADJUSTED")).toMatchObject({
      orgId: "org-1",
      data: { points: -100, balance: 150 },
    });
  });

  test("locks the account row before doing the arithmetic", async () => {
    await reversePurchasePoints(input());

    expect(db.$queryRaw).toHaveBeenCalled();
  });

  test("a redelivered cancellation reverses once", async () => {
    db.loyaltyTransaction.findUnique.mockResolvedValue({ id: "txn-reversal" });

    const res = await reversePurchasePoints(input());

    expect(res).toEqual({ status: "already_reversed", transactionId: "txn-reversal" });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("clamps at zero when the member already spent the points", async () => {
    // Earned 100, spent down to 30. Taking all 100 back would leave a negative balance,
    // which breaks redemption arithmetic and reads as a bug on the member's card.
    db.$queryRaw.mockResolvedValue([{ currentPoints: 30, totalSpend: "9000" }]);
    db.customerLoyaltyAccount.update.mockResolvedValue({ currentPoints: 0, totalSpend: "4000" });

    const res = await reversePurchasePoints(input());

    expect(res).toMatchObject({ status: "reversed", pointsRevoked: 30, shortfallPoints: 70 });
    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      points: -30,
      balanceAfter: 0,
      metadata: expect.objectContaining({ shortfallPoints: 70 }),
    });
  });

  test("never decrements more spend than the account holds", async () => {
    db.$queryRaw.mockResolvedValue([{ currentPoints: 250, totalSpend: "1200" }]);

    await reversePurchasePoints(input());

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.totalSpend).toEqual({
      decrement: 1200,
    });
  });

  test("does nothing when the order never earned anything", async () => {
    db.loyaltyTransaction.findUnique.mockResolvedValue(null);
    db.loyaltyTransaction.findFirst.mockResolvedValue(null);

    expect(await reversePurchasePoints(input())).toEqual({ status: "no_original" });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("falls back to the order id for awards written before keys existed", async () => {
    db.loyaltyTransaction.findUnique.mockResolvedValue(null);
    db.loyaltyTransaction.findFirst.mockResolvedValue(original);

    const res = await reversePurchasePoints(input());

    expect(res).toMatchObject({ status: "reversed", pointsRevoked: 100 });
    expect(db.loyaltyTransaction.findFirst.mock.calls[0][0].where.OR).toEqual([
      { referenceId: "5551" },
      { metadata: { path: ["orderId"], equals: "5551" } },
    ]);
  });

  test("reads the purchase amount from metadata when the typed column is empty", async () => {
    db.loyaltyTransaction.findUnique.mockImplementation(({ where }: any) =>
      where.programId_idempotencyKey.idempotencyKey === KEY
        ? null
        : { ...original, purchaseAmount: null, metadata: { purchaseAmount: 5000 } },
    );

    await reversePurchasePoints(input());

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.totalSpend).toEqual({
      decrement: 5000,
    });
  });
});
