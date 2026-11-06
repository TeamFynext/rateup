import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { findUnique: vi.fn() },
    loyaltyTransaction: { aggregate: vi.fn(), groupBy: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import {
  computeQualifyingSpend,
  computeQualifyingSpendBatch,
  pickQualifiedTier,
  windowStart,
} from "./qualifyingSpend.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  customerLoyaltyAccount: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeQualifyingSpend", () => {
  test("falls back to lifetime totalSpend when the programme has no window", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ totalSpend: "1234.50" });

    expect(await computeQualifyingSpend("acct-1", "prog-1", null)).toBe(1234.5);
    expect(db.loyaltyTransaction.aggregate).not.toHaveBeenCalled();
  });

  test("sums the rows carrying a purchase amount inside the window", async () => {
    db.loyaltyTransaction.aggregate.mockResolvedValue({ _sum: { purchaseAmount: "800" } });

    expect(await computeQualifyingSpend("acct-1", "prog-1", 6)).toBe(800);

    const where = db.loyaltyTransaction.aggregate.mock.calls[0][0].where;
    // Matched on the typed column rather than on `transactionType: "earn"`, so a
    // reversal's negative row is netted off instead of being invisible. Only the award
    // and the reversal write that column, so signup and referral rows still do not count.
    expect(where).toMatchObject({
      accountId: "acct-1",
      programId: "prog-1",
      purchaseAmount: { not: null },
    });
    expect(where.transactionType).toBeUndefined();
    // Six months back, give or take the second the test takes to run.
    const sixMonthsAgo = windowStart(6).getTime();
    expect(Math.abs(where.createdAt.gte.getTime() - sixMonthsAgo)).toBeLessThan(5_000);
  });

  test("a cancelled order nets its purchase back off the window", async () => {
    // The award wrote +5000 and the reversal wrote -5000, so the sum Postgres returns is
    // zero — which is the whole point of matching the reversal row.
    db.loyaltyTransaction.aggregate.mockResolvedValue({ _sum: { purchaseAmount: "0" } });

    expect(await computeQualifyingSpend("acct-1", "prog-1", 6)).toBe(0);
  });

  test("a member with no purchases in the window has spent nothing", async () => {
    db.loyaltyTransaction.aggregate.mockResolvedValue({ _sum: { purchaseAmount: null } });

    expect(await computeQualifyingSpend("acct-1", "prog-1", 3)).toBe(0);
  });
});

describe("computeQualifyingSpendBatch", () => {
  test("maps every asked-for member, defaulting the quiet ones to zero", async () => {
    db.loyaltyTransaction.groupBy.mockResolvedValue([
      { accountId: "a", _sum: { purchaseAmount: "500" } },
    ]);

    const spend = await computeQualifyingSpendBatch("prog-1", ["a", "b"], 6);

    expect(spend.get("a")).toBe(500);
    expect(spend.get("b")).toBe(0);
  });

  test("asks nothing of the database for an empty page", async () => {
    expect((await computeQualifyingSpendBatch("prog-1", [], 6)).size).toBe(0);
    expect(db.loyaltyTransaction.groupBy).not.toHaveBeenCalled();
  });
});

describe("pickQualifiedTier", () => {
  const ladder = [
    { id: "vip", threshold: 5000 },
    { id: "member", threshold: 0 },
  ];

  test("returns the highest rung the spend reaches", () => {
    expect(pickQualifiedTier(ladder, 5000)?.id).toBe("vip");
    expect(pickQualifiedTier(ladder, 4999)?.id).toBe("member");
  });

  test("returns null when no rung is reached", () => {
    expect(pickQualifiedTier([{ id: "vip", threshold: 5000 }], 10)).toBeNull();
  });
});
