import { beforeEach, describe, expect, test, vi } from "vitest";

// Unmetered plan: the monthly order cap has its own tests (orders.orderLimit.test.ts).
vi.mock("../../subscription/planLimits.js", () => ({
  checkPlanLimit: vi.fn(async () => ({ metered: false, used: 0, exceeded: false })),
}));
vi.mock("../../subscription/shopOrders.js", () => ({ countPlacedOrder: vi.fn(async () => 1) }));
vi.mock("../../subscription/limitAlerts.js", () => ({ maybeNotifyOrderUsage: vi.fn() }));

const db = vi.hoisted(() => {
  const db = {
    shopOrder: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    shopOrderItem: { update: vi.fn() },
    shopVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    shopInventoryMovement: { create: vi.fn() },
    shopOrderEvent: { create: vi.fn() },
    shopPayment: { updateMany: vi.fn() },
    shopDropClaim: { findFirst: vi.fn(), deleteMany: vi.fn() },
    ruleAction: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return db;
});
const events = vi.hoisted(() => ({ onShopOrderEvent: vi.fn() }));
const loyalty = vi.hoisted(() => ({
  pointsOffer: vi.fn(),
  refundSpentPoints: vi.fn(),
  returnSpentPoints: vi.fn(),
  reverseEarnedPoints: vi.fn(),
  spendPoints: vi.fn(),
}));
const discounts = vi.hoisted(() => ({
  redeemDiscount: vi.fn(),
  releaseDiscount: vi.fn(),
  resolveDiscount: vi.fn(),
  ruleOf: vi.fn(),
}));
const notifier = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ enqueueCatalogPublish: vi.fn() }));
vi.mock("../../notification/notify.js", () => notifier);
vi.mock("./events.js", () => events);
vi.mock("./attribution.js", () => ({ adAttribution: vi.fn() }));
vi.mock("./shopLoyalty.js", () => loyalty);
vi.mock("./discounts.service.js", () => discounts);
vi.mock("./products.service.js", () => ({
  adjustStock: vi.fn(async () => ({ before: {}, after: {} })),
  afterStockChange: vi.fn(async () => {}),
}));
vi.mock("./payments/payments.service.js", () => ({ closeOpenLinks: vi.fn() }));
vi.mock("./store.service.js", () => ({
  getStoreById: vi.fn(async () => ({ id: "s1", taxRate: null, pricesIncludeTax: false })),
  nextOrderNumber: vi.fn(),
  ratesForDestination: vi.fn(async () => []),
}));

const {
  assertCheckoutOpen,
  cancelOrder,
  createDraftOrder,
  markOrderPaid,
  placeOrder,
  refreshDraftPrices,
  releaseOrderBenefits,
  reserveOrderBenefits,
  sweepExpiredDrafts,
} = await import("./orders.service.js");
const { ShopError } = await import("./shop.errors.js");

const HOUR = 3_600_000;
const draft = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  orgId: "org",
  storeId: "s1",
  number: 1001,
  currency: "USD",
  status: "DRAFT",
  paymentStatus: "PENDING",
  contactId: "c1",
  discountId: "d1",
  discountCode: "SAVE10",
  discountTotal: "10.00",
  pointsRedeemed: 200,
  pointsDiscount: "2.00",
  total: "88.00",
  reservedAt: null,
  checkoutExpiresAt: new Date(Date.now() + HOUR),
  items: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: unknown) =>
    typeof fn === "function" ? fn(db) : Promise.all(fn as Promise<unknown>[]),
  );
  db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
  db.shopDropClaim.findFirst.mockResolvedValue(null);
});

describe("holding a coupon use and points for a payment link", () => {
  test("takes both once, under a claim on the draft", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft());
    await reserveOrderBenefits("o1");

    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: "o1", status: "DRAFT", reservedAt: null },
      data: { reservedAt: expect.any(Date) },
    });
    expect(discounts.redeemDiscount).toHaveBeenCalledWith(
      db,
      "d1",
      "o1",
      expect.objectContaining({ contactId: "c1" }),
      10,
    );
    expect(loyalty.spendPoints).toHaveBeenCalledWith(
      db,
      "org",
      "c1",
      "o1",
      200,
      expect.stringMatching(/^hold-\d+$/),
    );
  });

  test("does nothing for a draft that already holds them, or has nothing to hold", async () => {
    db.shopOrder.findUnique.mockResolvedValueOnce(draft({ reservedAt: new Date() }));
    await reserveOrderBenefits("o1");
    db.shopOrder.findUnique.mockResolvedValueOnce(draft({ discountId: null, pointsRedeemed: 0 }));
    await reserveOrderBenefits("o1");

    expect(db.shopOrder.updateMany).not.toHaveBeenCalled();
    expect(discounts.redeemDiscount).not.toHaveBeenCalled();
  });

  test("a code's last use already gone refuses the link, so nothing is half-held", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft());
    discounts.redeemDiscount.mockRejectedValueOnce(
      new ShopError("DISCOUNT_INVALID", "That code has just been fully used"),
    );
    await expect(reserveOrderBenefits("o1")).rejects.toMatchObject({ code: "DISCOUNT_INVALID" });
    expect(loyalty.spendPoints).not.toHaveBeenCalled();
  });

  test("is given back once, however often release runs", async () => {
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(draft());
    await releaseOrderBenefits("o1");
    db.shopOrder.updateMany.mockResolvedValueOnce({ count: 0 });
    await releaseOrderBenefits("o1");

    expect(discounts.releaseDiscount).toHaveBeenCalledTimes(1);
    expect(loyalty.returnSpentPoints).toHaveBeenCalledTimes(1);
    expect(loyalty.returnSpentPoints).toHaveBeenCalledWith(
      db,
      "org",
      "o1",
      expect.stringContaining("not completed"),
    );
  });
});

describe("placing an order the customer has paid for", () => {
  const paid = () => markOrderPaid("o1", { provider: "stripe", amount: 88 });

  beforeEach(() => {
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(draft({ status: "OPEN" }));
    db.shopOrder.update.mockImplementation(async ({ data }: any) => ({
      ...draft(),
      ...data,
      items: [],
    }));
  });

  test("keeps a held coupon and points rather than spending them again", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft({ reservedAt: new Date() }));
    await paid();
    expect(discounts.redeemDiscount).not.toHaveBeenCalled();
    expect(loyalty.spendPoints).not.toHaveBeenCalled();
    expect(db.shopOrder.update.mock.calls[0][0].data).not.toHaveProperty("reviewReason");
  });

  test("records what it couldn't honour, owes it, and tells staff", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft());
    discounts.redeemDiscount.mockRejectedValueOnce(
      new ShopError("DISCOUNT_INVALID", "That code has just been fully used"),
    );
    loyalty.spendPoints.mockRejectedValueOnce(new ShopError("CONFLICT", "Not enough points"));

    await paid();

    const placed = db.shopOrder.update.mock.calls[0][0].data;
    expect(placed.status).toBe("OPEN");
    expect(placed.reviewReason).toContain("SAVE10");
    expect(placed.reviewReason).toContain("200 points");
    expect(placed.amountDue).toBe(12);
    expect(db.shopOrderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: "o1", type: "needs_review" }),
    });
    expect(notifier.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "commerce.order_needs_review",
        orgId: "org",
        data: expect.objectContaining({ orderId: "o1", orderNumber: 1001 }),
      }),
    );
    expect(db.shopOrder.updateMany).toHaveBeenLastCalledWith({
      where: { id: "o1", paymentStatus: { not: "PAID" }, status: { not: "CANCELLED" } },
      data: expect.objectContaining({ paymentStatus: "PAID" }),
    });
  });

  test("still takes the stock when it ran out, so the oversell shows", async () => {
    const item = { variantId: "v1", quantity: 2, title: "Mug", variantTitle: null };
    db.shopOrder.findUnique.mockResolvedValue(
      draft({ items: [item], discountId: null, pointsRedeemed: 0 }),
    );
    db.shopVariant.findUnique.mockResolvedValue({
      id: "v1",
      trackInventory: true,
      allowBackorder: false,
      stock: 1,
    });
    db.shopVariant.updateMany.mockResolvedValue({ count: 0 });
    db.shopVariant.findUniqueOrThrow.mockResolvedValue({ id: "v1", stock: -1 });

    await paid();

    expect(db.shopVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: { decrement: 2 } },
    });
    expect(db.shopInventoryMovement.create).toHaveBeenCalled();
    expect(db.shopOrder.update.mock.calls[0][0].data.reviewReason).toContain("oversold");
  });

  test("leaves stock alone for an order paid in the merchant's own store", async () => {
    const item = { variantId: "v1", quantity: 2, title: "Mug", variantTitle: null };
    db.shopOrder.findUnique.mockResolvedValue(
      draft({ items: [item], discountId: null, pointsRedeemed: 0, checkoutVia: "SHOPIFY" }),
    );

    await paid();

    expect(db.shopVariant.findUnique).not.toHaveBeenCalled();
    expect(db.shopVariant.update).not.toHaveBeenCalled();
    expect(db.shopInventoryMovement.create).not.toHaveBeenCalled();
  });
});

describe("placing an unpaid order (cash, bank)", () => {
  test("is refused once the checkout window has passed", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({ checkoutExpiresAt: new Date(Date.now() - HOUR) }),
    );
    await expect(
      placeOrder("o1", { paymentMethod: "cod", codPending: true }),
    ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
    expect(db.shopOrder.updateMany).not.toHaveBeenCalled();
  });

  test("is refused when prices moved, naming the new total", async () => {
    const stale = {
      id: "i1",
      title: "Mug",
      quantity: 2,
      unitPrice: "10.00",
      variant: { price: "12.00", product: { status: "ACTIVE" } },
    };
    const plain = { discountId: null, discountCode: null, pointsRedeemed: 0, total: "20.00" };
    db.shopOrder.findUnique
      .mockResolvedValueOnce(draft(plain)) // placeOrder's own read, for the order cap
      .mockResolvedValueOnce(draft(plain))
      .mockResolvedValueOnce(draft({ ...plain, items: [stale] }))
      .mockResolvedValue(draft(plain));
    db.shopOrder.update.mockResolvedValue({ total: "24.00" });

    await expect(placeOrder("o1", { paymentMethod: "bank" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("$24.00"),
    });
    expect(db.shopOrderItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { unitPrice: 12, lineTotal: 24 },
    });
  });

  test("is refused when its comment-to-buy drop already placed its limit", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft({ discountId: null, pointsRedeemed: 0 }));
    db.shopDropClaim.findFirst.mockResolvedValue({ ruleId: "r1" });
    db.ruleAction.findFirst.mockResolvedValue({
      value: { productIds: ["11111111-1111-4111-8111-111111111111"], dropLimit: 2 },
    });
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ placed: 2n }]);

    await expect(placeOrder("o1", { paymentMethod: "cod" })).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
    });
  });
});

describe("a draft's checkout window and prices", () => {
  test("only a draft past its window is closed", () => {
    const past = new Date(Date.now() - 1);
    expect(() => assertCheckoutOpen({ status: "DRAFT", checkoutExpiresAt: past })).toThrow(
      ShopError,
    );
    expect(() => assertCheckoutOpen({ status: "OPEN", checkoutExpiresAt: past })).not.toThrow();
    expect(() => assertCheckoutOpen({ status: "DRAFT", checkoutExpiresAt: null })).not.toThrow();
  });

  test("a product taken off sale stops the payment", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({
        items: [
          {
            id: "i1",
            title: "Mug",
            quantity: 1,
            unitPrice: "10",
            variant: { price: "10", product: { status: "DRAFT" } },
          },
        ],
      }),
    );
    await expect(refreshDraftPrices("o1")).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  });

  test("unchanged prices touch nothing", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({
        items: [
          {
            id: "i1",
            title: "Mug",
            quantity: 1,
            unitPrice: "10.00",
            variant: { price: "10", product: { status: "ACTIVE" } },
          },
        ],
      }),
    );
    expect(await refreshDraftPrices("o1")).toMatchObject({ changed: false });
    expect(db.shopOrderItem.update).not.toHaveBeenCalled();
  });
});

describe("the expired-drafts sweep", () => {
  test("gives holds back at once and cancels drafts days past their window", async () => {
    db.shopOrder.findMany
      .mockResolvedValueOnce([{ id: "held" }])
      .mockResolvedValueOnce([{ id: "stale" }]);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(draft({ id: "held" }));
    db.shopOrder.findUnique.mockResolvedValue({ ...draft({ id: "stale" }), items: [] });
    db.shopOrder.update.mockResolvedValue({ ...draft({ id: "stale" }), status: "CANCELLED" });

    const now = new Date("2026-10-18T12:00:00Z");
    expect(await sweepExpiredDrafts(now)).toEqual({ released: 1, cancelled: 1 });

    expect(db.shopOrder.findMany.mock.calls[0][0].where).toEqual({
      status: "DRAFT",
      reservedAt: { not: null },
      checkoutExpiresAt: { lt: now },
    });
    expect(db.shopOrder.findMany.mock.calls[1][0].where.checkoutExpiresAt.lt.getTime()).toBe(
      now.getTime() - 72 * HOUR,
    );
    expect(db.shopOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED", cancelReason: "Checkout expired" }),
      }),
    );
    expect(db.shopDropClaim.deleteMany).toHaveBeenCalledWith({ where: { orderId: "stale" } });
    expect(events.onShopOrderEvent).not.toHaveBeenCalled();
  });
});

describe("an anonymous checkout", () => {
  test("holds no coupon use for its payment link", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft({ contactId: null, pointsRedeemed: 0 }));
    await reserveOrderBenefits("o1");
    expect(db.shopOrder.updateMany).not.toHaveBeenCalled();
    expect(discounts.redeemDiscount).not.toHaveBeenCalled();
  });
});

describe("a sold-out item", () => {
  const soldOut = {
    id: "v1",
    productId: "p1",
    retailerId: null,
    title: "Default",
    trackInventory: true,
    allowBackorder: false,
    stock: 0,
    price: "10.00",
    product: { title: "Mug", status: "ACTIVE", images: [], collections: [] },
  };

  test("can't be put in a new order", async () => {
    db.shopVariant.findMany.mockResolvedValue([soldOut]);
    await expect(
      createDraftOrder({
        store: { id: "s1", orgId: "org", checkoutVia: "RATEUP" } as never,
        items: [{ variantId: "v1", quantity: 1 }],
        channel: "WHATSAPP",
      }),
    ).rejects.toMatchObject({ code: "OUT_OF_STOCK", message: "Mug is sold out" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("stops a draft from being paid", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({
        items: [
          {
            id: "i1",
            title: "Mug",
            variantTitle: "Blue",
            quantity: 3,
            unitPrice: "10.00",
            variant: { ...soldOut, stock: 2 },
          },
        ],
      }),
    );
    await expect(refreshDraftPrices("o1")).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
      message: "Only 2 of Mug (Blue) left",
    });
  });

  test("is still sold through a store's own checkout, which takes its stock", async () => {
    db.shopVariant.findMany.mockResolvedValue([soldOut]);
    db.$transaction.mockResolvedValueOnce({ id: "o1" });
    await createDraftOrder({
      store: { id: "s1", orgId: "org", checkoutVia: "SHOPIFY" } as never,
      items: [{ variantId: "v1", quantity: 1 }],
      channel: "WHATSAPP",
    }).catch(() => {}); // the draft's repricing isn't mocked here; only the refusal matters
    expect(db.$transaction).toHaveBeenCalled();
  });
});

describe("a payment racing a cancel", () => {
  test("lands on the cancelled order as paid-after-cancel, with no paid follow-ups", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft({ status: "OPEN" }));
    db.shopOrder.updateMany.mockResolvedValue({ count: 0 });
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(
      draft({ status: "CANCELLED", paymentStatus: "EXPIRED" }),
    );
    await markOrderPaid("o1", { provider: "stripe", paymentId: "pi_1" });
    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: "o1", paymentStatus: { not: "PAID" }, status: { not: "CANCELLED" } },
      data: expect.objectContaining({ paymentStatus: "PAID" }),
    });
    expect(db.shopOrderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "paid_after_cancel" }),
    });
    expect(notifier.notify).toHaveBeenCalledWith(
      expect.objectContaining({ event: "commerce.order_needs_review" }),
    );
    expect(events.onShopOrderEvent).not.toHaveBeenCalled();
  });
});

describe("a conditional cancel", () => {
  test("does nothing when the order changed first (a cash order confirmed at its deadline)", async () => {
    db.shopOrder.findFirst.mockResolvedValue(null);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(draft({ status: "OPEN" }));
    await cancelOrder("o1", {
      reason: "Not confirmed in time",
      onlyIf: { paymentStatus: "COD_PENDING", confirmedAt: null },
    });
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.shopOrder.update).not.toHaveBeenCalled();
    expect(events.onShopOrderEvent).not.toHaveBeenCalled();
  });
});
