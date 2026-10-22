import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({ shopOrder: { findUnique: vi.fn() } }));
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
  prepareDraftForPayment: vi.fn(),
  repriceOrder: vi.fn(),
}));
const verify = vi.hoisted(() => ({
  assertOfflineOrderAllowed: vi.fn(),
  customerReachable: (o: { channel: string; phoneVerifiedAt: Date | null; paidAt: Date | null }) =>
    o.channel !== "STOREFRONT" || Boolean(o.phoneVerifiedAt || o.paidAt),
  startPhoneVerification: vi.fn(async () => ({
    code: "RU-ABC234",
    waUrl: "https://wa.me/15550199",
    expiresAt: new Date(),
  })),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ armShopReminder: vi.fn() }));
vi.mock("../../whatsapp/catalog/catalogSettings.service.js", () => ({
  sendAddressFlowToCustomer: vi.fn(),
}));
vi.mock("./events.js", () => ({ checkoutUrl: (t: string) => `https://shop.test/c/${t}` }));
vi.mock("./notify.js", () => ({ sendShopMessage: vi.fn() }));
vi.mock("./orders.service.js", () => orders);
vi.mock("./payments/payments.service.js", () => ({
  createPaymentLink: vi.fn(async () => ({ url: "https://pay.test" })),
  pickProvider: vi.fn(),
  refreshPendingPayment: vi.fn(),
}));
vi.mock("./store.service.js", () => ({
  commerceEnabled: vi.fn(async () => true),
  getOrCreateStore: vi.fn(),
  ratesForDestination: vi.fn(async () => []),
}));
vi.mock("./phoneVerify.service.js", () => verify);

const { payPublicCheckout } = await import("./checkout.service.js");

const draft = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  storeId: "s1",
  number: 1001,
  status: "DRAFT",
  paymentStatus: "UNPAID",
  channel: "STOREFRONT",
  phoneVerifiedAt: null,
  paidAt: null,
  customerPhone: "15550100",
  total: "20.00",
  shippingAddress: { line1: "1 Main St" },
  store: { askAddress: true, codEnabled: true, bankTransferEnabled: true },
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("a storefront order paid offline", () => {
  test.each(["cod", "bank"] as const)("by %s waits for the number to be confirmed", async (m) => {
    db.shopOrder.findUnique.mockResolvedValue(draft());
    const result = await payPublicCheckout("tok", m);
    expect(result).toMatchObject({ status: "verify", waUrl: "https://wa.me/15550199" });
    expect(verify.startPhoneVerification).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: "checkout", orderId: "o1", method: m }),
    );
    expect(orders.placeOrder).not.toHaveBeenCalled();
  });

  test("a free order waits too, since placing it messages the number", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft({ total: "0" }));
    expect(await payPublicCheckout("tok", "online")).toMatchObject({ status: "verify" });
    expect(orders.markOrderPaid).not.toHaveBeenCalled();
  });

  test("a card payment does not, the payment being its own proof", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft());
    expect(await payPublicCheckout("tok", "online")).toEqual({
      status: "redirect",
      url: "https://pay.test",
    });
    expect(verify.startPhoneVerification).not.toHaveBeenCalled();
  });

  test("once confirmed it is placed, within the per-number cap", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft({ phoneVerifiedAt: new Date() }));
    expect(await payPublicCheckout("tok", "cod")).toEqual({ status: "placed" });
    expect(verify.assertOfflineOrderAllowed).toHaveBeenCalledWith("s1", "15550100");
    expect(orders.placeOrder).toHaveBeenCalledWith("o1", {
      paymentMethod: "cod",
      codPending: true,
    });
  });

  test("a method the store doesn't offer is refused before any WhatsApp step", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({ store: { askAddress: true, codEnabled: false, bankTransferEnabled: false } }),
    );
    await expect(payPublicCheckout("tok", "cod")).rejects.toMatchObject({
      code: "PAYMENT_UNAVAILABLE",
    });
    expect(verify.startPhoneVerification).not.toHaveBeenCalled();
  });
});
