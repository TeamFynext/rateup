import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const limits = vi.hoisted(() => ({
  checkPlanLimit: vi.fn(async () => ({ metered: false, used: 0, exceeded: false })),
}));
vi.mock("../../subscription/planLimits.js", () => limits);

const db = vi.hoisted(() => ({
  shopOrder: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  shopStore: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
  shopPayment: { count: vi.fn(async () => 0) },
  shopShippingRate: { count: vi.fn(async () => 0) },
  whatsappSettings: { findMany: vi.fn(async () => []) },
  contact: { findFirst: vi.fn() },
}));
const orders = vi.hoisted(() => ({
  addOrderEvent: vi.fn(),
  applyPrepaidDiscount: vi.fn(),
  assertDeliveryChosen: vi.fn(),
  cancelOrder: vi.fn(),
  CHECKOUT_EXPIRED_REASON: "Checkout expired",
  confirmCodOrder: vi.fn(),
  createDraftOrder: vi.fn(),
  getOrder: vi.fn(async () => ({
    id: "o1",
    status: "DRAFT",
    hasInvoice: false,
    checkoutToken: "tok",
  })),
  getOrderByToken: vi.fn(),
  markOrderPaid: vi.fn(),
  placeOrder: vi.fn(),
  pointsOfferForOrder: vi.fn(async () => null),
  repriceOrder: vi.fn(),
  revertPrepaidDiscount: vi.fn(),
}));
const payments = vi.hoisted(() => ({
  createPaymentLink: vi.fn(),
  pickProvider: vi.fn(),
  refreshPendingPayment: vi.fn(),
}));
const store = vi.hoisted(() => ({
  commerceEnabled: vi.fn(async () => true),
  getOrCreateStore: vi.fn(),
  ratesForDestination: vi.fn(async () => []),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ armShopReminder: vi.fn() }));
vi.mock("../../whatsapp/catalog/catalogSettings.service.js", () => ({
  sendAddressFlowToCustomer: vi.fn(),
}));
vi.mock("./events.js", () => ({ checkoutUrl: (t: string) => `https://shop.test/c/${t}` }));
vi.mock("./notify.js", () => ({
  sendShopMessage: vi.fn(async () => ({ sent: true, channel: "WHATSAPP" })),
}));
vi.mock("./orders.service.js", () => orders);
vi.mock("./payments/payments.service.js", () => payments);
vi.mock("./store.service.js", () => store);

const {
  createOrderFromInbox,
  getPublicCheckout,
  handleShopAddressFlow,
  handleShopReply,
  payPublicCheckout,
  updatePublicCheckout,
} = await import("./checkout.service.js");

const rateupStore = {
  id: "s1",
  orgId: "org",
  name: "Shop",
  checkoutVia: "RATEUP",
  askAddress: false,
  askDelivery: false,
  codEnabled: false,
  bankTransferEnabled: false,
  paymentLinkTtlHours: 24,
  cartReminderMinutes: [],
  codPrepaidDiscountPct: "10",
};
const order = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  orgId: "org",
  storeId: "s1",
  number: 1001,
  status: "DRAFT",
  paymentStatus: "UNPAID",
  checkoutVia: "RATEUP",
  channel: "WHATSAPP",
  channelAccountId: "pn-2",
  contactId: "c1",
  currency: "USD",
  subtotal: "20.00",
  discountTotal: "0",
  pointsDiscount: "0",
  shippingTotal: "0",
  taxTotal: "0",
  total: "20.00",
  checkoutToken: "tok",
  checkoutExpiresAt: new Date(Date.now() + 3_600_000),
  cancelReason: null,
  externalCheckoutUrl: null,
  items: [],
  shipments: [],
  returns: [],
  confirmedAt: null,
  createdAt: new Date(),
  store: rateupStore,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  store.ratesForDestination.mockResolvedValue([]);
  db.shopStore.findUniqueOrThrow.mockResolvedValue(rateupStore);
  db.whatsappSettings.findMany.mockResolvedValue([]);
  limits.checkPlanLimit.mockResolvedValue({ metered: false, used: 0, exceeded: false });
});

describe("an order created from the inbox", () => {
  beforeEach(() => {
    store.getOrCreateStore.mockResolvedValue(rateupStore);
    db.contact.findFirst.mockResolvedValue({ id: "c1", name: "Sam", phone: "15550100" });
    orders.createDraftOrder.mockResolvedValue(order());
    orders.repriceOrder.mockResolvedValue(order());
    db.shopOrder.findUnique.mockResolvedValue(order());
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(order());
  });

  test("sent nowhere still carries its checkout link, and the order as GET /orders/:id has it", async () => {
    const result = await createOrderFromInbox({
      orgId: "org",
      contactId: "c1",
      channel: "WHATSAPP",
      items: [{ variantId: "v1", quantity: 1 }],
      send: "none",
      actorUserId: "u1",
    });
    expect(result.delivery).toEqual({ sent: false, url: "https://shop.test/c/tok" });
    expect(orders.getOrder).toHaveBeenCalledWith("s1", "o1");
    expect(result.order).toEqual({
      id: "o1",
      status: "DRAFT",
      hasInvoice: false,
      checkoutUrl: "https://shop.test/c/tok",
    });
  });

  test("sent a payment link still answers with the checkout link", async () => {
    payments.pickProvider.mockResolvedValue({ provider: { id: "stripe", label: "Stripe" } });
    payments.createPaymentLink.mockResolvedValue({
      url: "https://pay.test/cs_1",
      amount: 20,
      priceChange: null,
    });
    const result = await createOrderFromInbox({
      orgId: "org",
      contactId: "c1",
      channel: "WHATSAPP",
      items: [{ variantId: "v1", quantity: 1 }],
      send: "payment_link",
      actorUserId: "u1",
    });
    expect(result.delivery).toEqual({ sent: true, url: "https://shop.test/c/tok" });
  });
});

describe("the public checkout", () => {
  test("says when a draft's window has passed", async () => {
    orders.getOrderByToken.mockResolvedValue(order({ checkoutExpiresAt: new Date(0) }));
    const view = await getPublicCheckout("tok");
    expect(view.checkoutExpired).toBe(true);
    expect(view.order.checkoutExpired).toBe(true);
  });

  test("tells a sweep's cancel apart from any other", async () => {
    orders.getOrderByToken.mockResolvedValue(
      order({ status: "CANCELLED", cancelReason: "Checkout expired" }),
    );
    expect((await getPublicCheckout("tok")).checkoutExpired).toBe(true);
    orders.getOrderByToken.mockResolvedValue(
      order({ status: "CANCELLED", cancelReason: "Customer cancelled the cash order" }),
    );
    expect((await getPublicCheckout("tok")).checkoutExpired).toBe(false);
  });

  test("gives the number the order runs on, as wa.me digits", async () => {
    orders.getOrderByToken.mockResolvedValue(order());
    db.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+1 555 0100", phoneId: "pn-1" },
      { phone: "+1 (555) 0199", phoneId: "pn-2" },
    ] as never);
    expect((await getPublicCheckout("tok")).store.whatsappNumber).toBe("15550199");
    db.whatsappSettings.findMany.mockResolvedValue([]);
    expect((await getPublicCheckout("tok")).store.whatsappNumber).toBeNull();
  });

  test("says when the shop has spent this month's orders", async () => {
    orders.getOrderByToken.mockResolvedValue(order());
    limits.checkPlanLimit.mockResolvedValue({
      metered: true,
      max: 50,
      used: 50,
      exceeded: true,
    } as never);
    expect((await getPublicCheckout("tok")).store.acceptingOrders).toBe(false);
  });

  test.each([
    ["paid", { paymentStatus: "PAID" }, true],
    ["refunded", { paymentStatus: "REFUNDED" }, true],
    ["unpaid", { paymentStatus: "UNPAID" }, false],
    ["paid in Shopify", { paymentStatus: "PAID", checkoutVia: "SHOPIFY" }, false],
  ])("offers an invoice when %s: %s", async (_, over, expected) => {
    orders.getOrderByToken.mockResolvedValue(order({ status: "OPEN", ...over }));
    db.shopStore.findUniqueOrThrow.mockResolvedValue({
      ...rateupStore,
      checkoutVia: (over as { checkoutVia?: string }).checkoutVia ?? "RATEUP",
    });
    expect((await getPublicCheckout("tok")).invoiceAvailable).toBe(expected);
  });

  test("says when a cash order waits on the customer's confirmation", async () => {
    orders.getOrderByToken.mockResolvedValue(
      order({ status: "OPEN", paymentStatus: "COD_PENDING", confirmedAt: null, returns: [] }),
    );
    db.shopStore.findUniqueOrThrow.mockResolvedValue({ ...rateupStore, codConfirm: true });
    expect((await getPublicCheckout("tok")).order.awaitingConfirmation).toBe(true);
    db.shopStore.findUniqueOrThrow.mockResolvedValue({ ...rateupStore, codConfirm: false });
    expect((await getPublicCheckout("tok")).order.awaitingConfirmation).toBe(false);
  });

  test("says when a return is open, not when it was rejected", async () => {
    orders.getOrderByToken.mockResolvedValue(
      order({ status: "OPEN", returns: [{ status: "REJECTED" }, { status: "REQUESTED" }] }),
    );
    expect((await getPublicCheckout("tok")).order.returnRequested).toBe(true);
    orders.getOrderByToken.mockResolvedValue(
      order({ status: "OPEN", returns: [{ status: "REJECTED" }] }),
    );
    expect((await getPublicCheckout("tok")).order.returnRequested).toBe(false);
  });

  test("a chat order's phone can't be changed from the page", async () => {
    orders.getOrderByToken.mockResolvedValue(order());
    await updatePublicCheckout("tok", { customer: { name: "Sam", phone: "+1 555 0123" } });
    expect(orders.repriceOrder).toHaveBeenCalledWith("o1", {
      customer: { name: "Sam", phone: undefined },
    });
  });

  test("a storefront shopper's phone can", async () => {
    orders.getOrderByToken.mockResolvedValue(order({ channel: "STOREFRONT" }));
    await updatePublicCheckout("tok", { customer: { phone: "+91 98765 43210" } });
    expect(orders.repriceOrder).toHaveBeenCalledWith("o1", {
      customer: { phone: "+919876543210" },
    });
  });

  test("a staff-made order with no contact takes the number, and can correct it", async () => {
    orders.getOrderByToken.mockResolvedValue(
      order({ channel: "MANUAL", contactId: null, customerPhone: "+919" }),
    );
    await updatePublicCheckout("tok", { customer: { phone: "+91 98765 43210" } });
    expect(orders.repriceOrder).toHaveBeenCalledWith("o1", {
      customer: { phone: "+919876543210" },
    });
  });

  test("a half-typed number is not saved", async () => {
    orders.getOrderByToken.mockResolvedValue(order({ channel: "STOREFRONT" }));
    await updatePublicCheckout("tok", { customer: { phone: "+919" } });
    expect(orders.repriceOrder).toHaveBeenCalledWith("o1", { customer: { phone: undefined } });
  });
});

describe("an order with nothing to pay", () => {
  const free = order({ total: "0.00", shippingAddress: { line1: "1 Main St" } });

  test("is placed as unpaid first, so its stock, coupon and cap checks apply", async () => {
    db.shopOrder.findUnique.mockResolvedValue(free);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(free);
    await payPublicCheckout("tok", "online");
    expect(orders.placeOrder).toHaveBeenCalledWith("o1", { paymentMethod: "free" });
    expect(orders.placeOrder.mock.invocationCallOrder[0]).toBeLessThan(
      orders.markOrderPaid.mock.invocationCallOrder[0],
    );
  });

  test("is not marked paid when placing it is refused", async () => {
    db.shopOrder.findUnique.mockResolvedValue(free);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(free);
    const { ShopError } = await import("./shop.errors.js");
    orders.placeOrder.mockRejectedValueOnce(new ShopError("OUT_OF_STOCK", "Mug is sold out"));
    await expect(payPublicCheckout("tok", "online")).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
    });
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });
});

describe("the WhatsApp address form", () => {
  test("only fills a draft of the contact who sent it", async () => {
    db.shopOrder.findFirst.mockResolvedValue(null);
    expect(
      await handleShopAddressFlow(
        "o1",
        { address1: "1 Main St" },
        { orgId: "org", contactId: "c2" },
      ),
    ).toBe(false);
    expect(db.shopOrder.findFirst).toHaveBeenCalledWith({
      where: { id: "o1", orgId: "org", contactId: "c2" },
    });
    expect(orders.repriceOrder).not.toHaveBeenCalled();
  });

  test("is ignored from an unknown sender", async () => {
    expect(await handleShopAddressFlow("o1", {}, { orgId: "org", contactId: null })).toBe(false);
    expect(db.shopOrder.findFirst).not.toHaveBeenCalled();
  });
});

describe("switching a cash order to paying online", () => {
  const cash = order({ status: "OPEN", paymentStatus: "COD_PENDING", confirmedAt: null });
  const tap = () =>
    handleShopReply("shop_cod_prepay:o1", { orgId: "org", contactId: "c1", channel: "WHATSAPP" });

  test("is not offered a discount when no gateway can take the payment", async () => {
    db.shopOrder.findFirst.mockResolvedValue(cash);
    payments.pickProvider.mockResolvedValue(null);
    await tap();
    expect(orders.applyPrepaidDiscount).not.toHaveBeenCalled();
  });

  test("is undone when the payment link can't be made", async () => {
    db.shopOrder.findFirst.mockResolvedValue(cash);
    db.shopOrder.findUnique.mockResolvedValue(cash);
    payments.pickProvider.mockResolvedValue({ provider: { id: "stripe", label: "Stripe" } });
    orders.applyPrepaidDiscount.mockResolvedValue({ saved: 2, order: cash });
    payments.createPaymentLink.mockRejectedValue(new Error("gateway down"));
    await tap();
    expect(orders.revertPrepaidDiscount).toHaveBeenCalledWith(cash);
    expect(orders.addOrderEvent).not.toHaveBeenCalledWith("o1", "cod_prepaid", expect.anything());
  });
});
