import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

// Unmetered plan: the monthly order cap has its own tests (orders.orderLimit.test.ts).
vi.mock("../../../subscription/planLimits.js", () => ({
  checkPlanLimit: vi.fn(async () => ({ metered: false, used: 0, exceeded: false })),
}));
vi.mock("../../../subscription/shopOrders.js", () => ({ countPlacedOrder: vi.fn(async () => 1) }));
vi.mock("../../../subscription/limitAlerts.js", () => ({ maybeNotifyOrderUsage: vi.fn() }));

const db = vi.hoisted(() => ({
  shopPayment: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  shopOrder: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  shopStore: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  integration: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));
const gateway = vi.hoisted(() => ({
  id: "stripe" as const,
  label: "Stripe",
  connect: vi.fn(),
  createLink: vi.fn(),
  fetchState: vi.fn(),
  parseWebhook: vi.fn(),
  expireLink: vi.fn(),
  refundedTotal: vi.fn(),
  refund: vi.fn(),
}));
const orders = vi.hoisted(() => ({
  addOrderEvent: vi.fn(),
  markOrderPaid: vi.fn(),
  newCheckoutToken: vi.fn(() => "tok"),
  prepareDraftForPayment: vi.fn(async () => ({ changed: false, before: 0, after: 0 })),
  reserveOrderBenefits: vi.fn(),
  releaseOrderBenefits: vi.fn(),
}));

vi.mock("../../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../../utils/logger.js", () => ({
  log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("./stripe.provider.js", () => ({ stripeProvider: gateway }));
vi.mock("../orders.service.js", () => orders);
vi.mock("../events.js", () => ({
  checkoutUrl: (t: string) => `https://shop.test/c/${t}`,
  onShopOrderEvent: vi.fn(),
}));
vi.mock("../shopLoyalty.js", () => ({ reverseEarnedPoints: vi.fn(() => Promise.resolve()) }));

const { createPaymentLink, handlePaymentWebhook, markPaidManually, refreshPendingPayment } =
  await import("./payments.service.js");
const { razorpayProvider } = await import("./razorpay.provider.js");

const ORDER = { id: "o1", orgId: "org" };
const account = { id: "int", name: "shop_stripe", active: true, credential: { apiKey: "sk_test" } };

function pendingPayment(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    orderId: "o1",
    provider: "stripe",
    providerRef: "cs_1",
    status: "PENDING",
    amount: "100.00",
    currency: "USD",
    refundedAmount: "0",
    order: { storeId: "s1" },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findUnique.mockResolvedValue(account);
  db.shopPayment.findFirst.mockResolvedValue(pendingPayment());
  db.shopPayment.findUnique.mockResolvedValue(pendingPayment());
  db.shopPayment.updateMany.mockResolvedValue({ count: 1 });
  db.shopOrder.findUniqueOrThrow.mockResolvedValue({
    id: "o1",
    total: "100.00",
    currency: "USD",
    paymentStatus: "PENDING",
  });
});

const paidState = (amount = 100, over: Record<string, unknown> = {}) => ({
  state: "paid",
  providerRef: "cs_1",
  paymentId: "pi_1",
  amount,
  currency: "USD",
  orderId: "o1",
  ...over,
});

describe("confirming a payment", () => {
  test("marks the order paid once when the payment is claimed", async () => {
    gateway.fetchState.mockResolvedValue(paidState());
    await refreshPendingPayment(ORDER);
    expect(db.shopPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1", status: { in: ["PENDING", "EXPIRED", "FAILED"] } },
      }),
    );
    expect(orders.markOrderPaid).toHaveBeenCalledTimes(1);
  });

  test("a second report of the same payment (webhook racing the return page) does nothing", async () => {
    gateway.fetchState.mockResolvedValue(paidState());
    db.shopPayment.updateMany.mockResolvedValue({ count: 0 });
    await refreshPendingPayment(ORDER);
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
    expect(orders.addOrderEvent).not.toHaveBeenCalled();
  });

  test("paying less than the order now costs does not settle it", async () => {
    gateway.fetchState.mockResolvedValue(paidState(80));
    await refreshPendingPayment(ORDER);
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      "o1",
      "underpaid",
      expect.any(String),
      expect.anything(),
    );
  });

  test("a second payment for an order already paid is flagged, not applied", async () => {
    gateway.fetchState.mockResolvedValue(paidState());
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({
      id: "o1",
      total: "100.00",
      currency: "USD",
      paymentStatus: "PAID",
    });
    await refreshPendingPayment(ORDER);
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      "o1",
      "duplicate_payment",
      expect.any(String),
      expect.anything(),
    );
  });

  test("an older link paid in full still pays the order, and says so", async () => {
    db.shopPayment.findFirst.mockResolvedValue(pendingPayment({ status: "EXPIRED" }));
    gateway.parseWebhook.mockReturnValue(paidState());
    gateway.fetchState.mockResolvedValue(paidState());
    db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      "o1",
      "old_link_paid",
      expect.any(String),
      expect.anything(),
    );
    expect(orders.markOrderPaid).toHaveBeenCalledTimes(1);
  });
});

describe("new payment links", () => {
  test("close the older pending links at the gateway", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      orgId: "org",
      number: 1001,
      total: "90.00",
      currency: "USD",
      status: "DRAFT",
      paymentStatus: "PENDING",
      checkoutToken: "tok",
      checkoutStage: "PAYMENT",
      customerName: null,
      customerEmail: null,
      customerPhone: null,
      store: {
        orgId: "org",
        name: "Shop",
        paymentLinkTtlHours: 24,
        defaultPaymentProvider: "stripe",
      },
    });
    db.shopPayment.findMany.mockResolvedValue([pendingPayment({ providerRef: "cs_old" })]);
    gateway.createLink.mockResolvedValue({ url: "https://pay", providerRef: "cs_new" });
    gateway.expireLink.mockResolvedValue(undefined);
    db.$transaction.mockResolvedValue(undefined);
    await createPaymentLink("o1");
    expect(gateway.expireLink).toHaveBeenCalledWith(account.credential, "cs_old");
    expect(gateway.createLink.mock.calls[0][1]).toMatchObject({
      returnUrl: "https://shop.test/c/tok?paid=1",
      cancelUrl: "https://shop.test/c/tok?payment=cancelled",
    });
  });

  test("bring a draft to today's prices and hold its coupon and points first", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      orgId: "org",
      number: 1001,
      total: "90.00",
      currency: "USD",
      status: "DRAFT",
      paymentStatus: "UNPAID",
      checkoutToken: "tok",
      store: { orgId: "org", name: "Shop", paymentLinkTtlHours: 24 },
    });
    db.shopPayment.findMany.mockResolvedValue([]);
    gateway.createLink.mockResolvedValue({ url: "https://pay", providerRef: "cs_new" });
    db.$transaction.mockResolvedValue(undefined);

    await createPaymentLink("o1");

    expect(orders.prepareDraftForPayment).toHaveBeenCalledWith("o1", { strict: true });
    expect(orders.reserveOrderBenefits).toHaveBeenCalledWith("o1");
    expect(orders.reserveOrderBenefits.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.createLink.mock.invocationCallOrder[0],
    );
  });

  test("are refused, with no link and no hold, when the draft has expired or prices moved", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "DRAFT",
      paymentStatus: "UNPAID",
    });
    const { ShopError } = await import("../shop.errors.js");
    orders.prepareDraftForPayment.mockRejectedValueOnce(
      new ShopError("CHECKOUT_EXPIRED", "This checkout has expired."),
    );

    await expect(createPaymentLink("o1")).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
    expect(orders.reserveOrderBenefits).not.toHaveBeenCalled();
    expect(gateway.createLink).not.toHaveBeenCalled();
  });
});

describe("a payment link that fails or lapses", () => {
  beforeEach(() => {
    db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
    db.shopPayment.findFirst.mockResolvedValue(pendingPayment({ providerRef: "cs_1" }));
    db.shopPayment.updateMany.mockResolvedValue({ count: 1 });
    gateway.parseWebhook.mockReturnValue({ state: "expired", providerRef: "cs_1" });
  });

  test("gives the draft's held coupon and points back when no other link is open", async () => {
    db.shopPayment.count.mockResolvedValue(0);
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(orders.releaseOrderBenefits).toHaveBeenCalledWith("o1");
  });

  test("keeps them while a newer link is still open", async () => {
    db.shopPayment.count.mockResolvedValue(1);
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(orders.releaseOrderBenefits).not.toHaveBeenCalled();
  });
});

describe("refunds", () => {
  test("a webhook without a running total asks the gateway for it", async () => {
    gateway.parseWebhook.mockReturnValue({
      state: "refunded",
      providerRef: null,
      paymentId: "pi_1",
      amountRefunded: null,
    });
    gateway.refundedTotal.mockResolvedValue(60);
    db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
    db.shopPayment.findUniqueOrThrow.mockResolvedValue(
      pendingPayment({ status: "PAID", refundedAmount: "30.00" }),
    );
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(gateway.refundedTotal).toHaveBeenCalledWith(account.credential, "pi_1");
    expect(db.shopPayment.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", refundedAmount: { lt: 60 } },
      data: { refundedAmount: 60 },
    });
  });

  test("Razorpay's refund webhook leaves the total to be asked for", () => {
    const body = JSON.stringify({
      event: "refund.processed",
      payload: { refund: { entity: { payment_id: "pay_1", amount: 3000, currency: "INR" } } },
    });
    const secret = "whsec";
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(
      razorpayProvider.parseWebhook({ webhookSecret: secret }, body, {
        "x-razorpay-signature": signature,
      }),
    ).toEqual({ state: "refunded", providerRef: null, paymentId: "pay_1", amountRefunded: null });
  });
});

describe("webhooks only act on the store they were sent to", () => {
  beforeEach(() => {
    db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
  });

  test("a payment is looked up within the URL's store", async () => {
    gateway.parseWebhook.mockReturnValue(paidState());
    db.shopPayment.findFirst.mockResolvedValue(null);
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(db.shopPayment.findFirst).toHaveBeenCalledWith({
      where: { provider: "stripe", providerRef: "cs_1", order: { storeId: "s1" } },
    });
    expect(gateway.fetchState).not.toHaveBeenCalled();
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("the gateway's own answer is used, not the amount the event claims", async () => {
    gateway.parseWebhook.mockReturnValue(paidState(100));
    gateway.fetchState.mockResolvedValue({ state: "pending", providerRef: "cs_1" });
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(gateway.fetchState).toHaveBeenCalledWith(account.credential, "cs_1");
    expect(db.shopPayment.updateMany).not.toHaveBeenCalled();
    expect(orders.markOrderPaid).not.toHaveBeenCalled();

    gateway.fetchState.mockResolvedValue(paidState(100));
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(orders.markOrderPaid).toHaveBeenCalledWith(
      "o1",
      expect.objectContaining({ amount: 100 }),
    );
  });

  test("a payment in another currency, or for another order, is flagged and not applied", async () => {
    gateway.parseWebhook.mockReturnValue(paidState());
    for (const over of [{ currency: "EUR" }, { orderId: "someone-elses" }]) {
      vi.clearAllMocks();
      db.integration.findUnique.mockResolvedValue(account);
      db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
      db.shopPayment.findFirst.mockResolvedValue(pendingPayment());
      gateway.parseWebhook.mockReturnValue(paidState());
      gateway.fetchState.mockResolvedValue(paidState(100, over));
      await handlePaymentWebhook("stripe", "s1", "{}", {});
      expect(db.shopPayment.updateMany).not.toHaveBeenCalled();
      expect(orders.markOrderPaid).not.toHaveBeenCalled();
      expect(orders.addOrderEvent).toHaveBeenCalledWith(
        "o1",
        "payment_mismatch",
        expect.any(String),
        expect.anything(),
      );
    }
  });

  test("a refund webhook is scoped to the store and its total asked of the gateway", async () => {
    gateway.parseWebhook.mockReturnValue({
      state: "refunded",
      providerRef: null,
      paymentId: "pi_1",
      amountRefunded: 100,
    });
    gateway.refundedTotal.mockResolvedValue(0);
    db.shopPayment.findUniqueOrThrow.mockResolvedValue(pendingPayment({ status: "PAID" }));
    // Nothing refunded at the gateway does not move the recorded total.
    db.shopPayment.updateMany.mockResolvedValue({ count: 0 });
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(db.shopPayment.findFirst).toHaveBeenCalledWith({
      where: { provider: "stripe", providerPaymentId: "pi_1", order: { storeId: "s1" } },
    });
    expect(gateway.refundedTotal).toHaveBeenCalledWith(account.credential, "pi_1");
    expect(db.shopPayment.update).not.toHaveBeenCalled();
  });
});

describe("marking paid by hand", () => {
  test("is refused for an order already paid, refunded or cancelled", async () => {
    for (const order of [
      { status: "OPEN", paymentStatus: "PAID" },
      { status: "OPEN", paymentStatus: "REFUNDED" },
      { status: "CANCELLED", paymentStatus: "UNPAID" },
    ]) {
      db.shopOrder.findUnique.mockResolvedValue({
        id: "o1",
        total: "100.00",
        currency: "USD",
        ...order,
      });
      await expect(markPaidManually("o1", "cash", "u1")).rejects.toMatchObject({ code: "INVALID" });
    }
    expect(db.shopPayment.create).not.toHaveBeenCalled();
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("is refused for an order paid in Shopify or WooCommerce, which RateUp follows", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      total: "100.00",
      currency: "USD",
      status: "DRAFT",
      paymentStatus: "UNPAID",
      checkoutVia: "SHOPIFY",
    });
    await expect(markPaidManually("o1", "cash", "u1")).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Shopify"),
    });
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("records a cash payment for an order still waiting", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      total: "100.00",
      currency: "USD",
      status: "OPEN",
      paymentStatus: "COD_PENDING",
    });
    await markPaidManually("o1", "cash", "u1");
    expect(orders.markOrderPaid).toHaveBeenCalledTimes(1);
  });
});

describe("a payment link for an order paid in the store", () => {
  test("is refused, so the customer can never pay twice", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "DRAFT",
      paymentStatus: "UNPAID",
      checkoutVia: "RATEUP",
      externalCheckoutUrl: "https://woo.test/checkout/order-pay/77",
    });
    await expect(createPaymentLink("o1")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(orders.reserveOrderBenefits).not.toHaveBeenCalled();
    expect(gateway.createLink).not.toHaveBeenCalled();
  });
});

describe("a payment recorded but never settled on the order", () => {
  test("a retried webhook settles it", async () => {
    db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org" });
    gateway.parseWebhook.mockReturnValue(paidState());
    gateway.fetchState.mockResolvedValue(paidState());
    db.shopPayment.updateMany.mockResolvedValue({ count: 0 });
    db.shopPayment.findUnique.mockResolvedValue(
      pendingPayment({ status: "PAID", providerPaymentId: "pi_1" }),
    );
    await handlePaymentWebhook("stripe", "s1", "{}", {});
    expect(orders.markOrderPaid).toHaveBeenCalledWith(
      "o1",
      expect.objectContaining({ paymentId: "pi_1", amount: 100 }),
    );
    expect(orders.addOrderEvent).not.toHaveBeenCalled();
  });

  test("is left alone once the order is paid", async () => {
    gateway.fetchState.mockResolvedValue(paidState());
    db.shopPayment.updateMany.mockResolvedValue({ count: 0 });
    db.shopPayment.findUnique.mockResolvedValue(pendingPayment({ status: "PAID" }));
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      total: "100.00",
      currency: "USD",
      paymentStatus: "PAID",
    });
    await refreshPendingPayment(ORDER);
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("the refresh looks at it as well as pending links", async () => {
    gateway.fetchState.mockResolvedValue(paidState());
    await refreshPendingPayment(ORDER);
    expect(db.shopPayment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { status: "PENDING" },
            expect.objectContaining({ status: "PAID", order: expect.anything() }),
          ],
        }),
      }),
    );
  });
});

describe("a three-decimal currency", () => {
  test("settles an order paid in full", async () => {
    db.shopPayment.findFirst.mockResolvedValue(
      pendingPayment({ amount: "12.34", currency: "KWD" }),
    );
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({
      id: "o1",
      total: "12.34",
      currency: "KWD",
      paymentStatus: "PENDING",
    });
    const { fromMinorUnits } = await import("../money.js");
    gateway.fetchState.mockResolvedValue(
      paidState(fromMinorUnits(12340, "KWD"), { currency: "KWD" }),
    );
    await refreshPendingPayment(ORDER);
    expect(orders.markOrderPaid).toHaveBeenCalledWith(
      "o1",
      expect.objectContaining({ amount: 12.34 }),
    );
  });

  test("does not settle one paid a tenth of the price", async () => {
    db.shopPayment.findFirst.mockResolvedValue(
      pendingPayment({ amount: "12.34", currency: "KWD" }),
    );
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({
      id: "o1",
      total: "12.34",
      currency: "KWD",
      paymentStatus: "PENDING",
    });
    gateway.fetchState.mockResolvedValue(paidState(1.234, { currency: "KWD" }));
    await refreshPendingPayment(ORDER);
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
    expect(orders.addOrderEvent).toHaveBeenCalledWith(
      "o1",
      "underpaid",
      expect.any(String),
      expect.anything(),
    );
  });
});

describe("setup test orders", () => {
  const testOrder = {
    id: "o1",
    orgId: "org",
    number: 1001,
    total: "20.00",
    currency: "USD",
    status: "DRAFT",
    paymentStatus: "UNPAID",
    source: "test",
    checkoutToken: "tok",
    store: { orgId: "org", name: "Shop", paymentLinkTtlHours: 24 },
  };

  test("can't be paid through a live gateway", async () => {
    db.shopOrder.findUnique.mockResolvedValue(testOrder);
    db.integration.findUnique.mockResolvedValue({
      ...account,
      credential: { apiKey: "sk_live", livemode: true },
    });
    await expect(createPaymentLink("o1")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(gateway.createLink).not.toHaveBeenCalled();
    expect(orders.reserveOrderBenefits).not.toHaveBeenCalled();
  });

  test("can be paid through a gateway in test mode", async () => {
    db.shopOrder.findUnique.mockResolvedValue(testOrder);
    db.integration.findUnique.mockResolvedValue({
      ...account,
      credential: { apiKey: "sk_test", livemode: false },
    });
    db.shopPayment.findMany.mockResolvedValue([]);
    gateway.createLink.mockResolvedValue({ url: "https://pay", providerRef: "cs_new" });
    db.$transaction.mockResolvedValue(undefined);
    await expect(createPaymentLink("o1")).resolves.toMatchObject({ url: "https://pay" });
  });

  test("can't be marked paid by hand", async () => {
    db.shopOrder.findUnique.mockResolvedValue(testOrder);
    await expect(markPaidManually("o1", "cash", "u1")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(db.shopPayment.create).not.toHaveBeenCalled();
  });
});

describe("refunds recorded by hand", () => {
  test("two at once can't refund more than was paid", async () => {
    const { refundOrder } = await import("./payments.service.js");
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      total: "100.00",
      currency: "USD",
      checkoutVia: "RATEUP",
      paymentStatus: "PAID",
    });
    db.shopPayment.findFirst.mockResolvedValue(
      pendingPayment({ provider: "cash", status: "PAID", providerPaymentId: null }),
    );
    db.shopPayment.findUniqueOrThrow.mockResolvedValue(
      pendingPayment({ provider: "cash", status: "PAID" }),
    );
    // The other refund landed between the check and this write.
    db.shopPayment.updateMany.mockResolvedValue({ count: 0 });
    await expect(refundOrder("o1", 60, "u1")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.shopPayment.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", refundedAmount: { lte: 40.01 } },
      data: { refundedAmount: { increment: 60 } },
    });
    expect(db.shopOrder.update).not.toHaveBeenCalled();
  });
});
