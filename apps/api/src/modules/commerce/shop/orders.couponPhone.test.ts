import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopOrder: { findUnique: vi.fn(), update: vi.fn() },
  shopShippingRate: { count: vi.fn() },
}));
const store = vi.hoisted(() => ({
  getStoreById: vi.fn(async () => ({
    id: "s1",
    taxRate: null,
    pricesIncludeTax: false,
    allowCoupons: true,
  })),
  nextOrderNumber: vi.fn(),
  ratesForDestination: vi.fn(async () => []),
}));
const discounts = vi.hoisted(() => ({
  resolveDiscount: vi.fn(),
  redeemDiscount: vi.fn(),
  releaseDiscount: vi.fn(),
  discountAmount: vi.fn(() => 20),
  DiscountRefused: class extends Error {},
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ enqueueCatalogPublish: vi.fn() }));
vi.mock("./events.js", () => ({ onShopOrderEvent: vi.fn() }));
vi.mock("./attribution.js", () => ({ adAttribution: vi.fn() }));
vi.mock("./shopLoyalty.js", () => ({
  pointsOffer: vi.fn(),
  refundSpentPoints: vi.fn(),
  reverseEarnedPoints: vi.fn(),
  spendPoints: vi.fn(),
}));
vi.mock("./products.service.js", () => ({ adjustStock: vi.fn(), afterStockChange: vi.fn() }));
vi.mock("./store.service.js", () => store);
vi.mock("./discounts.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...discounts,
}));

const { repriceOrder } = await import("./orders.service.js");

const FRESH = "+919876543210";
const USED = "+919812345678";

beforeEach(() => {
  vi.clearAllMocks();
  db.shopOrder.update.mockImplementation(async ({ data }) => data);
  db.shopOrder.findUnique.mockResolvedValue({
    id: "o1",
    storeId: "s1",
    status: "DRAFT",
    contactId: null,
    customerPhone: FRESH,
    pointsRedeemed: 0,
    discountCode: "ONCE",
    items: [{ variantId: null, productId: "p1", unitPrice: "400.00", quantity: 1, variant: null }],
    shippingAddress: null,
    shippingRate: null,
  });
  // The code is spent for USED and free for anyone else.
  discounts.resolveDiscount.mockImplementation(async (_s, _c, ctx: { phone?: string }) => {
    if (ctx.phone === USED) throw new Error("You've already used that code");
    return {
      discount: { id: "d1", code: "ONCE" },
      rule: { type: "FIXED", value: 20 },
      scope: { appliesTo: "ALL", collectionIds: [], productIds: [] },
    };
  });
});

describe("switching the phone after a once-per-customer code is applied", () => {
  test("re-checks the code against the new number and drops it", async () => {
    const data = await repriceOrder("o1", { customer: { phone: USED } });
    expect(discounts.resolveDiscount).toHaveBeenCalledWith(
      "s1",
      "ONCE",
      expect.objectContaining({ phone: USED }),
    );
    expect(data.discountCode).toBeNull();
  });

  test("keeps it for a number that hasn't used it", async () => {
    const data = await repriceOrder("o1", { customer: { phone: "+919800000000" } });
    expect(data.discountCode).toBe("ONCE");
  });
});
