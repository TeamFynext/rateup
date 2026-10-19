import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopVariant: { findFirst: vi.fn() },
  shopBackInStockRequest: { findUnique: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  shopOrder: { findUnique: vi.fn() },
  contact: { upsert: vi.fn() },
}));
const orders = vi.hoisted(() => ({ addOrderEvent: vi.fn(), cancelOrder: vi.fn() }));
const verify = vi.hoisted(() => ({
  customerReachable: vi.fn(() => true),
  startPhoneVerification: vi.fn(async () => ({ code: "RU-ABC234", waUrl: "https://wa.me/1" })),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({
  armShopReminder: vi.fn(),
  enqueueBackInStock: vi.fn(),
}));
vi.mock("./store.service.js", () => ({ commerceEnabled: vi.fn(async () => true) }));
vi.mock("./orders.service.js", () => orders);
vi.mock("./checkout.service.js", () => ({ continueChatCheckout: vi.fn() }));
vi.mock("./attribution.js", () => ({ chatAttribution: vi.fn() }));
vi.mock("./notify.js", () => ({ notificationSetting: vi.fn(), sendShopMessage: vi.fn() }));
vi.mock("./payments/payments.service.js", () => ({ refreshPendingPayment: vi.fn() }));
vi.mock("./phoneVerify.service.js", () => verify);

const { fireShopReminder, requestBackInStockFromStorefront, subscribeBackInStock } =
  await import("./recovery.service.js");

const soldOut = {
  id: "v1",
  title: "Large",
  trackInventory: true,
  stock: 0,
  allowBackorder: false,
  product: { orgId: "org", title: "Mug" },
};
const DAY = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
  db.shopVariant.findFirst.mockResolvedValue(soldOut);
  db.shopBackInStockRequest.findUnique.mockResolvedValue(null);
  db.shopBackInStockRequest.count.mockResolvedValue(0);
});

describe("asking to hear about a restock", () => {
  test("is refused for something in stock", async () => {
    db.shopVariant.findFirst.mockResolvedValue({ ...soldOut, stock: 4 });
    await expect(
      subscribeBackInStock({ storeId: "s1", variantId: "v1", contactId: "c1" }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(db.shopBackInStockRequest.upsert).not.toHaveBeenCalled();
  });

  test("only looks at active products, and storefront-visible ones from the storefront", async () => {
    await requestBackInStockFromStorefront({ id: "s1", orgId: "org" }, "v1");
    expect(db.shopVariant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product: { status: "ACTIVE", showOnStorefront: true },
        }),
      }),
    );
    expect(verify.startPhoneVerification).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: "back_in_stock", variantId: "v1" }),
    );
    expect(db.shopBackInStockRequest.upsert).not.toHaveBeenCalled();
  });

  test("does not sign a number up again soon after telling it", async () => {
    db.shopBackInStockRequest.findUnique.mockResolvedValue({
      notifiedAt: new Date(Date.now() - 2 * DAY),
    });
    await subscribeBackInStock({ storeId: "s1", variantId: "v1", contactId: "c1" });
    expect(db.shopBackInStockRequest.upsert).not.toHaveBeenCalled();
  });

  test("signs it up again once the cooldown has passed", async () => {
    db.shopBackInStockRequest.findUnique.mockResolvedValue({
      notifiedAt: new Date(Date.now() - 8 * DAY),
    });
    await subscribeBackInStock({ storeId: "s1", variantId: "v1", contactId: "c1" });
    expect(db.shopBackInStockRequest.upsert).toHaveBeenCalled();
  });

  test("caps how many products one contact waits for", async () => {
    db.shopBackInStockRequest.count.mockResolvedValue(20);
    await expect(
      subscribeBackInStock({ storeId: "s1", variantId: "v1", contactId: "c1" }),
    ).rejects.toMatchObject({ code: "LIMIT_REACHED" });
  });
});

describe("an unpaid bank transfer", () => {
  const order = (over: Record<string, unknown>) => ({
    id: "o1",
    paymentMethod: "bank",
    status: "OPEN",
    paymentStatus: "PENDING",
    store: {},
    items: [],
    payments: [],
    ...over,
  });

  test("is cancelled and restocked when the time runs out", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order({}));
    expect(await fireShopReminder("o1", "bank_expire", 0)).toBe("cancelled");
    expect(orders.cancelOrder).toHaveBeenCalledWith("o1", {
      reason: "Transfer not received in time",
    });
  });

  test("is left alone once paid", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order({ paymentStatus: "PAID" }));
    expect(await fireShopReminder("o1", "bank_expire", 0)).toBe("skipped");
    expect(orders.cancelOrder).not.toHaveBeenCalled();
  });
});

describe("reminders to a storefront number nobody proved", () => {
  test("are not sent", async () => {
    verify.customerReachable.mockReturnValue(false);
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "DRAFT",
      paymentStatus: "UNPAID",
      channel: "STOREFRONT",
      store: {},
      items: [],
      payments: [],
    });
    expect(await fireShopReminder("o1", "cart", 0)).toBe("skipped");
  });
});
