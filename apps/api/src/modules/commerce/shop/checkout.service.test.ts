import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

// Unmetered plan: the monthly order cap has its own tests (orders.orderLimit.test.ts).
vi.mock("../../subscription/planLimits.js", () => ({
  checkPlanLimit: vi.fn(async () => ({ metered: false, used: 0, exceeded: false })),
}));
vi.mock("../../subscription/shopOrders.js", () => ({ countPlacedOrder: vi.fn(async () => 1) }));
vi.mock("../../subscription/limitAlerts.js", () => ({ maybeNotifyOrderUsage: vi.fn() }));

const db = vi.hoisted(() => ({
  shopOrder: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  shopStore: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
  shopVariant: { count: vi.fn() },
  contact: { findFirst: vi.fn() },
}));
const queue = vi.hoisted(() => ({ armShopReminder: vi.fn() }));
const orders = vi.hoisted(() => ({
  addOrderEvent: vi.fn(),
  applyPrepaidDiscount: vi.fn(),
  assertDeliveryChosen: vi.fn(),
  cancelOrder: vi.fn(),
  confirmCodOrder: vi.fn(),
  createDraftOrder: vi.fn(),
  getOrderByToken: vi.fn(),
  markOrderPaid: vi.fn(),
  orderDetailInclude: {},
  placeOrder: vi.fn(),
  pointsOfferForOrder: vi.fn(),
  prepareDraftForPayment: vi.fn(async () => ({ changed: false, before: 0, after: 0 })),
  repriceOrder: vi.fn(),
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
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);
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
  continueChatCheckout,
  handleShopReply,
  payPublicCheckout,
  sendCheckoutLink,
  startCheckoutFromCart,
} = await import("./checkout.service.js");
const { checkPlanLimit } = await import("../../subscription/planLimits.js");
const { ShopError } = await import("./shop.errors.js");
const { ORDER_LIMIT_MESSAGE } = await import("./orderAllowance.js");

const MIN = 60_000;

beforeEach(() => {
  vi.clearAllMocks();
  store.commerceEnabled.mockResolvedValue(true);
});

describe("replies to checkout messages", () => {
  test("are ignored when the sender is not a known contact", async () => {
    const handled = await handleShopReply("shop_cod_cancel:o1", {
      orgId: "org",
      contactId: null,
      channel: "INSTAGRAM",
    });
    expect(handled).toBe(true);
    expect(db.shopOrder.findFirst).not.toHaveBeenCalled();
    expect(orders.cancelOrder).not.toHaveBeenCalled();
  });

  test("only reach an order of the contact who replied", async () => {
    db.shopOrder.findFirst.mockResolvedValue(null);
    await handleShopReply("shop_cod_cancel:o1", {
      orgId: "org",
      contactId: "c1",
      channel: "WHATSAPP",
    });
    expect(db.shopOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "o1", orgId: "org", contactId: "c1" } }),
    );
    expect(orders.cancelOrder).not.toHaveBeenCalled();
  });
});

describe("the cash order's Cancel button", () => {
  const cashOrder = {
    id: "o1",
    orgId: "org",
    number: 1001,
    channel: "WHATSAPP",
    currency: "USD",
    status: "OPEN",
    paymentStatus: "COD_PENDING",
    fulfillmentStatus: "UNFULFILLED",
    confirmedAt: null,
    store: {},
  };
  const tap = () =>
    handleShopReply("shop_cod_cancel:o1", { orgId: "org", contactId: "c1", channel: "WHATSAPP" });

  test("cancels a cash order that hasn't been confirmed yet", async () => {
    db.shopOrder.findFirst.mockResolvedValue(cashOrder);
    await tap();
    expect(orders.cancelOrder).toHaveBeenCalledWith("o1", expect.anything());
  });

  test.each([
    ["confirmed", { confirmedAt: new Date() }],
    ["switched to paying online", { paymentStatus: "PENDING", confirmedAt: new Date() }],
    ["paid", { paymentStatus: "PAID" }],
    ["packed", { fulfillmentStatus: "PACKED" }],
    ["already cancelled", { status: "CANCELLED" }],
  ])("does nothing once the order is %s, and says so", async (_, change) => {
    db.shopOrder.findFirst.mockResolvedValue({ ...cashOrder, ...change });
    const { sendShopMessage } = await import("./notify.js");
    await tap();
    expect(orders.cancelOrder).not.toHaveBeenCalled();
    expect(vi.mocked(sendShopMessage).mock.calls[0]?.[1]).toMatchObject({
      text: expect.stringContaining("can't be cancelled from here"),
    });
  });
});

describe("cart reminders", () => {
  test("arm only the steps still ahead, so a sent one is not sent again", async () => {
    const order = {
      id: "o1",
      orgId: "org",
      number: 1001,
      currency: "USD",
      total: "10",
      discountTotal: "0",
      pointsDiscount: "0",
      shippingTotal: "0",
      taxTotal: "0",
      channel: "WHATSAPP",
      checkoutToken: "tok",
      createdAt: new Date(Date.now() - 40 * MIN),
      store: { cartReminderMinutes: [30, 1440] },
    };
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({ ...order, items: [] });
    await sendCheckoutLink(order as never);
    expect(queue.armShopReminder).toHaveBeenCalledTimes(1);
    expect(queue.armShopReminder).toHaveBeenCalledWith("o1", "cart", 1, expect.any(Date));
  });
});

describe("an order with nothing to pay", () => {
  test("is placed and paid without a payment link", async () => {
    const order = {
      id: "o1",
      status: "DRAFT",
      paymentStatus: "UNPAID",
      total: "0.00",
      shippingAddress: {
        name: "Asha",
        line1: "1 Main St",
        city: "Paris",
        postalCode: "75001",
        country: "FR",
      },
      store: { askAddress: true, codEnabled: false, bankTransferEnabled: false },
    };
    db.shopOrder.findUnique.mockResolvedValue(order);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(order);
    expect(await payPublicCheckout("tok", "online")).toEqual({ status: "paid" });
    expect(orders.markOrderPaid).toHaveBeenCalledWith("o1", { provider: "free", amount: 0 });
    expect(payments.createPaymentLink).not.toHaveBeenCalled();
  });
});

describe("paying on the checkout page", () => {
  test.each(["online", "cod", "bank"] as const)(
    "is refused by %s when the delivery check fails",
    async (method) => {
      db.shopOrder.findUnique.mockResolvedValue({
        id: "o1",
        status: "DRAFT",
        paymentStatus: "UNPAID",
        total: "30.00",
        shippingAddress: {
          name: "Asha",
          line1: "1 Main St",
          city: "Paris",
          postalCode: "75001",
          country: "FR",
        },
        store: { askAddress: true, codEnabled: true, bankTransferEnabled: true },
      });
      orders.assertDeliveryChosen.mockRejectedValueOnce(
        Object.assign(new Error("We don't deliver to France"), { code: "INVALID" }),
      );
      await expect(payPublicCheckout("tok", method)).rejects.toThrow("We don't deliver to France");
      expect(payments.createPaymentLink).not.toHaveBeenCalled();
      expect(orders.placeOrder).not.toHaveBeenCalled();
    },
  );
});

describe("carts from chat", () => {
  test("go to the older catalog flow when the plan does not include Commerce", async () => {
    db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
    store.commerceEnabled.mockResolvedValue(false);
    const result = await startCheckoutFromCart(
      { orgId: "org", channel: "WHATSAPP", contactId: "c1" },
      [{ retailerId: "sku", quantity: 1 }],
    );
    expect(result).toBeNull();
    expect(orders.createDraftOrder).not.toHaveBeenCalled();
  });
});

describe("a shop that has taken this month's orders", () => {
  const spent = { metered: true, max: 50, used: 50, remaining: 0, exceeded: true };
  const draft = {
    id: "o1",
    orgId: "org",
    number: 1001,
    source: "wa_cart",
    channel: "WHATSAPP",
    currency: "USD",
    status: "DRAFT",
    paymentStatus: "UNPAID",
    total: "0.00",
    checkoutVia: "RATEUP",
    shippingAddress: {
      name: "Asha",
      line1: "1 Main St",
      city: "Paris",
      postalCode: "75001",
      country: "FR",
    },
    store: { askAddress: true, codEnabled: true, bankTransferEnabled: false },
  };
  const sent = async () => {
    const { sendShopMessage } = await import("./notify.js");
    return vi.mocked(sendShopMessage).mock.calls.map((call) => call[1]);
  };

  test("tells a chat shopper to message the shop instead of starting checkout", async () => {
    vi.mocked(checkPlanLimit).mockResolvedValueOnce(spent);
    db.shopOrder.findUnique.mockResolvedValue(draft);
    await continueChatCheckout("o1");
    expect(checkPlanLimit).toHaveBeenCalledWith("org", "orders");
    expect(await sent()).toEqual([{ text: ORDER_LIMIT_MESSAGE }]);
    expect(orders.pointsOfferForOrder).not.toHaveBeenCalled();
  });

  test("a refused cash order is answered in the chat, in plain words", async () => {
    db.shopOrder.findFirst.mockResolvedValue(draft);
    orders.placeOrder.mockRejectedValueOnce(new ShopError("ORDER_LIMIT", ORDER_LIMIT_MESSAGE));
    await handleShopReply("shop_pay:o1:cod", {
      orgId: "org",
      contactId: "c1",
      channel: "WHATSAPP",
    });
    expect(await sent()).toEqual([{ text: ORDER_LIMIT_MESSAGE }]);
  });

  test("refuses a free order before it is placed", async () => {
    vi.mocked(checkPlanLimit).mockResolvedValueOnce(spent);
    db.shopOrder.findUnique.mockResolvedValue(draft);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(draft);
    await expect(payPublicCheckout("tok", "online")).rejects.toMatchObject({
      code: "ORDER_LIMIT",
      message: ORDER_LIMIT_MESSAGE,
    });
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("never refuses a setup test order", async () => {
    const test = { ...draft, source: "test" };
    db.shopOrder.findUnique.mockResolvedValue(test);
    db.shopOrder.findUniqueOrThrow.mockResolvedValue(test);
    expect(await payPublicCheckout("tok", "online")).toEqual({ status: "paid" });
    expect(checkPlanLimit).not.toHaveBeenCalled();
  });
});
