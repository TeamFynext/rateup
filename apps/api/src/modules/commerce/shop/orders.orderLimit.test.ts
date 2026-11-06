import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => {
  const db = {
    shopOrder: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    shopOrderItem: { update: vi.fn() },
    shopVariant: { findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    shopInventoryMovement: { create: vi.fn() },
    shopOrderEvent: { create: vi.fn() },
    shopPayment: { updateMany: vi.fn() },
    shopDropClaim: { findFirst: vi.fn(), deleteMany: vi.fn() },
    ruleAction: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return db;
});
const limits = vi.hoisted(() => ({ checkPlanLimit: vi.fn() }));
const alerts = vi.hoisted(() => ({ maybeNotifyOrderUsage: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ enqueueCatalogPublish: vi.fn() }));
vi.mock("../../notification/notify.js", () => ({ notify: vi.fn() }));
vi.mock("../../subscription/planLimits.js", () => limits);
vi.mock("../../subscription/limitAlerts.js", () => alerts);
vi.mock("./events.js", () => ({ onShopOrderEvent: vi.fn() }));
vi.mock("./attribution.js", () => ({ adAttribution: vi.fn() }));
vi.mock("./shopLoyalty.js", () => ({
  pointsOffer: vi.fn(),
  refundSpentPoints: vi.fn(),
  returnSpentPoints: vi.fn(),
  reverseEarnedPoints: vi.fn(),
  spendPoints: vi.fn(),
}));
vi.mock("./discounts.service.js", () => ({
  redeemDiscount: vi.fn(),
  releaseDiscount: vi.fn(),
  resolveDiscount: vi.fn(),
  ruleOf: vi.fn(),
}));
vi.mock("./products.service.js", () => ({ adjustStock: vi.fn(), afterStockChange: vi.fn() }));
vi.mock("./payments/payments.service.js", () => ({ closeOpenLinks: vi.fn() }));
vi.mock("./store.service.js", () => ({
  getStoreById: vi.fn(async () => ({ id: "s1", taxRate: null, pricesIncludeTax: false })),
  nextOrderNumber: vi.fn(),
  ratesForDestination: vi.fn(async () => []),
}));

const { placeOrder } = await import("./orders.service.js");
const { ORDER_LIMIT_MESSAGE } = await import("./orderAllowance.js");

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  orgId: "org",
  source: "wa_cart",
  status: "DRAFT",
  checkoutVia: "RATEUP",
  checkoutExpiresAt: null,
  items: [],
  discountId: null,
  discountCode: null,
  pointsRedeemed: 0,
  reservedAt: new Date(),
  paymentStatus: "UNPAID",
  currency: "USD",
  total: "20.00",
  ...over,
});
const allowance = (used: number, max = 50) => ({
  metered: true,
  max,
  used,
  remaining: Math.max(max - used, 0),
  exceeded: used >= max,
});
/** The month's count the locked counter hands back. */
const counted = (count: number) => db.$queryRaw.mockResolvedValue([{ count }]);
const counterWrites = () =>
  db.$queryRaw.mock.calls.filter((call) => String(call[0]).includes('"shopOrdersCount"'));

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  db.shopOrder.findUnique.mockResolvedValue(order());
  db.shopOrder.findUniqueOrThrow.mockResolvedValue(order());
  db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
  db.shopOrder.update.mockResolvedValue(order({ status: "OPEN" }));
});

describe("the monthly order cap", () => {
  test("refuses an unpaid order once the month's orders are taken, before anything is held", async () => {
    limits.checkPlanLimit.mockResolvedValue(allowance(50));
    await expect(
      placeOrder("o1", { paymentMethod: "cod", codPending: true }),
    ).rejects.toMatchObject({
      code: "ORDER_LIMIT",
      message: ORDER_LIMIT_MESSAGE,
    });
    expect(db.shopOrder.updateMany).not.toHaveBeenCalled();
    expect(counterWrites()).toHaveLength(0);
  });

  test("never refuses a paid order: it is placed, counted and alerted on", async () => {
    limits.checkPlanLimit.mockResolvedValue(allowance(50));
    counted(51);
    const placed = await placeOrder("o1", { paymentMethod: "stripe", paid: true });
    expect(placed).toMatchObject({ status: "OPEN" });
    expect(counterWrites()).toHaveLength(1);
    expect(alerts.maybeNotifyOrderUsage).toHaveBeenCalledWith("org", 51, 50, expect.any(Date));
  });

  test("refuses the loser of a race for the last order, on the locked counter", async () => {
    limits.checkPlanLimit.mockResolvedValue(allowance(49));
    counted(51);
    await expect(placeOrder("o1", { paymentMethod: "bank" })).rejects.toMatchObject({
      code: "ORDER_LIMIT",
    });
    // Thrown inside the transaction, so the placement is rolled back; nothing follows it.
    const events = await import("./events.js");
    expect(events.onShopOrderEvent).not.toHaveBeenCalled();
  });

  test("counts last in the transaction, so the org's usage row is locked only until commit", async () => {
    limits.checkPlanLimit.mockResolvedValue(allowance(10));
    counted(11);
    await placeOrder("o1", { paymentMethod: "stripe", paid: true });
    const counter = db.$queryRaw.mock.invocationCallOrder.at(-1)!;
    expect(counter).toBeGreaterThan(db.shopOrder.update.mock.invocationCallOrder.at(-1)!);
    expect(counter).toBeGreaterThan(db.shopOrderEvent.create.mock.invocationCallOrder.at(-1)!);
  });

  test("counts an order once: a second placement finds it placed and counts nothing", async () => {
    limits.checkPlanLimit.mockResolvedValue(allowance(10));
    counted(11);
    await placeOrder("o1", { paymentMethod: "stripe", paid: true });
    db.shopOrder.findUnique.mockResolvedValue(order({ status: "OPEN" }));
    db.shopOrder.updateMany.mockResolvedValue({ count: 0 });
    await placeOrder("o1", { paymentMethod: "stripe", paid: true });
    expect(counterWrites()).toHaveLength(1);
  });

  test("a setup test order is neither counted nor refused", async () => {
    db.shopOrder.findUnique.mockResolvedValue(order({ source: "test" }));
    await placeOrder("o1", { paymentMethod: "stripe", paid: true });
    expect(limits.checkPlanLimit).not.toHaveBeenCalled();
    expect(counterWrites()).toHaveLength(0);
  });

  test("an unmetered plan still counts, but has nothing to alert on", async () => {
    limits.checkPlanLimit.mockResolvedValue({ metered: false, used: 0, exceeded: false });
    counted(3);
    await placeOrder("o1", { paymentMethod: "stripe", paid: true });
    expect(counterWrites()).toHaveLength(1);
    expect(alerts.maybeNotifyOrderUsage).toHaveBeenCalledWith(
      "org",
      3,
      undefined,
      expect.any(Date),
    );
  });
});
