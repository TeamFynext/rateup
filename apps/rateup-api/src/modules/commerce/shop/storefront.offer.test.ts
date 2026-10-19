import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn() },
  shopCollection: { findMany: vi.fn() },
  shopProduct: { findMany: vi.fn() },
  whatsappSettings: { findFirst: vi.fn() },
  org: { findUnique: vi.fn() },
  shopDiscount: { findFirst: vi.fn() },
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/cache.js", () => ({ withCache: vi.fn() }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { status: "ready" } }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("./store.service.js", () => ({ commerceEnabled: vi.fn(async () => true) }));

const { getStorefront } = await import("./storefront.service.js");

const store = {
  id: "s1",
  orgId: "org",
  slug: "fern",
  name: "Fern & Field",
  currency: "USD",
  storefrontEnabled: true,
  storefrontTheme: null,
  checkoutVia: "RATEUP",
};

beforeEach(() => {
  vi.clearAllMocks();
  db.shopCollection.findMany.mockResolvedValue([]);
  db.shopProduct.findMany.mockResolvedValue([]);
  db.whatsappSettings.findFirst.mockResolvedValue(null);
  db.org.findUnique.mockResolvedValue({ name: "Fern & Field" });
  db.shopDiscount.findFirst.mockResolvedValue({
    code: "WELCOME10",
    type: "PERCENTAGE",
    value: 10,
    endsAt: null,
  });
});

describe("the storefront's offer strip", () => {
  test("advertises a RateUp code when RateUp takes the payment", async () => {
    db.shopStore.findUnique.mockResolvedValue(store);
    const { store: shown } = await getStorefront("fern");
    expect(shown.highlight?.code).toBe("WELCOME10");
  });

  test.each(["SHOPIFY", "WOOCOMMERCE"])(
    "advertises nothing when customers pay on the %s checkout",
    async (checkoutVia) => {
      db.shopStore.findUnique.mockResolvedValue({ ...store, checkoutVia });
      const { store: shown } = await getStorefront("fern");
      expect(shown.highlight).toBeNull();
      expect(db.shopDiscount.findFirst).not.toHaveBeenCalled();
    },
  );
});

describe("what the storefront sells while checkout is in the store", () => {
  test("only the store's own products, since RateUp's can't be paid for there", async () => {
    db.shopStore.findUnique.mockResolvedValue({ ...store, checkoutVia: "SHOPIFY" });
    await getStorefront("fern");
    expect(db.shopProduct.findMany.mock.calls[0][0].where).toMatchObject({
      externalSource: "shopify",
    });
  });

  test("everything active when RateUp takes the payment", async () => {
    db.shopStore.findUnique.mockResolvedValue(store);
    await getStorefront("fern");
    expect(db.shopProduct.findMany.mock.calls[0][0].where).not.toHaveProperty("externalSource");
  });
});
