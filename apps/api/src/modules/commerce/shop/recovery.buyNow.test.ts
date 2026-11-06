import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const orders = vi.hoisted(() => ({ createDraftOrder: vi.fn() }));
const attribution = vi.hoisted(() => ({ chatAttribution: vi.fn() }));
const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn(async () => ({ id: "s1", orgId: "org", slug: "fern" })) },
  shopOrder: { findFirst: vi.fn(), findUnique: vi.fn() },
  shopVariant: { findUnique: vi.fn() },
}));
const checkout = vi.hoisted(() => ({ continueChatCheckout: vi.fn() }));
const payments = vi.hoisted(() => ({ refreshPendingPayment: vi.fn() }));
const notify = vi.hoisted(() => ({
  notificationSetting: vi.fn(() => ({})),
  sendShopMessage: vi.fn(async () => ({ sent: true })),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({
  armShopReminder: vi.fn(),
  enqueueBackInStock: vi.fn(),
}));
vi.mock("./store.service.js", () => ({ commerceEnabled: vi.fn(async () => true) }));
vi.mock("./orders.service.js", () => ({ ...orders, addOrderEvent: vi.fn(), cancelOrder: vi.fn() }));
vi.mock("./checkout.service.js", () => checkout);
vi.mock("./attribution.js", () => attribution);
vi.mock("./notify.js", () => notify);
vi.mock("./payments/payments.service.js", () => payments);
vi.mock("./phoneVerify.service.js", () => ({
  customerReachable: () => true,
  startPhoneVerification: vi.fn(),
}));

const { buyNowFromChat, fireShopReminder } = await import("./recovery.service.js");

const from = { orgId: "org", contactId: "c1", channel: "INSTAGRAM" as const };

beforeEach(() => {
  vi.clearAllMocks();
  orders.createDraftOrder.mockResolvedValue({ id: "o1" });
  attribution.chatAttribution.mockResolvedValue(null);
  db.shopOrder.findFirst.mockResolvedValue(null);
});

describe("Buy now from a chat", () => {
  test("credits the Instagram comment that brought the customer", async () => {
    const comment = { kind: "ig_comment", mediaId: "m1" };
    attribution.chatAttribution.mockResolvedValue(comment);
    await buyNowFromChat("v1", 1, from);
    expect(orders.createDraftOrder).toHaveBeenCalledWith(
      expect.objectContaining({ source: "ig_comment", attribution: comment }),
    );
  });

  test("is a DM sale from a product card with nothing else to credit", async () => {
    await buyNowFromChat("v1", 1, from);
    expect(orders.createDraftOrder.mock.calls[0][0].source).toBe("ig_dm");
  });

  test("is a back-in-stock sale from that message's button", async () => {
    await buyNowFromChat("v1", 1, { ...from, channel: "WHATSAPP" }, "back_in_stock");
    expect(orders.createDraftOrder.mock.calls[0][0].source).toBe("back_in_stock");
  });
});

describe("tapping Buy now again", () => {
  test("picks the open checkout back up instead of starting another", async () => {
    db.shopOrder.findFirst.mockResolvedValue({ id: "open-1" });
    await buyNowFromChat("v1", 1, from);
    expect(orders.createDraftOrder).not.toHaveBeenCalled();
    expect(checkout.continueChatCheckout).toHaveBeenCalledWith("open-1");
    expect(db.shopOrder.findFirst.mock.calls[0][0].where).toMatchObject({
      contactId: "c1",
      status: "DRAFT",
      items: { some: { variantId: "v1" } },
    });
  });

  test("starts a fresh checkout when the customer has none open", async () => {
    await buyNowFromChat("v1", 1, from);
    expect(orders.createDraftOrder).toHaveBeenCalledTimes(1);
    expect(checkout.continueChatCheckout).toHaveBeenCalledWith("o1");
  });
});

describe("cart reminders", () => {
  const draft = (expiresInMs: number) => ({
    id: "o1",
    orgId: "org",
    storeId: "s1",
    status: "DRAFT",
    paymentStatus: "PENDING",
    channel: "WHATSAPP",
    checkoutToken: "tok",
    checkoutExpiresAt: new Date(Date.now() + expiresInMs),
    items: [{ quantity: 1 }],
    payments: [],
    store: { name: "Fern", cartReminderMinutes: [60], notifications: null },
  });

  test("don't nudge a customer about a checkout that has expired", async () => {
    db.shopOrder.findUnique.mockResolvedValue(draft(-60_000));
    await expect(fireShopReminder("o1", "cart", 0)).resolves.toBe("expired");
    expect(notify.sendShopMessage).not.toHaveBeenCalled();
  });
});

describe("when Buy now can't go through", () => {
  const variant = (extra: Record<string, unknown> = {}) => ({
    stock: 3,
    trackInventory: true,
    allowBackorder: false,
    product: { status: "ACTIVE" },
    ...extra,
  });
  const told = () => (notify.sendShopMessage.mock.calls[0] as unknown[])[1] as { text: string };

  test("says sold out only when it is", async () => {
    orders.createDraftOrder.mockRejectedValue(new Error("x"));
    db.shopVariant.findUnique.mockResolvedValue(variant({ stock: 0 }));
    await buyNowFromChat("v1", 1, from);
    expect(told().text).toMatch(/^Sorry, that just sold out/);
  });

  test("says it's no longer available when the product is gone", async () => {
    orders.createDraftOrder.mockRejectedValue(new Error("x"));
    db.shopVariant.findUnique.mockResolvedValue(variant({ product: { status: "ARCHIVED" } }));
    await buyNowFromChat("v1", 1, from);
    expect(told().text).toMatch(/^Sorry, that's no longer available/);
  });

  test("otherwise offers help, rather than blaming stock", async () => {
    orders.createDraftOrder.mockResolvedValue({ id: "o1" });
    checkout.continueChatCheckout.mockRejectedValue(new Error("store down"));
    db.shopVariant.findUnique.mockResolvedValue(variant());
    await buyNowFromChat("v1", 1, from);
    expect(told().text).toBe(
      "Sorry, checkout isn't available right now. Reply here and we'll help you order.",
    );
  });
});
