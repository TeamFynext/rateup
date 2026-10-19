import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ShopOrder } from "../../../../generated/prisma/client.js";

const db = vi.hoisted(() => ({
  integration: { findFirst: vi.fn() },
  shopPayment: { count: vi.fn() },
  shopOrderEvent: { count: vi.fn() },
  shopOrder: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));
const redis = vi.hoisted(() => ({ set: vi.fn(), del: vi.fn() }));
const orders = vi.hoisted(() => ({
  addOrderEvent: vi.fn(),
  assertDeliveryChosen: vi.fn(),
  cancelOrder: vi.fn(async (id: string) => ({ id, status: "CANCELLED" })),
  channelLabel: (c: string) => c,
  markOrderPaid: vi.fn(async (id: string) => ({
    id,
    status: "OPEN",
    paymentStatus: "PAID",
    fulfillmentStatus: "UNFULFILLED",
  })),
  setFulfillmentStatus: vi.fn(),
}));
const { StoreItemsGone } = vi.hoisted(() => ({
  StoreItemsGone: class extends Error {
    constructor(readonly titles: string[]) {
      super("gone");
    }
  },
}));
const shopify = vi.hoisted(() => ({ createShopifyCheckoutDraft: vi.fn() }));
const shopifyOrders = vi.hoisted(() => ({
  deleteShopifyDraftOrder: vi.fn(),
  shopifyAdminDomain: vi.fn(),
}));
const woo = vi.hoisted(() => ({ createWooCheckoutOrder: vi.fn(), cancelWooOrder: vi.fn() }));
const sync = vi.hoisted(() => ({ scheduleStoreMirror: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("./orders.service.js", () => orders);
vi.mock("./storeSync.service.js", () => sync);
vi.mock("./events.js", () => ({ checkoutUrl: (t: string) => `https://app.test/c/${t}` }));
vi.mock("../../integrations/shopify/shopify.catalog.js", () => ({ ...shopify, StoreItemsGone }));
vi.mock("../../integrations/shopify/shopify.shopOrders.js", () => shopifyOrders);
vi.mock("../../integrations/woocommerce/woocommerce.shopOrders.js", () => woo);

const {
  alignDraftCheckout,
  assertCheckoutVia,
  checkoutLinkFor,
  externalAdminUrl,
  startStoreCheckout,
  syncOrderFromStore,
} = await import("./externalCheckout.service.js");

const ORDER_ID = "3f2b0c1e-8a5d-4f6e-9b7a-2c1d0e9f8a7b";

const item = (source: string | null, extra: Record<string, unknown> = {}) => ({
  title: "Linen throw",
  quantity: 2,
  retailerId: null,
  variant: { retailerId: "wc_11", product: { externalSource: source, externalId: "wc_10" } },
  ...extra,
});

const draft = (
  via: string,
  items = [item(via === "SHOPIFY" ? "shopify" : "woocommerce")],
  extra: Record<string, unknown> = {},
) => ({
  id: ORDER_ID,
  orgId: "org-1",
  number: 1042,
  status: "DRAFT",
  channel: "STOREFRONT",
  source: "storefront",
  checkoutVia: via,
  customerName: "Sam Rivera",
  customerEmail: null,
  customerPhone: "15550100",
  shippingAddress: null,
  shippingRate: null,
  checkoutToken: "tok",
  externalCheckoutUrl: null,
  store: { checkoutVia: via, askAddress: true, askDelivery: true },
  items,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
  db.integration.findFirst.mockResolvedValue({ id: "int-1" });
  db.shopPayment.count.mockResolvedValue(0);
  db.shopOrderEvent.count.mockResolvedValue(0);
  redis.set.mockResolvedValue("OK");
  redis.del.mockResolvedValue(1);
  sync.scheduleStoreMirror.mockResolvedValue(undefined);
});

describe("choosing where the shop checks out", () => {
  test("RateUp is always allowed", async () => {
    await expect(assertCheckoutVia({ orgId: "org-1", mode: "NATIVE" }, "RATEUP")).resolves.toBe(
      undefined,
    );
  });

  test("a store only when the products follow it", async () => {
    await expect(
      assertCheckoutVia({ orgId: "org-1", mode: "NATIVE" }, "SHOPIFY"),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(db.integration.findFirst).not.toHaveBeenCalled();
  });

  test("and only while it is connected", async () => {
    db.integration.findFirst.mockResolvedValueOnce(null);
    await expect(
      assertCheckoutVia({ orgId: "org-1", mode: "WOOCOMMERCE" }, "WOOCOMMERCE"),
    ).rejects.toMatchObject({ code: "INVALID", message: "Connect WooCommerce first" });
    await expect(
      assertCheckoutVia({ orgId: "org-1", mode: "WOOCOMMERCE" }, "WOOCOMMERCE"),
    ).resolves.toBe(undefined);
  });
});

describe("the link every channel sends", () => {
  test("is RateUp's page, which creates the store's order only when opened", async () => {
    db.shopOrder.findUnique.mockResolvedValueOnce({ status: "DRAFT", checkoutToken: "tok" });
    await expect(checkoutLinkFor(ORDER_ID)).resolves.toBe("https://app.test/c/tok");
    expect(shopify.createShopifyCheckoutDraft).not.toHaveBeenCalled();

    db.shopOrder.findUnique.mockResolvedValueOnce({ status: "OPEN", checkoutToken: "tok" });
    await expect(checkoutLinkFor(ORDER_ID)).resolves.toBeNull();
  });
});

describe("a draft whose shop changed where it checks out", () => {
  const store = (checkoutVia: string) => ({ checkoutVia }) as never;

  test("follows the shop while it hasn't reached the store or a gateway", async () => {
    const order = { ...draft("RATEUP"), checkoutStage: "ADDRESS" } as unknown as ShopOrder;
    const aligned = await alignDraftCheckout(order, store("SHOPIFY"));
    expect(aligned.checkoutVia).toBe("SHOPIFY");
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { checkoutVia: "SHOPIFY", checkoutStage: "PAYMENT" },
    });
  });

  test("back to RateUp when the store is gone, asking for the address again", async () => {
    const aligned = await alignDraftCheckout(
      draft("SHOPIFY") as unknown as ShopOrder,
      store("RATEUP"),
    );
    expect(aligned.checkoutVia).toBe("RATEUP");
    expect(db.shopOrder.update.mock.calls[0][0].data.checkoutStage).toBe("ADDRESS");
  });

  test("stays put once sent to the store or with a payment link open", async () => {
    const sent = draft("SHOPIFY", undefined, { externalCheckoutUrl: "https://s.test/i" });
    expect(
      (await alignDraftCheckout(sent as unknown as ShopOrder, store("RATEUP"))).checkoutVia,
    ).toBe("SHOPIFY");
    db.shopPayment.count.mockResolvedValueOnce(1);
    expect(
      (await alignDraftCheckout(draft("RATEUP") as unknown as ShopOrder, store("SHOPIFY")))
        .checkoutVia,
    ).toBe("RATEUP");
    expect(db.shopOrder.update).not.toHaveBeenCalled();
  });
});

describe("sending a cart to the store's checkout", () => {
  test("Shopify: a draft order carrying the RateUp order id; the token stays for RateUp's page", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft("SHOPIFY"));
    shopify.createShopifyCheckoutDraft.mockResolvedValue({
      id: "9001",
      invoiceUrl: "https://shop.test/invoices/abc",
    });

    await expect(startStoreCheckout(ORDER_ID)).resolves.toBe("https://shop.test/invoices/abc");

    const [orgId, lines, opts] = shopify.createShopifyCheckoutDraft.mock.calls[0];
    expect(orgId).toBe("org-1");
    expect(lines).toEqual([{ retailerId: "wc_11", quantity: 2, title: "Linen throw" }]);
    expect(opts.attributes).toEqual({ rateup_order_id: ORDER_ID, rateup_source: "storefront" });
    expect(opts.phone).toBe("+15550100");
    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, externalCheckoutUrl: null },
      data: {
        externalProvider: "shopify",
        externalId: "9001",
        externalName: null,
        externalCheckoutUrl: "https://shop.test/invoices/abc",
      },
    });
    expect(redis.del).toHaveBeenCalledWith(`shop:storeCheckout:${ORDER_ID}`);
  });

  test("WooCommerce: the address and delivery picked on RateUp's page go with the order", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft("WOOCOMMERCE", undefined, {
        shippingAddress: {
          name: "Sam Rivera",
          line1: "1 Main St",
          city: "Springfield",
          country: "us",
        },
        shippingRate: { rateId: "r1", name: "Standard", price: 5 },
      }),
    );
    woo.createWooCheckoutOrder.mockResolvedValue({
      id: "77",
      number: "1077",
      payUrl: "https://woo.test/checkout/order-pay/77/?pay_for_order=true&key=k",
    });

    await expect(startStoreCheckout(ORDER_ID)).resolves.toContain("order-pay/77");
    expect(woo.createWooCheckoutOrder.mock.calls[0][1]).toMatchObject({
      rateupOrderId: ORDER_ID,
      lines: [{ productExternalId: "wc_10", retailerId: "wc_11", quantity: 2 }],
      address: { first_name: "Sam", last_name: "Rivera", address_1: "1 Main St" },
      shipping: { name: "Standard", price: 5 },
    });
    expect(db.shopOrder.updateMany.mock.calls[0][0].data.externalName).toBe("#1077");
  });

  test("WooCommerce needs the address first, since its payment page doesn't ask", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft("WOOCOMMERCE"));
    await expect(startStoreCheckout(ORDER_ID)).rejects.toMatchObject({
      code: "INVALID",
      message: "Add a delivery address first",
    });
    expect(woo.createWooCheckoutOrder).not.toHaveBeenCalled();
  });

  test("asking again returns the same page without a second store order", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      ...draft("SHOPIFY"),
      externalCheckoutUrl: "https://shop.test/invoices/abc",
    });
    await expect(startStoreCheckout(ORDER_ID)).resolves.toBe("https://shop.test/invoices/abc");
    expect(shopify.createShopifyCheckoutDraft).not.toHaveBeenCalled();
  });

  test("a second tap while the first is creating it waits for that one", async () => {
    db.shopOrder.findUnique
      .mockResolvedValueOnce(draft("SHOPIFY"))
      .mockResolvedValueOnce({ externalCheckoutUrl: "https://shop.test/invoices/first" });
    redis.set.mockResolvedValueOnce(null);
    await expect(startStoreCheckout(ORDER_ID)).resolves.toBe("https://shop.test/invoices/first");
    expect(shopify.createShopifyCheckoutDraft).not.toHaveBeenCalled();
  });

  test("a race past the lock keeps the first store order and removes the extra one", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft("SHOPIFY"));
    db.shopOrder.updateMany.mockResolvedValueOnce({ count: 0 });
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({
      externalCheckoutUrl: "https://shop.test/invoices/first",
    });
    shopify.createShopifyCheckoutDraft.mockResolvedValue({
      id: "9002",
      invoiceUrl: "https://shop.test/invoices/second",
    });
    await expect(startStoreCheckout(ORDER_ID)).resolves.toBe("https://shop.test/invoices/first");
    expect(shopifyOrders.deleteShopifyDraftOrder).toHaveBeenCalledWith("org-1", "9002");
  });

  test("refuses a bag holding products the store doesn't sell", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft("SHOPIFY", [item("shopify"), item(null, { title: "Gift wrap" })]),
    );
    await expect(startStoreCheckout(ORDER_ID)).rejects.toMatchObject({
      code: "INVALID",
      message: expect.stringContaining("Gift wrap"),
    });
    expect(shopify.createShopifyCheckoutDraft).not.toHaveBeenCalled();
  });

  test("a store that isn't connected any more gives the shopper a way forward", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft("SHOPIFY"));
    db.integration.findFirst.mockResolvedValueOnce(null);
    await expect(startStoreCheckout(ORDER_ID)).rejects.toMatchObject({
      code: "PAYMENT_UNAVAILABLE",
      message: expect.stringContaining("Message the shop"),
    });
  });

  test("a product deleted in the store says so, and the mirror is refreshed", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft("SHOPIFY"));
    shopify.createShopifyCheckoutDraft.mockRejectedValue(new StoreItemsGone(["Linen throw"]));
    await expect(startStoreCheckout(ORDER_ID)).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
      message: "Linen throw is no longer available. Remove it and check out again.",
    });
    expect(sync.scheduleStoreMirror).toHaveBeenCalledWith("org-1", "shopify");
  });

  test("a store that refuses is recorded on the order, and the shopper gets a plain message", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft("SHOPIFY"));
    shopify.createShopifyCheckoutDraft.mockRejectedValue(new Error("Access denied"));
    await expect(startStoreCheckout(ORDER_ID)).rejects.toMatchObject({
      code: "PAYMENT_UNAVAILABLE",
      message: expect.not.stringContaining("Access denied"),
    });
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      "external_failed",
      expect.stringContaining("Access denied"),
    );
  });
});

describe("opening the order in the store's admin", () => {
  test("Shopify: the draft until it's paid, then the order", async () => {
    shopifyOrders.shopifyAdminDomain.mockResolvedValue("fern.myshopify.com");
    const base = { orgId: "org-1", externalProvider: "shopify", externalId: "9001" };
    await expect(
      externalAdminUrl({
        ...base,
        status: "DRAFT",
        paymentStatus: "UNPAID",
        checkoutVia: "SHOPIFY",
      }),
    ).resolves.toBe("https://fern.myshopify.com/admin/draft_orders/9001");
    await expect(
      externalAdminUrl({ ...base, status: "OPEN", paymentStatus: "PAID", checkoutVia: "SHOPIFY" }),
    ).resolves.toBe("https://fern.myshopify.com/admin/orders/9001");
  });

  test("WooCommerce: the order's edit screen", async () => {
    db.integration.findFirst.mockResolvedValueOnce({
      credential: { storeUrl: "https://shop.example.com" },
    });
    await expect(
      externalAdminUrl({
        orgId: "org-1",
        externalProvider: "woocommerce",
        externalId: "77",
        status: "OPEN",
        paymentStatus: "PAID",
        checkoutVia: "WOOCOMMERCE",
      }),
    ).resolves.toBe("https://shop.example.com/wp-admin/post.php?post=77&action=edit");
  });
});

describe("the store reporting back", () => {
  const external = {
    id: ORDER_ID,
    status: "DRAFT",
    paymentStatus: "UNPAID",
    fulfillmentStatus: "UNFULFILLED",
    checkoutVia: "SHOPIFY",
    externalName: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    shippingAddress: null,
  };
  const totals = {
    subtotal: 40,
    discountTotal: 4,
    shippingTotal: 9.5,
    taxTotal: 4,
    total: 49.5,
  };

  test("paid places and pays the RateUp order at what the store charged", async () => {
    db.shopOrder.findFirst.mockResolvedValue(external);
    await syncOrderFromStore("shopify", "org-1", ORDER_ID, {
      status: "paid",
      externalOrderId: "5550001",
      totals,
    });
    expect(db.shopOrder.findFirst).toHaveBeenCalledWith({
      where: { id: ORDER_ID, orgId: "org-1", externalProvider: "shopify" },
    });
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { ...totals, pointsDiscount: 0, externalId: "5550001" },
    });
    expect(orders.markOrderPaid).toHaveBeenCalledWith(ORDER_ID, {
      provider: "shopify",
      paymentId: "5550001",
      amount: 49.5,
    });
  });

  test("fills in the customer, address and the store's order name the store collected", async () => {
    db.shopOrder.findFirst.mockResolvedValue({ ...external, customerPhone: "15550100" });
    const address = { name: "Sam Rivera", line1: "1 Main St", city: "Springfield", country: "US" };
    await syncOrderFromStore("shopify", "org-1", ORDER_ID, {
      externalName: "#1001",
      customer: { name: "Sam Rivera", email: "sam@example.com", phone: "+15550199" },
      address,
    });
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: {
        externalName: "#1001",
        customerName: "Sam Rivera",
        customerEmail: "sam@example.com",
        shippingAddress: address,
      },
    });
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("keeps RateUp's estimate when the store sends no usable total", async () => {
    db.shopOrder.findFirst.mockResolvedValue(external);
    await syncOrderFromStore("woocommerce", "org-1", ORDER_ID, {
      status: "paid",
      externalOrderId: "77",
      totals: { ...totals, total: 0 },
    });
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { externalId: "77" },
    });
    expect((orders.markOrderPaid.mock.calls[0] as unknown[])[1]).not.toHaveProperty("amount");
  });

  test("a replayed paid webhook changes nothing", async () => {
    db.shopOrder.findFirst.mockResolvedValue({ ...external, paymentStatus: "PAID" });
    await syncOrderFromStore("woocommerce", "org-1", ORDER_ID, { status: "paid" });
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
    expect(db.shopOrder.update).not.toHaveBeenCalled();
  });

  test("cancelled cancels without touching the store or restocking the mirror", async () => {
    db.shopOrder.findFirst.mockResolvedValue(external);
    await syncOrderFromStore("woocommerce", "org-1", ORDER_ID, { status: "cancelled" });
    expect(orders.cancelOrder).toHaveBeenCalledWith(ORDER_ID, {
      reason: "Cancelled in WooCommerce",
      restock: false,
      fromStore: true,
    });
  });

  test("fulfilled in the store moves the RateUp order on", async () => {
    db.shopOrder.findFirst.mockResolvedValue({
      ...external,
      status: "OPEN",
      paymentStatus: "PAID",
    });
    await syncOrderFromStore("shopify", "org-1", ORDER_ID, { fulfillment: "fulfilled" });
    expect(orders.setFulfillmentStatus).toHaveBeenCalledWith(
      ORDER_ID,
      "SHIPPED",
      null,
      "fulfilled in Shopify",
    );
  });

  test("a refund in the store is recorded on a store checkout", async () => {
    db.shopOrder.findFirst.mockResolvedValue({
      ...external,
      status: "OPEN",
      paymentStatus: "PAID",
    });
    db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
    await syncOrderFromStore("shopify", "org-1", ORDER_ID, { refund: "partial" });
    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, paymentStatus: { notIn: ["PARTIALLY_REFUNDED", "REFUNDED"] } },
      data: { paymentStatus: "PARTIALLY_REFUNDED" },
    });
  });

  test("a written-back order's refund in the store tells staff RateUp holds the money, once", async () => {
    const written = { ...external, status: "OPEN", paymentStatus: "PAID", checkoutVia: "RATEUP" };
    db.shopOrder.findFirst.mockResolvedValue(written);
    await syncOrderFromStore("shopify", "org-1", ORDER_ID, { refund: "full" });
    expect(db.shopOrder.updateMany).not.toHaveBeenCalled();
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      "needs_review",
      expect.stringContaining("RateUp took the payment"),
    );
    db.shopOrderEvent.count.mockResolvedValue(1);
    await syncOrderFromStore("shopify", "org-1", ORDER_ID, { refund: "full" });
    expect(orders.addOrderEvent).toHaveBeenCalledTimes(1);
  });

  test("a written-back cash order paid in the store is paid in RateUp too", async () => {
    db.shopOrder.findFirst.mockResolvedValue({
      ...external,
      status: "OPEN",
      paymentStatus: "COD_PENDING",
      checkoutVia: "RATEUP",
    });
    await syncOrderFromStore("woocommerce", "org-1", ORDER_ID, { status: "paid" });
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { externalPaidAt: expect.any(Date) },
    });
    expect(orders.markOrderPaid).toHaveBeenCalledWith(ORDER_ID, {
      provider: "woocommerce_marked_paid",
    });
  });

  test("ignores ids that aren't RateUp orders in that store", async () => {
    await expect(
      syncOrderFromStore("shopify", "org-1", "not-an-id", { status: "paid" }),
    ).resolves.toBeNull();
    expect(db.shopOrder.findFirst).not.toHaveBeenCalled();

    db.shopOrder.findFirst.mockResolvedValue(null);
    await expect(
      syncOrderFromStore("shopify", "org-1", ORDER_ID, { status: "paid" }),
    ).resolves.toBeNull();
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });
});
