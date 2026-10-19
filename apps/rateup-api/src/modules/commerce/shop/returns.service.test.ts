import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopReturn: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  $transaction: vi.fn(),
}));
const payments = vi.hoisted(() => ({ refundOrder: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("./payments/payments.service.js", () => payments);
vi.mock("./orders.service.js", () => ({
  addOrderEvent: vi.fn(),
  setFulfillmentStatus: vi.fn(() => Promise.resolve()),
}));
vi.mock("./products.service.js", () => ({ adjustStock: vi.fn(), afterStockChange: vi.fn() }));

const { updateReturn } = await import("./returns.service.js");

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
