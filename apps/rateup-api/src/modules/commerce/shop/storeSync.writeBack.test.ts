import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopOrder: { findUnique: vi.fn(), update: vi.fn() },
  shopStore: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  shopProduct: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  shopVariant: { upsert: vi.fn() },
  integration: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));
const redis = vi.hoisted(() => ({ set: vi.fn(), del: vi.fn() }));
const queue = vi.hoisted(() => ({ enqueueStoreMirror: vi.fn() }));
const orders = vi.hoisted(() => ({ addOrderEvent: vi.fn() }));
const woo = vi.hoisted(() => ({
  createWooWriteBackOrder: vi.fn(),
  markWooOrderPaid: vi.fn(),
  cancelWooOrder: vi.fn(),
}));
const shopify = vi.hoisted(() => ({
  createShopifyWriteBackOrder: vi.fn(),
  markShopifyOrderPaid: vi.fn(),
  cancelShopifyOrder: vi.fn(),
  deleteShopifyDraftOrder: vi.fn(),
}));
const fetchers = vi.hoisted(() => ({ getShopifyProductsForCatalog: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);
vi.mock("./orders.service.js", () => orders);
vi.mock("../../integrations/woocommerce/woocommerce.shopOrders.js", () => woo);
vi.mock("../../integrations/shopify/shopify.shopOrders.js", () => shopify);
vi.mock("../../whatsapp/catalog/products/product.service.js", () => fetchers);

const {
  cancelInStore,
  mirrorConnectedStore,
  scheduleStoreMirror,
  stopFollowingStore,
  writeBackOrder,
} = await import("./storeSync.service.js");

const order = (extra: Record<string, unknown> = {}) => ({
  id: "o1",
  orgId: "org-1",
  number: 1042,
  currency: "USD",
  checkoutVia: "RATEUP",
  paymentStatus: "PAID",
  paymentMethod: "stripe",
  externalId: null,
  externalProvider: null,
  externalPaidAt: null,
  customerName: "Sam Lee",
  customerPhone: "15550100",
  customerEmail: "sam@example.com",
  shippingAddress: { line1: "1 Main St", city: "Springfield", country: "US" },
  shippingRate: { name: "Standard", price: 5 },
  shippingTotal: 5,
  discountTotal: 2,
  pointsDiscount: 1,
  taxTotal: 0,
  store: { mode: "WOOCOMMERCE", pricesIncludeTax: true },
  items: [
    {
      title: "Linen throw",
      quantity: 1,
      unitPrice: 40,
      lineTotal: 40,
      retailerId: "wc_11",
      variant: {
        retailerId: "wc_11",
        product: { externalSource: "woocommerce", externalId: "wc_10" },
      },
    },
  ],
  ...extra,
});

const shopifyOrder = (extra: Record<string, unknown> = {}) =>
  order({
    store: { mode: "SHOPIFY", pricesIncludeTax: false },
    taxTotal: 3.2,
    items: [
      {
        title: "Linen throw",
        quantity: 2,
        unitPrice: 20,
        lineTotal: 40,
        retailerId: "4401",
        variant: { retailerId: "4401", product: { externalSource: "shopify", externalId: "88" } },
      },
    ],
    ...extra,
  });

beforeEach(() => {
  vi.clearAllMocks();
  redis.set.mockResolvedValue("OK");
  redis.del.mockResolvedValue(1);
});

describe("a RateUp-checkout order from a shop that follows WooCommerce", () => {
  test("goes to WooCommerce as a paid order, linked both ways", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order());
    woo.createWooWriteBackOrder.mockResolvedValue({ id: "812", number: "1812" });

    await expect(writeBackOrder("o1", "paid")).resolves.toBe("812");

    expect(woo.createWooWriteBackOrder).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        rateupOrderId: "o1",
        paid: true,
        lines: [{ productExternalId: "wc_10", retailerId: "wc_11", quantity: 1, total: 40 }],
        address: expect.objectContaining({
          first_name: "Sam",
          last_name: "Lee",
          city: "Springfield",
        }),
        shipping: { name: "Standard", price: 5 },
        discount: 3,
        tax: 0,
      }),
    );
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: {
        externalProvider: "woocommerce",
        externalId: "812",
        externalName: "#1812",
        externalPaidAt: expect.any(Date),
      },
    });
  });

  test("a cash order goes in when placed, awaiting payment, and is marked paid there later", async () => {
    db.shopOrder.findUnique.mockResolvedValueOnce(
      order({ paymentStatus: "COD_PENDING", paymentMethod: "cod" }),
    );
    woo.createWooWriteBackOrder.mockResolvedValue({ id: "813", number: null });
    await writeBackOrder("o1", "placed");
    expect(woo.createWooWriteBackOrder.mock.calls[0][1]).toMatchObject({ paid: false });
    expect(db.shopOrder.update.mock.calls[0][0].data).not.toHaveProperty("externalPaidAt");

    db.shopOrder.findUnique.mockResolvedValueOnce(
      order({ paymentStatus: "PAID", externalId: "813", externalProvider: "woocommerce" }),
    );
    await writeBackOrder("o1", "paid");
    expect(woo.markWooOrderPaid).toHaveBeenCalledWith("org-1", "813");
    expect(woo.createWooWriteBackOrder).toHaveBeenCalledTimes(1);
  });

  test("an online payment is written once, as paid, not first as unpaid", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order({ paymentStatus: "PENDING" }));
    await expect(writeBackOrder("o1", "placed")).resolves.toBeNull();
    expect(woo.createWooWriteBackOrder).not.toHaveBeenCalled();
  });

  test("is written once: an order already paid in the store is left alone", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      order({ externalId: "812", externalProvider: "woocommerce", externalPaidAt: new Date() }),
    );
    await expect(writeBackOrder("o1", "paid")).resolves.toBeNull();
    expect(woo.createWooWriteBackOrder).not.toHaveBeenCalled();
    expect(woo.markWooOrderPaid).not.toHaveBeenCalled();
  });

  test("an order paid in the store's own checkout is never written back", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order({ checkoutVia: "WOOCOMMERCE" }));
    await expect(writeBackOrder("o1", "paid")).resolves.toBeNull();
    expect(woo.createWooWriteBackOrder).not.toHaveBeenCalled();
  });

  test("a refusal is recorded for staff to add the order by hand", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order());
    woo.createWooWriteBackOrder.mockRejectedValue(new Error("401"));
    await expect(writeBackOrder("o1", "paid")).resolves.toBeNull();
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      "o1",
      "external_failed",
      expect.stringContaining("WooCommerce"),
    );
    expect(db.shopOrder.update).not.toHaveBeenCalled();
  });

  test("two steps at once write it once", async () => {
    redis.set.mockResolvedValueOnce(null);
    await expect(writeBackOrder("o1", "paid")).resolves.toBeNull();
    expect(db.shopOrder.findUnique).not.toHaveBeenCalled();
  });
});

describe("a RateUp-checkout order from a shop that follows Shopify", () => {
  test("carries RateUp's prices, discount and tax so Shopify's total matches", async () => {
    db.shopOrder.findUnique.mockResolvedValue(shopifyOrder());
    shopify.createShopifyWriteBackOrder.mockResolvedValue({ id: "5501", name: "#1001" });
    await expect(writeBackOrder("o1", "paid")).resolves.toBe("5501");
    expect(shopify.createShopifyWriteBackOrder).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        rateupOrderId: "o1",
        paid: true,
        lines: [{ retailerId: "4401", title: "Linen throw", quantity: 2, unitPrice: 20 }],
        shipping: { name: "Standard", price: 5 },
        discount: 3,
        taxOnTop: 3.2,
      }),
    );
    expect(db.shopOrder.update.mock.calls[0][0].data).toMatchObject({
      externalProvider: "shopify",
      externalId: "5501",
      externalName: "#1001",
    });
  });

  test("tax already inside the prices isn't added again", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      shopifyOrder({ store: { mode: "SHOPIFY", pricesIncludeTax: true } }),
    );
    shopify.createShopifyWriteBackOrder.mockResolvedValue({ id: "5502", name: null });
    await writeBackOrder("o1", "paid");
    expect(shopify.createShopifyWriteBackOrder.mock.calls[0][1].taxOnTop).toBe(0);
  });
});

describe("cancelling in RateUp", () => {
  test("cancels the written-back order in the store", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      shopifyOrder({ externalId: "5501", externalProvider: "shopify" }),
    );
    await cancelInStore("o1");
    expect(shopify.cancelShopifyOrder).toHaveBeenCalledWith("org-1", "5501");
  });

  test("deletes an unpaid Shopify checkout draft, which never expires on its own", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      order({
        checkoutVia: "SHOPIFY",
        paymentStatus: "UNPAID",
        externalId: "9001",
        externalProvider: "shopify",
      }),
    );
    await cancelInStore("o1");
    expect(shopify.deleteShopifyDraftOrder).toHaveBeenCalledWith("org-1", "9001");
    expect(shopify.cancelShopifyOrder).not.toHaveBeenCalled();
  });

  test("leaves an order that never reached the store alone", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order());
    await cancelInStore("o1");
    expect(woo.cancelWooOrder).not.toHaveBeenCalled();
  });
});

describe("copying a followed store's products in", () => {
  const store = {
    id: "s1",
    orgId: "org-1",
    mode: "SHOPIFY",
    currency: "USD",
  } as never;
  const item = (extra: Record<string, unknown>) => ({
    retailer_id: "4401",
    item_group_id: "88",
    title: "Linen throw",
    price: 20,
    currencyCode: "USD",
    availability: "in stock",
    ...extra,
  });

  beforeEach(() => {
    db.shopProduct.findUnique.mockResolvedValue(null);
    db.shopProduct.create.mockResolvedValue({ id: "p1" });
    db.shopProduct.updateMany.mockResolvedValue({ count: 2 });
  });

  test("keeps the store's count when it has one, and doesn't make one up when it hasn't", async () => {
    fetchers.getShopifyProductsForCatalog.mockResolvedValue([
      item({ inventory: 7 }),
      item({ retailer_id: "4402", item_group_id: "89" }),
      item({ retailer_id: "4403", item_group_id: "90", availability: "out of stock" }),
    ]);
    await mirrorConnectedStore(store);
    const stock = db.shopVariant.upsert.mock.calls.map((c) => ({
      track: c[0].update.trackInventory,
      stock: c[0].update.stock,
    }));
    expect(stock).toEqual([
      { track: true, stock: 7 },
      { track: false, stock: 0 },
      { track: true, stock: 0 },
    ]);
  });

  test("stops selling what's gone from the store", async () => {
    fetchers.getShopifyProductsForCatalog.mockResolvedValue([item({})]);
    const result = await mirrorConnectedStore(store);
    expect(db.shopProduct.updateMany).toHaveBeenCalledWith({
      where: {
        storeId: "s1",
        externalSource: "shopify",
        status: { not: "ARCHIVED" },
        externalId: { notIn: ["88"] },
      },
      data: { status: "ARCHIVED" },
    });
    expect(result.archived).toBe(2);
    expect(db.shopStore.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { mirroredAt: expect.any(Date) },
    });
  });

  test("an empty answer from the store archives nothing", async () => {
    fetchers.getShopifyProductsForCatalog.mockResolvedValue([]);
    await mirrorConnectedStore(store);
    expect(db.shopProduct.updateMany).not.toHaveBeenCalled();
  });

  test("skips items priced in another currency, and says why", async () => {
    fetchers.getShopifyProductsForCatalog.mockResolvedValue([
      item({}),
      item({ retailer_id: "4402", item_group_id: "89", currencyCode: "EUR" }),
    ]);
    const result = await mirrorConnectedStore(store);
    expect(db.shopVariant.upsert).toHaveBeenCalledTimes(1);
    expect(result.skipped).toEqual({
      count: 1,
      reason: "Priced in EUR, but this shop sells in USD",
    });
  });

  test("a product webhook schedules a refresh only for a shop following that store", async () => {
    db.shopStore.findUnique.mockResolvedValueOnce({ id: "s1", mode: "SHOPIFY" });
    await scheduleStoreMirror("org-1", "shopify");
    expect(queue.enqueueStoreMirror).toHaveBeenCalledWith("s1");

    db.shopStore.findUnique.mockResolvedValueOnce({ id: "s1", mode: "NATIVE" });
    await scheduleStoreMirror("org-1", "shopify");
    expect(queue.enqueueStoreMirror).toHaveBeenCalledTimes(1);
  });
});

describe("stopping following the store", () => {
  test("keeps the products as the shop's own and takes payments in RateUp again", async () => {
    const tx = {
      shopProduct: { updateMany: vi.fn(async () => ({ count: 12 })) },
      shopStore: { update: vi.fn(async () => ({ id: "s1", mode: "NATIVE" })) },
    };
    db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
    const result = await stopFollowingStore({ id: "s1", mode: "WOOCOMMERCE" } as never);
    expect(tx.shopProduct.updateMany).toHaveBeenCalledWith({
      where: { storeId: "s1", externalSource: "woocommerce" },
      data: { externalSource: null, externalId: null },
    });
    expect(tx.shopStore.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { mode: "NATIVE", checkoutVia: "RATEUP" },
    });
    expect(result.products).toBe(12);
  });

  test("refuses a shop that doesn't follow a store", async () => {
    await expect(stopFollowingStore({ id: "s1", mode: "NATIVE" } as never)).rejects.toMatchObject({
      code: "INVALID",
    });
  });
});
