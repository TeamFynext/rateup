import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

// Unmetered plan: the monthly order cap has its own tests (orders.orderLimit.test.ts).
vi.mock("../../subscription/planLimits.js", () => ({
  checkPlanLimit: vi.fn(async () => ({ metered: false, used: 0, exceeded: false })),
}));
vi.mock("../../subscription/shopOrders.js", () => ({ countPlacedOrder: vi.fn(async () => 1) }));
vi.mock("../../subscription/limitAlerts.js", () => ({ maybeNotifyOrderUsage: vi.fn() }));

const db = vi.hoisted(() => {
  const db = {
    shopOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    shopVariant: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    contact: { findUnique: vi.fn() },
    shopInventoryMovement: { create: vi.fn() },
    shopOrderEvent: { create: vi.fn() },
    shopDiscount: { findUnique: vi.fn() },
    shopDropClaim: { findFirst: vi.fn(), deleteMany: vi.fn() },
    ruleAction: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  return db;
});
const events = vi.hoisted(() => ({ onShopOrderEvent: vi.fn() }));
const loyalty = vi.hoisted(() => ({
  pointsOffer: vi.fn(),
  refundSpentPoints: vi.fn(),
  reverseEarnedPoints: vi.fn(),
  spendPoints: vi.fn(),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ enqueueCatalogPublish: vi.fn() }));
vi.mock("./events.js", () => events);
const attribution = vi.hoisted(() => ({ adAttribution: vi.fn() }));
vi.mock("./attribution.js", () => attribution);
vi.mock("./shopLoyalty.js", () => loyalty);
vi.mock("./products.service.js", () => ({ adjustStock: vi.fn(), afterStockChange: vi.fn() }));
vi.mock("./store.service.js", () => ({
  getStoreById: vi.fn(async () => ({ id: "s1", taxRate: "10.00", pricesIncludeTax: false })),
  nextOrderNumber: vi.fn(),
  ratesForDestination: vi.fn(),
}));

const { applyPrepaidDiscount, createDraftOrder, markOrderPaid, placeOrder, pointsOfferForOrder } =
  await import("./orders.service.js");

const item = {
  id: "i1",
  variantId: null,
  productId: "p1",
  unitPrice: "90.00",
  quantity: 1,
  variant: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
});

describe("placing an order", () => {
  test("a second caller finds it already placed and sends nothing", async () => {
    db.shopOrder.updateMany.mockResolvedValue({ count: 0 });
    db.shopOrder.findUnique.mockResolvedValue({ id: "o1", status: "OPEN", items: [] });
    const result = await placeOrder("o1", { paymentMethod: "stripe" });
    expect(result).toMatchObject({ alreadyPlaced: true });
    expect(db.shopOrder.update).not.toHaveBeenCalled();
    expect(events.onShopOrderEvent).not.toHaveBeenCalled();
  });

  test("the claim is a conditional update on a draft", async () => {
    db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      items: [],
      discountId: null,
      pointsRedeemed: 0,
      paymentStatus: "PENDING",
    });
    db.shopOrder.update.mockResolvedValue({ id: "o1", items: [] });
    await placeOrder("o1", { paymentMethod: "stripe" });
    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: "o1", status: "DRAFT" },
      data: { status: "OPEN" },
    });
    expect(events.onShopOrderEvent).toHaveBeenCalledWith("o1", "placed");
  });
});

describe("marking an order paid", () => {
  test("of two confirmations, only the one that flips the status announces it", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      paymentStatus: "PENDING",
    });
    db.shopOrder.updateMany.mockResolvedValue({ count: 0 });
    db.shopOrder.findUniqueOrThrow.mockResolvedValue({
      id: "o1",
      paymentStatus: "PAID",
      currency: "USD",
      total: "10",
    });
    await markOrderPaid("o1", { provider: "stripe" });
    expect(db.shopOrderEvent.create).not.toHaveBeenCalled();
    expect(events.onShopOrderEvent).not.toHaveBeenCalled();
  });
});

describe("cash to online at a discount", () => {
  const order = {
    id: "o1",
    storeId: "s1",
    contactId: "c1",
    total: "110.00",
    currency: "USD",
    pointsDiscount: "0",
    discountId: null,
    shippingRate: { rateId: "r1", name: "Standard", price: 10 },
    items: [item],
  };

  test("takes the percent off the goods only and recomputes tax", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order);
    db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
    const result = await applyPrepaidDiscount("o1", 10);
    // goods 90 − 9 = 81, + shipping 10 = 91, + 10% tax 9.10 = 100.10
    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: "o1", paymentStatus: "COD_PENDING", confirmedAt: null },
      data: expect.objectContaining({
        discountTotal: 9,
        shippingTotal: 10,
        taxTotal: 9.1,
        total: 100.1,
        paymentStatus: "PENDING",
      }),
    });
    expect(result?.saved).toBe(9.9);
  });

  test("a double tap applies it once", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order);
    db.shopOrder.updateMany.mockResolvedValue({ count: 0 });
    expect(await applyPrepaidDiscount("o1", 10)).toBeNull();
  });
});

describe("points offer", () => {
  test("is based on goods after the coupon, ignoring a free-shipping saving", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      id: "o1",
      storeId: "s1",
      contactId: "c1",
      discountId: "d1",
      items: [item],
    });
    db.shopDiscount.findUnique.mockResolvedValue({
      type: "FREE_SHIPPING",
      value: null,
      appliesTo: "ALL",
      collectionIds: [],
      productIds: [],
    });
    await pointsOfferForOrder("o1");
    expect(loyalty.pointsOffer).toHaveBeenLastCalledWith(expect.anything(), "c1", 90, 0);

    db.shopDiscount.findUnique.mockResolvedValue({
      type: "PERCENTAGE",
      value: "10",
      appliesTo: "ALL",
      collectionIds: [],
      productIds: [],
    });
    await pointsOfferForOrder("o1");
    expect(loyalty.pointsOffer).toHaveBeenLastCalledWith(expect.anything(), "c1", 81, 0);
  });
});

describe("an order from someone who clicked an ad", () => {
  const store = { id: "s1", orgId: "org", currency: "USD", paymentLinkTtlHours: 24 } as never;
  const ad = { kind: "ctwa_ad", adId: "ad-1", ctwaClid: "clid-1" };
  const draft = async (input: Record<string, unknown>) => {
    db.shopVariant.findMany.mockResolvedValue([
      {
        id: "v1",
        productId: "p1",
        price: "10.00",
        title: "Default",
        product: { status: "ACTIVE", title: "Mug", images: [], collections: [] },
      },
    ]);
    db.contact.findUnique.mockResolvedValue(null);
    db.shopOrder.create.mockResolvedValue({ id: "o1" });
    db.shopOrder.findUnique.mockResolvedValue(null);
    await createDraftOrder({
      store,
      items: [{ variantId: "v1", quantity: 1 }],
      channel: "WHATSAPP",
      contactId: "c1",
      ...input,
    }).catch(() => undefined);
    return db.shopOrder.create.mock.calls[0][0].data;
  };

  test("is credited to the ad, and a cart they sent names the ad as its source", async () => {
    attribution.adAttribution.mockResolvedValue(ad);
    const data = await draft({ source: "wa_cart" });
    expect(data).toMatchObject({ source: "ctwa_ad", attribution: ad });
  });

  test("keeps the agent as its source when an agent made it", async () => {
    attribution.adAttribution.mockResolvedValue(ad);
    const data = await draft({ source: "agent" });
    expect(data).toMatchObject({ source: "agent", attribution: ad });
  });

  test("keeps the source its caller named", async () => {
    const comment = { kind: "ig_comment", mediaId: "m1" };
    const data = await draft({ source: "ig_dm", attribution: comment });
    expect(attribution.adAttribution).not.toHaveBeenCalled();
    expect(data).toMatchObject({ source: "ig_dm", attribution: comment });
  });
});
