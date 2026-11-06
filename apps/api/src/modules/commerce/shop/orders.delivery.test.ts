import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopOrder: { findUnique: vi.fn(), update: vi.fn() },
  shopShippingRate: { count: vi.fn() },
}));
const store = vi.hoisted(() => ({
  getStoreById: vi.fn(async () => ({ id: "s1", taxRate: null, pricesIncludeTax: false })),
  nextOrderNumber: vi.fn(),
  ratesForDestination: vi.fn(),
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

const { assertDeliveryChosen, repriceOrder } = await import("./orders.service.js");

const rate = (id: string, price = "5.00") => ({
  id,
  name: id,
  price,
  freeOver: null,
  minDays: null,
  maxDays: null,
});

const draft = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  storeId: "s1",
  status: "DRAFT",
  contactId: null,
  pointsRedeemed: 0,
  discountCode: null,
  items: [{ variantId: null, productId: "p1", unitPrice: "20.00", quantity: 1, variant: null }],
  shippingAddress: { line1: "1 Main St", country: "US" },
  shippingRate: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.shopOrder.update.mockImplementation(async ({ data }) => data);
});

describe("repricing keeps delivery honest", () => {
  test("a rate that no longer serves the new address is dropped, not kept at its old price", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({ shippingRate: { rateId: "us", name: "US", price: 5 } }),
    );
    store.ratesForDestination.mockResolvedValue([rate("ca"), rate("ca-express")]);

    const data = await repriceOrder("o1", {
      shippingAddress: { line1: "2 Elm St", country: "CA" },
    });

    expect(data.shippingRate).not.toMatchObject({ rateId: "us" });
    expect(data.shippingTotal).toBe(0);
  });

  test("when only one rate serves the new address it is picked", async () => {
    db.shopOrder.findUnique.mockResolvedValue(
      draft({ shippingRate: { rateId: "us", name: "US", price: 5 } }),
    );
    store.ratesForDestination.mockResolvedValue([rate("ca", "8.00")]);

    const data = await repriceOrder("o1", {
      shippingAddress: { line1: "2 Elm St", country: "CA" },
    });

    expect(data.shippingRate).toMatchObject({ rateId: "ca", price: 8 });
  });
});

describe("taking payment needs a delivery option when the store charges for delivery", () => {
  const charging = { askDelivery: true };

  test("no option picked is refused", async () => {
    db.shopShippingRate.count.mockResolvedValue(2);
    store.ratesForDestination.mockResolvedValue([rate("std"), rate("exp")]);

    await expect(assertDeliveryChosen(draft() as never, charging)).rejects.toMatchObject({
      code: "INVALID",
      message: "Pick a delivery option first",
    });
  });

  test("a country no rate serves is refused by name", async () => {
    db.shopShippingRate.count.mockResolvedValue(1);
    store.ratesForDestination.mockResolvedValue([]);

    await expect(
      assertDeliveryChosen(
        draft({ shippingAddress: { line1: "x", country: "FR" } }) as never,
        charging,
      ),
    ).rejects.toMatchObject({ message: "We don't deliver to France" });
  });

  test("a stale pick for another destination is refused", async () => {
    db.shopShippingRate.count.mockResolvedValue(2);
    store.ratesForDestination.mockResolvedValue([rate("ca")]);

    await expect(
      assertDeliveryChosen(draft({ shippingRate: { rateId: "us" } }) as never, charging),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  test("a valid pick passes", async () => {
    db.shopShippingRate.count.mockResolvedValue(2);
    store.ratesForDestination.mockResolvedValue([rate("std"), rate("exp")]);

    await expect(
      assertDeliveryChosen(draft({ shippingRate: { rateId: "exp" } }) as never, charging),
    ).resolves.toBeUndefined();
  });

  test("a store with no rates, or that doesn't ask for delivery, needs nothing", async () => {
    db.shopShippingRate.count.mockResolvedValue(0);
    await expect(assertDeliveryChosen(draft() as never, charging)).resolves.toBeUndefined();

    await expect(
      assertDeliveryChosen(draft() as never, { askDelivery: false }),
    ).resolves.toBeUndefined();
    expect(store.ratesForDestination).not.toHaveBeenCalled();
  });
});
