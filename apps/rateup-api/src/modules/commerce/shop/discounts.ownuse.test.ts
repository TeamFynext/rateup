import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));

const { redeemDiscount, resolveDiscount } = await import("./discounts.service.js");

const usedUp = {
  id: "d1",
  code: "LAST",
  active: true,
  startsAt: null,
  endsAt: null,
  usageLimit: 1,
  usedCount: 1,
  minSubtotal: null,
  eligibility: "ANYONE",
  perCustomerLimit: null,
  type: "PERCENTAGE",
  value: "10",
  appliesTo: "ALL",
  collectionIds: [],
  productIds: [],
};

function db(redemption: unknown) {
  return {
    shopDiscount: { findUnique: vi.fn(async () => usedUp) },
    shopDiscountRedemption: { findUnique: vi.fn(async () => redemption) },
  } as never;
}

describe("a code whose last use is taken", () => {
  test("still applies to the order holding that use", async () => {
    const found = await resolveDiscount(
      "s1",
      "last",
      { subtotal: 50, orderId: "o1" },
      db({ id: "r1" }),
    );
    expect(found.discount.id).toBe("d1");
  });

  test("is refused to any other order", async () => {
    await expect(
      resolveDiscount("s1", "last", { subtotal: 50, orderId: "o2" }, db(null)),
    ).rejects.toMatchObject({ code: "DISCOUNT_INVALID", reason: "That code has been fully used" });
  });
});

describe("what a shopper learns from a refused code", () => {
  const lookup = (found: unknown) =>
    ({
      shopDiscount: { findUnique: vi.fn(async () => found) },
      shopDiscountRedemption: { findUnique: vi.fn(async () => null) },
    }) as never;

  test("a made-up code and a used-up one read the same", async () => {
    const missing = resolveDiscount("s1", "NOPE", { subtotal: 50 }, lookup(null)).catch((e) => e);
    const spent = resolveDiscount("s1", "LAST", { subtotal: 50 }, lookup(usedUp)).catch((e) => e);
    const [a, b] = await Promise.all([missing, spent]);
    expect(a.message).toBe("That code can't be used");
    expect(b.message).toBe(a.message);
    expect(a.reason).toBe("That code doesn't exist");
    expect(b.reason).toBe("That code has been fully used");
  });

  test("a code restricted to chat customers doesn't say so", async () => {
    const err = await resolveDiscount(
      "s1",
      "VIP",
      { subtotal: 50 },
      lookup({ ...usedUp, usedCount: 0, eligibility: "LOYALTY_MEMBERS" }),
    ).catch((e) => e);
    expect(err.message).toBe("That code can't be used");
  });
});

describe("redeeming a code, under a lock on it", () => {
  function tx(
    discount: Record<string, unknown>,
    counts: { redemptions?: number; orders?: number },
  ) {
    return {
      $queryRaw: vi.fn(),
      shopDiscount: {
        findUniqueOrThrow: vi.fn(async () => ({
          ...usedUp,
          usedCount: 0,
          storeId: "s1",
          ...discount,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      shopDiscountRedemption: {
        findUnique: vi.fn(async () => null),
        count: vi.fn(async () => counts.redemptions ?? 0),
        create: vi.fn(),
      },
      shopOrder: { count: vi.fn(async () => counts.orders ?? 0) },
    };
  }

  test("re-checks once per customer against a use committed since the reprice", async () => {
    const db = tx({ perCustomerLimit: 1 }, { redemptions: 1 });
    await expect(redeemDiscount(db as never, "d1", "o2", "c1", 5)).rejects.toMatchObject({
      reason: "You've already used that code",
    });
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.shopDiscount.findUniqueOrThrow.mock.invocationCallOrder[0],
    );
    expect(db.shopDiscountRedemption.create).not.toHaveBeenCalled();
  });

  test("re-checks a first-order code, counting this customer's other hold of it", async () => {
    const placed = tx({ eligibility: "FIRST_ORDER" }, { orders: 1 });
    await expect(redeemDiscount(placed as never, "d1", "o2", "c1", 5)).rejects.toMatchObject({
      reason: "That code is for first orders only",
    });
    const held = tx({ eligibility: "FIRST_ORDER" }, { redemptions: 1 });
    await expect(redeemDiscount(held as never, "d1", "o2", "c1", 5)).rejects.toMatchObject({
      reason: "That code is for first orders only",
    });
  });

  test("records an eligible use", async () => {
    const db = tx({ eligibility: "FIRST_ORDER", perCustomerLimit: 1 }, {});
    await redeemDiscount(db as never, "d1", "o2", "c1", 5);
    expect(db.shopDiscountRedemption.create).toHaveBeenCalledWith({
      data: { discountId: "d1", orderId: "o2", contactId: "c1", amount: 5 },
    });
  });
});
