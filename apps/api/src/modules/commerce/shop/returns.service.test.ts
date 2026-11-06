import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopReturn: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
  },
  shopOrder: { findUnique: vi.fn() },
  shopDiscount: { findUnique: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
const products = vi.hoisted(() => ({ adjustStock: vi.fn(), afterStockChange: vi.fn() }));
const payments = vi.hoisted(() => ({ refundOrder: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("./payments/payments.service.js", () => payments);
vi.mock("./orders.service.js", () => ({
  addOrderEvent: vi.fn(),
  setFulfillmentStatus: vi.fn(() => Promise.resolve()),
}));
vi.mock("./products.service.js", () => products);

const { requestReturn, updateReturn, paidShareOfGoods } = await import("./returns.service.js");

const approved = {
  id: "r1",
  orderId: "o1",
  status: "APPROVED",
  note: null,
  restock: true,
  refundAmount: "40.00",
  items: [],
  order: { items: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.shopReturn.findFirst.mockResolvedValue(approved);
  db.shopReturn.updateMany.mockResolvedValue({ count: 1 });
  db.shopReturn.findUniqueOrThrow.mockResolvedValue({ ...approved, status: "REFUNDED" });
  payments.refundOrder.mockResolvedValue(undefined);
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  db.shopReturn.create.mockImplementation(({ data }) => Promise.resolve(data));
  db.shopDiscount.findUnique.mockResolvedValue(null);
  products.afterStockChange.mockResolvedValue(undefined);
  products.adjustStock.mockImplementation((_tx, variantId: string) =>
    Promise.resolve({ before: { id: variantId }, after: { id: variantId } }),
  );
});

const delivered = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  fulfillmentStatus: "DELIVERED",
  subtotal: "100.00",
  discountTotal: "0",
  pointsDiscount: "0",
  shippingTotal: "0",
  total: "100.00",
  discountId: null,
  items: [{ id: "l1", title: "Mug", unitPrice: "50.00", quantity: 2, variantId: "v1" }],
  returns: [],
  ...over,
});

describe("requesting a return", () => {
  test("units already on an earlier return can't be claimed again", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      delivered({ returns: [{ items: [{ orderItemId: "l1", quantity: 2 }] }] }),
    );
    await expect(
      requestReturn("o1", { reason: "Broken", items: [{ orderItemId: "l1", quantity: 1 }] }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(db.shopReturn.create).not.toHaveBeenCalled();
  });

  test("the order is locked while the earlier returns are counted", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      delivered({ returns: [{ items: [{ orderItemId: "l1", quantity: 1 }] }] }),
    );
    await requestReturn("o1", { reason: "Broken", items: [{ orderItemId: "l1", quantity: 1 }] });
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.shopReturn.create).toHaveBeenCalledTimes(1);
  });

  test("the same line listed twice is counted together", async () => {
    db.shopOrder.findUnique.mockResolvedValue(delivered());
    await expect(
      requestReturn("o1", {
        reason: "Broken",
        items: [
          { orderItemId: "l1", quantity: 2 },
          { orderItemId: "l1", quantity: 1 },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  test("the refund is what was paid for the units, after coupon and points", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      delivered({ discountTotal: "20.00", pointsDiscount: "10.00", total: "70.00" }),
    );
    const r = await requestReturn("o1", {
      reason: "Broken",
      items: [{ orderItemId: "l1", quantity: 1 }],
    });
    expect(r.refundAmount).toBe(35);
  });

  test("a free-shipping code doesn't lower the refund for goods", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      delivered({ discountId: "d1", discountTotal: "6.00", shippingTotal: "6.00" }),
    );
    db.shopDiscount.findUnique.mockResolvedValue({ type: "FREE_SHIPPING", value: null });
    const r = await requestReturn("o1", {
      reason: "Broken",
      items: [{ orderItemId: "l1", quantity: 1 }],
    });
    expect(r.refundAmount).toBe(50);
  });

  test("tax charged on top of the prices is refunded with the goods", () => {
    expect(
      paidShareOfGoods(
        {
          subtotal: "100",
          discountTotal: "0",
          pointsDiscount: "0",
          shippingTotal: "0",
          total: "110",
        } as never,
        0,
      ),
    ).toBeCloseTo(1.1);
  });
});

describe("receiving a return", () => {
  const withItems = {
    ...approved,
    items: [{ orderItemId: "l1", quantity: 2 }],
    order: { items: [{ id: "l1", variantId: "v1" }] },
  };

  test("restocks by default, in the same transaction as the claim", async () => {
    db.shopReturn.findFirst.mockResolvedValue(withItems);
    await updateReturn("s1", "r1", "receive", { actorUserId: "u1" });
    expect(products.adjustStock).toHaveBeenCalledWith(db, "v1", 2, "RETURN", {
      orderId: "o1",
      userId: "u1",
    });
    expect(db.shopReturn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ restock: true }) }),
    );
  });

  test("restock: false receives without touching stock", async () => {
    db.shopReturn.findFirst.mockResolvedValue(withItems);
    await updateReturn("s1", "r1", "receive", { actorUserId: "u1", restock: false });
    expect(products.adjustStock).not.toHaveBeenCalled();
  });

  test("a restock that fails midway surfaces and the claim is not kept apart from it", async () => {
    db.shopReturn.findFirst.mockResolvedValue(withItems);
    products.adjustStock.mockRejectedValue(new Error("db down"));
    await expect(updateReturn("s1", "r1", "receive", { actorUserId: "u1" })).rejects.toThrow(
      "db down",
    );
    expect(products.afterStockChange).not.toHaveBeenCalled();
    expect(db.shopReturn.update).not.toHaveBeenCalled();
  });

  test("refunding never restocks", async () => {
    db.shopReturn.findFirst.mockResolvedValue(withItems);
    await updateReturn("s1", "r1", "refund", { actorUserId: "u1", restock: true });
    expect(products.adjustStock).not.toHaveBeenCalled();
  });
});

describe("refunding a return", () => {
  test("refunds at most what the return is for", async () => {
    await expect(
      updateReturn("s1", "r1", "refund", { actorUserId: "u1", refundAmount: 500 }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(db.shopReturn.updateMany).not.toHaveBeenCalled();
    expect(payments.refundOrder).not.toHaveBeenCalled();
  });

  test("defaults to the return's own amount", async () => {
    await updateReturn("s1", "r1", "refund", { actorUserId: "u1" });
    expect(payments.refundOrder).toHaveBeenCalledWith("o1", 40, "u1");
  });

  test("a second request racing the first refunds nothing", async () => {
    db.shopReturn.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      updateReturn("s1", "r1", "refund", { actorUserId: "u1" }),
      updateReturn("s1", "r1", "refund", { actorUserId: "u2" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(payments.refundOrder).toHaveBeenCalledTimes(1);
    expect(db.shopReturn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1", status: { in: ["APPROVED", "RECEIVED"] } } }),
    );
  });

  test("a refused refund puts the return back as it was", async () => {
    payments.refundOrder.mockRejectedValue(new Error("card declined"));
    await expect(updateReturn("s1", "r1", "refund", { actorUserId: "u1" })).rejects.toThrow();
    expect(db.shopReturn.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "APPROVED", note: null, refundAmount: "40.00", resolvedAt: null },
    });
  });
});
