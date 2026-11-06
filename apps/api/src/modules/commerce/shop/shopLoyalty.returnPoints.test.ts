import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../loyalty/accounts/account.service.js", () => ({ awardPoints: vi.fn() }));
vi.mock("../../loyalty/accounts/pointsReversal.service.js", () => ({
  reversePurchasePoints: vi.fn(),
}));

const { returnSpentPoints } = await import("./shopLoyalty.js");

function tx(rows: Array<{ points: number; transactionType: string }>) {
  return {
    loyaltyProgram: { findUnique: vi.fn(async () => ({ id: "prog" })) },
    loyaltyTransaction: {
      findFirst: vi.fn(async () => (rows.length ? { accountId: "acc" } : null)),
      findMany: vi.fn(async () => rows),
      create: vi.fn(),
    },
    customerLoyaltyAccount: { update: vi.fn(async () => ({ currentPoints: 500 })) },
    $queryRaw: vi.fn(),
  };
}

describe("giving back the points an order spent", () => {
  test("returns what the order still holds, under a lock on the account", async () => {
    const t = tx([{ points: -200, transactionType: "redeem" }]);
    await returnSpentPoints(t as never, "org", "o1");
    expect(t.$queryRaw).toHaveBeenCalled();
    expect(t.customerLoyaltyAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentPoints: { increment: 200 } } }),
    );
    expect(t.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: "refund",
        points: 200,
        idempotencyKey: "shop-redeem-refund-o1",
      }),
    });
  });

  test("returns nothing twice: a hold already given back is netted out", async () => {
    const t = tx([
      { points: -200, transactionType: "redeem" },
      { points: 200, transactionType: "refund" },
    ]);
    await returnSpentPoints(t as never, "org", "o1");
    expect(t.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("a second hold on the same order gets its own refund key", async () => {
    const t = tx([
      { points: -200, transactionType: "redeem" },
      { points: 200, transactionType: "refund" },
      { points: -150, transactionType: "redeem" },
    ]);
    await returnSpentPoints(t as never, "org", "o1", "Returned: checkout not completed");
    expect(t.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        points: 150,
        idempotencyKey: "shop-redeem-refund-o1-2",
        description: "Returned: checkout not completed",
      }),
    });
  });
});
