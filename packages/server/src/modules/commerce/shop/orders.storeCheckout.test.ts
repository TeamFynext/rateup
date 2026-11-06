import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const db = {
    shopOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(async () => 0),
    },
    shopPayment: { updateMany: vi.fn() },
    shopDropClaim: { deleteMany: vi.fn() },
    shopOrderEvent: { create: vi.fn() },
    shopVariant: { findMany: vi.fn() },
    contact: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  return db;
});
const sync = vi.hoisted(() => ({ cancelInStore: vi.fn() }));
const payments = vi.hoisted(() => ({ closeOpenLinks: vi.fn(async () => {}) }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ enqueueCatalogPublish: vi.fn() }));
vi.mock("./events.js", () => ({ onShopOrderEvent: vi.fn() }));
vi.mock("./attribution.js", () => ({ adAttribution: vi.fn() }));
vi.mock("./storeSync.service.js", () => sync);
vi.mock("./payments/payments.service.js", () => payments);
vi.mock("./discounts.service.js", () => ({
  redeemDiscount: vi.fn(),
  releaseDiscount: vi.fn(),
  resolveDiscount: vi.fn(),
  ruleOf: vi.fn(),
}));
vi.mock("./shopLoyalty.js", () => ({
  pointsOffer: vi.fn(),
  refundSpentPoints: vi.fn(async () => {}),
  returnSpentPoints: vi.fn(),
  reverseEarnedPoints: vi.fn(async () => {}),
  spendPoints: vi.fn(),
}));
vi.mock("./products.service.js", () => ({ adjustStock: vi.fn(), afterStockChange: vi.fn() }));
vi.mock("./store.service.js", () => ({
  getStoreById: vi.fn(async () => ({ id: "s1", taxRate: null, pricesIncludeTax: true })),
  nextOrderNumber: vi.fn(async () => 1042),
  ratesForDestination: vi.fn(async () => []),
}));

const { cancelOrder, createDraftOrder, listOrders, sweepExpiredDrafts } =
  await import("./orders.service.js");

const placedInShopify = {
  id: "o1",
  orgId: "org-1",
  status: "OPEN",
  paymentStatus: "PAID",
  fulfillmentStatus: "UNFULFILLED",
  checkoutVia: "SHOPIFY",
  externalCheckoutUrl: "https://shop.test/invoices/abc",
  reservedAt: null,
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
});

describe("a draft in a shop that checks out in its store", () => {
  test("pays where the shop checks out, and waits only on payment", async () => {
    db.shopVariant.findMany.mockResolvedValue([
      {
        id: "v1",
        productId: "p1",
        price: "20.00",
        title: "Default",
        sku: null,
        retailerId: "4401",
        imageUrl: null,
        product: { status: "ACTIVE", title: "Linen throw", images: [], collections: [] },
      },
    ]);
    db.shopOrder.create.mockResolvedValue({ id: "o1" });
    db.shopOrder.findUnique.mockResolvedValue(null);
    await createDraftOrder({
      store: {
        id: "s1",
        orgId: "org-1",
        currency: "USD",
        checkoutVia: "SHOPIFY",
        askAddress: true,
        askDelivery: true,
        paymentLinkTtlHours: 24,
      } as never,
      items: [{ variantId: "v1", quantity: 1 }],
      channel: "STOREFRONT",
    }).catch(() => {});
    expect(db.shopOrder.create.mock.calls[0][0].data).toMatchObject({
      checkoutVia: "SHOPIFY",
      checkoutStage: "PAYMENT",
    });
  });
});

describe("cancelling", () => {
  test("an order placed and paid in the store is cancelled there, not from RateUp", async () => {
    db.shopOrder.findUnique.mockResolvedValue(placedInShopify);
    await expect(cancelOrder("o1", { reason: "Customer asked" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Cancel it there"),
    });
    expect(db.shopOrder.update).not.toHaveBeenCalled();
  });

  test("the store cancelling it is followed, without cancelling it there again", async () => {
    db.shopOrder.findUnique.mockResolvedValue(placedInShopify);
    db.shopOrder.update.mockResolvedValue({ ...placedInShopify, status: "CANCELLED" });
    await cancelOrder("o1", { reason: "Cancelled in Shopify", fromStore: true, restock: false });
    expect(db.shopOrder.update).toHaveBeenCalled();
    expect(sync.cancelInStore).not.toHaveBeenCalled();
  });

  test("a store-checkout draft cancelled in RateUp closes the store's copy", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      ...placedInShopify,
      status: "DRAFT",
      paymentStatus: "UNPAID",
    });
    db.shopOrder.update.mockResolvedValue({ ...placedInShopify, status: "CANCELLED" });
    await cancelOrder("o1", { reason: "Checkout expired", notify: false });
    expect(sync.cancelInStore).toHaveBeenCalledWith("o1");
  });

  test("an order already cancelled isn't cancelled in the store a second time", async () => {
    db.shopOrder.findUnique.mockResolvedValue({ ...placedInShopify, status: "CANCELLED" });
    await cancelOrder("o1", { reason: "again" });
    expect(sync.cancelInStore).not.toHaveBeenCalled();
  });
});

describe("the hourly sweep", () => {
  test("closes lapsed store checkouts too, which neither store expires for RateUp", async () => {
    db.shopOrder.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await sweepExpiredDrafts(new Date("2026-10-19T12:00:00Z"));
    const staleQuery = db.shopOrder.findMany.mock.calls[1][0].where;
    expect(staleQuery).toEqual({ status: "DRAFT", checkoutExpiresAt: { lt: expect.any(Date) } });
  });
});

describe("the order tabs", () => {
  test("orders the store fulfils stay out of To pack and Needs action", async () => {
    db.shopOrder.findMany.mockResolvedValue([]);
    await listOrders("s1", { tab: "to_pack" });
    const where = db.shopOrder.findMany.mock.calls[0][0].where.AND[1];
    expect(where).toMatchObject({ checkoutVia: "RATEUP", externalId: null });

    db.shopOrder.findMany.mockClear();
    await listOrders("s1", { tab: "needs_action" });
    const needs = db.shopOrder.findMany.mock.calls[0][0].where.AND[1];
    expect(needs.OR).toContainEqual(
      expect.objectContaining({ paymentStatus: "PAID", checkoutVia: "RATEUP", externalId: null }),
    );
  });
});
