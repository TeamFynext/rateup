import { beforeEach, describe, expect, test, vi } from "vitest";

// Unmetered plan: the monthly order cap has its own tests (orders.orderLimit.test.ts).
vi.mock("../../subscription/planLimits.js", () => ({
  checkPlanLimit: vi.fn(async () => ({ metered: false, used: 0, exceeded: false })),
}));
vi.mock("../../subscription/shopOrders.js", () => ({ countPlacedOrder: vi.fn(async () => 1) }));
vi.mock("../../subscription/limitAlerts.js", () => ({ maybeNotifyOrderUsage: vi.fn() }));

const db = vi.hoisted(() => ({
  shopOrder: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  shopStore: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
  shopVariant: { count: vi.fn() },
  shopPayment: { count: vi.fn(async () => 0) },
  shopShippingRate: { count: vi.fn(async () => 1) },
  contact: { findFirst: vi.fn() },
}));
const queue = vi.hoisted(() => ({ armShopReminder: vi.fn() }));
const orders = vi.hoisted(() => ({
  addOrderEvent: vi.fn(),
  assertCheckoutOpen: vi.fn(),
  assertDeliveryChosen: vi.fn(),
  createDraftOrder: vi.fn(),
  getOrderByToken: vi.fn(),
  orderDetailInclude: {},
  pointsOfferForOrder: vi.fn(async () => ({ points: 100 })),
  repriceOrder: vi.fn(),
}));
const payments = vi.hoisted(() => ({
  createPaymentLink: vi.fn(),
  pickProvider: vi.fn(async () => ({ provider: { id: "stripe", label: "Card" } })),
  refreshPendingPayment: vi.fn(),
}));
const store = vi.hoisted(() => ({
  commerceEnabled: vi.fn(async () => true),
  getOrCreateStore: vi.fn(),
  ratesForDestination: vi.fn(async () => []),
}));
const notify = vi.hoisted(() => ({
  sendShopMessage: vi.fn(async () => ({ sent: true, channel: "WHATSAPP" })),
}));
const external = vi.hoisted(() => ({
  startStoreCheckout: vi.fn(async () => "https://shop.test/invoices/abc"),
}));
const flows = vi.hoisted(() => ({ sendAddressFlowToCustomer: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);
vi.mock("../../whatsapp/catalog/catalogSettings.service.js", () => flows);
vi.mock("./events.js", () => ({ checkoutUrl: (t: string) => `https://app.test/c/${t}` }));
vi.mock("./notify.js", () => notify);
vi.mock("./orders.service.js", () => orders);
vi.mock("./payments/payments.service.js", () => payments);
vi.mock("./store.service.js", () => store);
vi.mock("./externalCheckout.service.js", async (load) => ({
  ...(await load<typeof import("./externalCheckout.service.js")>()),
  ...external,
}));

const {
  checkoutFromStorefront,
  createOrderFromInbox,
  getPublicCheckout,
  payPublicCheckout,
  sendPaymentLink,
  startCheckoutFromCart,
  startPublicStoreCheckout,
  updatePublicCheckout,
} = await import("./checkout.service.js");

const shopifyStore = {
  id: "s1",
  orgId: "org-1",
  slug: "fern",
  storefrontEnabled: true,
  checkoutVia: "SHOPIFY",
  askAddress: true,
  metaCatalogId: "cat1",
  cartReminderMinutes: [60],
};
const draft = {
  id: "o1",
  orgId: "org-1",
  number: 1042,
  status: "DRAFT",
  channel: "WHATSAPP",
  channelAccountId: "pn-1",
  contactId: "c1",
  customerPhone: "15550100",
  checkoutVia: "SHOPIFY",
  checkoutStage: "PAYMENT",
  checkoutToken: "tok",
  externalCheckoutUrl: null,
  total: 40,
  currency: "USD",
  createdAt: new Date(),
  store: shopifyStore,
  items: [{ title: "Linen throw", variantTitle: "Sand", quantity: 1 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.shopOrder.findUnique.mockResolvedValue(draft);
  db.shopOrder.findUniqueOrThrow.mockResolvedValue(draft);
  orders.createDraftOrder.mockResolvedValue(draft);
});

describe("a shop that checks out in its own store", () => {
  test("the storefront bag goes to RateUp's page, which hands it to the store when opened", async () => {
    db.shopStore.findUnique.mockResolvedValue(shopifyStore);
    await expect(
      checkoutFromStorefront("fern", [{ variantId: "v1", quantity: 1 }]),
    ).resolves.toEqual({ token: "tok", url: "https://app.test/c/tok" });
    expect(external.startStoreCheckout).not.toHaveBeenCalled();
  });

  test("pressing Checkout again with the same bag reuses its open checkout", async () => {
    db.shopStore.findUnique.mockResolvedValue(shopifyStore);
    db.shopOrder.findUnique.mockResolvedValue({
      ...draft,
      storeId: "s1",
      channel: "STOREFRONT",
      paymentStatus: "UNPAID",
      checkoutExpiresAt: new Date(Date.now() + 60_000),
      items: [{ variantId: "v1", quantity: 2 }],
    });
    await expect(
      checkoutFromStorefront("fern", [{ variantId: "v1", quantity: 2 }], undefined, "tok"),
    ).resolves.toEqual({ token: "tok", url: "https://app.test/c/tok" });
    expect(orders.createDraftOrder).not.toHaveBeenCalled();

    // A changed bag starts a fresh checkout.
    await checkoutFromStorefront("fern", [{ variantId: "v1", quantity: 3 }], undefined, "tok");
    expect(orders.createDraftOrder).toHaveBeenCalledTimes(1);
  });

  test("a WhatsApp cart gets the checkout link, not the address form or RateUp reminders", async () => {
    db.shopStore.findUnique.mockResolvedValue(shopifyStore);
    db.shopVariant.count.mockResolvedValue(1);
    await startCheckoutFromCart(
      { orgId: "org-1", channel: "WHATSAPP", contactId: "c1", phone: "15550100" },
      [{ retailerId: "123", quantity: 1 }],
    );
    expect(flows.sendAddressFlowToCustomer).not.toHaveBeenCalled();
    expect(queue.armShopReminder).not.toHaveBeenCalled();
    expect(external.startStoreCheckout).not.toHaveBeenCalled();
    const [, message] = notify.sendShopMessage.mock.calls[0] as unknown as [
      unknown,
      { text: string; cta: { label: string; url: string } },
    ];
    expect(message.cta).toEqual({ label: "Checkout", url: "https://app.test/c/tok" });
    expect(message.text).toContain("• Linen throw (Sand) ×1");
  });

  test("staff sending a payment link from the inbox send the checkout link instead", async () => {
    store.getOrCreateStore.mockResolvedValue(shopifyStore);
    db.contact.findFirst.mockResolvedValue({ id: "c1", name: "Sam", phone: "15550100" });
    orders.repriceOrder.mockResolvedValue(draft);

    const { delivery } = await createOrderFromInbox({
      orgId: "org-1",
      contactId: "c1",
      channel: "WHATSAPP",
      items: [{ variantId: "v1", quantity: 1 }],
      send: "payment_link",
      actorUserId: "u1",
    });
    expect(payments.pickProvider).not.toHaveBeenCalled();
    expect(payments.createPaymentLink).not.toHaveBeenCalled();
    expect(delivery).toEqual({ sent: true, url: "https://app.test/c/tok" });
  });

  test("a created-only order still has a link that leads to the store", async () => {
    store.getOrCreateStore.mockResolvedValue(shopifyStore);
    db.contact.findFirst.mockResolvedValue({ id: "c1", name: "Sam", phone: "15550100" });
    orders.repriceOrder.mockResolvedValue(draft);
    const { delivery } = await createOrderFromInbox({
      orgId: "org-1",
      contactId: "c1",
      channel: "WHATSAPP",
      items: [{ variantId: "v1", quantity: 1 }],
      send: "none",
      actorUserId: "u1",
    });
    expect(notify.sendShopMessage).not.toHaveBeenCalled();
    expect(delivery).toEqual({ sent: false, url: "https://app.test/c/tok" });
  });

  test("resending a payment link on a store order resends its checkout, never a second payment", async () => {
    const outcome = await sendPaymentLink("o1");
    expect(payments.createPaymentLink).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      url: "https://app.test/c/tok",
      provider: null,
      delivered: true,
    });
  });

  test("a coupon from staff is refused, since codes go in on the store's checkout", async () => {
    store.getOrCreateStore.mockResolvedValue(shopifyStore);
    await expect(
      createOrderFromInbox({
        orgId: "org-1",
        contactId: "c1",
        channel: "WHATSAPP",
        items: [{ variantId: "v1", quantity: 1 }],
        discountCode: "SAVE10",
        send: "checkout_link",
        actorUserId: "u1",
      }),
    ).rejects.toMatchObject({ code: "DISCOUNT_INVALID" });
    expect(orders.createDraftOrder).not.toHaveBeenCalled();
  });

  test("a shop that checks out in RateUp keeps its hosted checkout", async () => {
    db.shopStore.findUnique.mockResolvedValue({ ...shopifyStore, checkoutVia: "RATEUP" });
    await expect(
      checkoutFromStorefront("fern", [{ variantId: "v1", quantity: 1 }]),
    ).resolves.toEqual({ token: "tok", url: "https://app.test/c/tok" });
  });
});

describe("RateUp's page for a store-checkout order", () => {
  const page = {
    ...draft,
    storeId: "s1",
    paymentStatus: "UNPAID",
    subtotal: 40,
    discountTotal: 0,
    pointsDiscount: 0,
    shippingTotal: 0,
    taxTotal: 0,
    shipments: [],
  };

  test("offers no RateUp payment, coupon or points, and names the store", async () => {
    orders.getOrderByToken.mockResolvedValue(page);
    db.shopStore.findUniqueOrThrow.mockResolvedValue({ ...shopifyStore, allowCoupons: true });
    const view = await getPublicCheckout("tok");
    expect(view.paymentOptions).toEqual({ online: null, cod: false, bank: false });
    expect(view.points).toBeNull();
    expect(view.store.allowCoupons).toBe(false);
    expect(view.storeCheckout).toEqual({
      provider: "shopify",
      label: "Shopify",
      url: null,
      collectsDetails: false,
    });
  });

  test("WooCommerce asks for the address and delivery here first", async () => {
    orders.getOrderByToken.mockResolvedValue({ ...page, checkoutVia: "WOOCOMMERCE" });
    db.shopStore.findUniqueOrThrow.mockResolvedValue({
      ...shopifyStore,
      checkoutVia: "WOOCOMMERCE",
    });
    const view = await getPublicCheckout("tok");
    expect(view.storeCheckout).toMatchObject({ provider: "woocommerce", collectsDetails: true });
  });

  test("continuing creates the store's order then, and only then", async () => {
    orders.getOrderByToken.mockResolvedValue(page);
    db.shopStore.findUniqueOrThrow.mockResolvedValue(shopifyStore);
    await expect(startPublicStoreCheckout("tok")).resolves.toEqual({
      url: "https://shop.test/invoices/abc",
    });
    expect(external.startStoreCheckout).toHaveBeenCalledWith("o1");
  });

  test("paying it in RateUp, or a coupon or points, is refused", async () => {
    db.shopOrder.findUnique.mockResolvedValue({ ...page, store: shopifyStore });
    await expect(payPublicCheckout("tok", "online")).rejects.toMatchObject({ code: "CONFLICT" });
    orders.getOrderByToken.mockResolvedValue(page);
    await expect(updatePublicCheckout("tok", { discountCode: "SAVE10" })).rejects.toMatchObject({
      code: "DISCOUNT_INVALID",
    });
    expect(orders.repriceOrder).not.toHaveBeenCalled();
    expect(payments.createPaymentLink).not.toHaveBeenCalled();
  });
});
