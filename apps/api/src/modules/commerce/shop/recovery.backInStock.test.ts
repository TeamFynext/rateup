import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopVariant: { findFirst: vi.fn(), findUnique: vi.fn() },
  shopBackInStockRequest: {
    findUnique: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
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
const notify = vi.hoisted(() => ({
  notificationSetting: vi.fn(() => ({ waTemplateId: null })),
  sendShopMessage: vi.fn(async () => ({ sent: true })),
}));
vi.mock("./notify.js", () => notify);
vi.mock("./payments/payments.service.js", () => ({ refreshPendingPayment: vi.fn() }));
vi.mock("./phoneVerify.service.js", () => verify);

const { fireShopReminder, requestBackInStockFromStorefront, runBackInStock, subscribeBackInStock } =
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
    orders.cancelOrder.mockResolvedValueOnce({ status: "CANCELLED" });
    expect(await fireShopReminder("o1", "bank_expire", 0)).toBe("cancelled");
    expect(orders.cancelOrder).toHaveBeenCalledWith("o1", {
      reason: "Transfer not received in time",
      onlyIf: {
        status: "OPEN",
        paymentStatus: { notIn: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
      },
    });
  });

  test("is left alone once paid", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order({ paymentStatus: "PAID" }));
    expect(await fireShopReminder("o1", "bank_expire", 0)).toBe("skipped");
    expect(orders.cancelOrder).not.toHaveBeenCalled();
  });
});

describe("an unconfirmed cash order", () => {
  const cod = {
    id: "o1",
    paymentMethod: "cod",
    status: "OPEN",
    paymentStatus: "COD_PENDING",
    confirmedAt: null,
    store: {},
    items: [],
    payments: [],
  };

  test("is cancelled at the deadline only if still unconfirmed under the lock", async () => {
    db.shopOrder.findUnique.mockResolvedValue(cod);
    orders.cancelOrder.mockResolvedValueOnce({ status: "CANCELLED" });
    expect(await fireShopReminder("o1", "cod_expire", 0)).toBe("cancelled");
    expect(orders.cancelOrder).toHaveBeenCalledWith("o1", {
      reason: "Not confirmed in time",
      onlyIf: { paymentStatus: "COD_PENDING", confirmedAt: null, status: "OPEN" },
    });
  });

  test("a confirm that lands as the deadline fires wins", async () => {
    db.shopOrder.findUnique.mockResolvedValue(cod);
    orders.cancelOrder.mockResolvedValueOnce({ status: "OPEN" });
    expect(await fireShopReminder("o1", "cod_expire", 0)).toBe("skipped");
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

describe("telling subscribers about a restock", () => {
  const restocked = {
    id: "v1",
    title: "Large",
    trackInventory: true,
    stock: 3,
    product: { status: "ACTIVE", title: "Mug", store: { orgId: "org", name: "Shop" } },
  };
  const rows = [
    { id: "r1", channel: "WHATSAPP", contactId: "c1" },
    { id: "r2", channel: "WHATSAPP", contactId: "c2" },
  ];

  test("claims each row before sending, so a row another job claimed is skipped", async () => {
    db.shopVariant.findUnique.mockResolvedValue(restocked);
    db.shopBackInStockRequest.findMany.mockResolvedValue(rows);
    db.shopBackInStockRequest.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const result = await runBackInStock("v1");
    expect(db.shopBackInStockRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", notifiedAt: null },
      data: { notifiedAt: expect.any(Date) },
    });
    expect(notify.sendShopMessage).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  test("two overlapping runs message each person once", async () => {
    db.shopVariant.findUnique.mockResolvedValue(restocked);
    db.shopBackInStockRequest.findMany.mockResolvedValue(rows);
    const claimed = new Set<string>();
    db.shopBackInStockRequest.updateMany.mockImplementation(async ({ where }) => {
      if (claimed.has(where.id)) return { count: 0 };
      claimed.add(where.id);
      return { count: 1 };
    });
    await Promise.all([runBackInStock("v1"), runBackInStock("v1")]);
    expect(notify.sendShopMessage).toHaveBeenCalledTimes(2);
  });
});
