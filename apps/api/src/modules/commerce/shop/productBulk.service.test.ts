import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopVariant: { findMany: vi.fn(), update: vi.fn() },
  shopProduct: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
const products = vi.hoisted(() => ({
  adjustStock: vi.fn(),
  afterStockChange: vi.fn(),
  createProduct: vi.fn(),
  getProduct: vi.fn(),
}));
const queue = vi.hoisted(() => ({ enqueueCatalogPublish: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);
vi.mock("./products.service.js", () => products);

const { bulkEditVariants, duplicateProduct, planVariant } =
  await import("./productBulk.service.js");

const variant = (over: Record<string, unknown> = {}) => ({
  id: "v1",
  productId: "p1",
  title: "Default",
  price: 20,
  compareAtPrice: null,
  trackInventory: true,
  stock: 5,
  product: { id: "p1", title: "Mug", externalSource: null },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  products.adjustStock.mockImplementation(async (_tx, id: string, delta: number) => ({
    before: { id },
    after: { id, delta },
  }));
});

describe("planning one variant", () => {
  test("moves prices by a set value, a percent or an amount", () => {
    expect(planVariant(variant(), { variantIds: [], price: { mode: "set", value: 12 } })).toEqual({
      price: 12,
    });
    expect(
      planVariant(variant(), { variantIds: [], price: { mode: "percent", value: -15 } }),
    ).toEqual({ price: 17 });
    expect(
      planVariant(variant(), { variantIds: [], price: { mode: "amount", value: 2.5 } }),
    ).toEqual({ price: 22.5 });
  });

  test("leaves a variant alone when the result would make no sense", () => {
    expect(
      planVariant(variant(), { variantIds: [], price: { mode: "amount", value: -30 } }),
    ).toMatch(/below zero/);
    expect(
      planVariant(variant({ compareAtPrice: 25 }), {
        variantIds: [],
        price: { mode: "percent", value: 50 },
      }),
    ).toMatch(/original price/);
    expect(
      planVariant(variant({ trackInventory: false }), {
        variantIds: [],
        stock: { mode: "adjust", value: 3 },
      }),
    ).toMatch(/isn't counted/);
    expect(
      planVariant(variant(), { variantIds: [], stock: { mode: "adjust", value: -6 } }),
    ).toMatch(/below zero/);
  });

  test("setting stock on an uncounted variant starts counting from that number", () => {
    expect(
      planVariant(variant({ trackInventory: false, stock: 0 }), {
        variantIds: [],
        stock: { mode: "set", value: 8 },
      }),
    ).toEqual({ stock: { delta: 8, startTracking: true } });
    expect(planVariant(variant(), { variantIds: [], stock: { mode: "set", value: 2 } })).toEqual({
      stock: { delta: -3, startTracking: false },
    });
  });
});

describe("bulk editing", () => {
  test("logs stock through the movement log, republishes and skips store-mirrored products", async () => {
    db.shopVariant.findMany.mockResolvedValue([
      variant(),
      variant({
        id: "v2",
        productId: "p2",
        product: { id: "p2", title: "Lamp", externalSource: "shopify" },
      }),
    ]);
    const result = await bulkEditVariants(
      { id: "s1" },
      {
        variantIds: ["v1", "v2"],
        price: { mode: "set", value: 18 },
        stock: { mode: "adjust", value: 4 },
      },
      "u1",
    );
    expect(db.shopVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { price: 18 },
    });
    expect(products.adjustStock).toHaveBeenCalledWith(db, "v1", 4, "ADJUSTMENT", {
      userId: "u1",
      note: "Bulk edit",
    });
    expect(products.afterStockChange).toHaveBeenCalledTimes(1);
    expect(queue.enqueueCatalogPublish).toHaveBeenCalledWith("p1");
    expect(queue.enqueueCatalogPublish).not.toHaveBeenCalledWith("p2");
    expect(result).toEqual({
      updated: 1,
      skipped: [{ variant: "Lamp", reason: "Edit it in your online store" }],
    });
  });

  test("a status change reaches every selected product, mirrored ones included", async () => {
    db.shopVariant.findMany.mockResolvedValue([
      variant(),
      variant({
        id: "v2",
        productId: "p2",
        product: { id: "p2", title: "Lamp", externalSource: "shopify" },
      }),
    ]);
    const result = await bulkEditVariants(
      { id: "s1" },
      { variantIds: ["v1", "v2"], status: "DRAFT" },
    );
    expect(db.shopProduct.updateMany).toHaveBeenCalledWith({
      where: { storeId: "s1", id: { in: ["p1", "p2"] } },
      data: { status: "DRAFT", metaSyncStatus: "SYNCING" },
    });
    expect(queue.enqueueCatalogPublish).toHaveBeenCalledTimes(2);
    expect(result.skipped).toEqual([]);
  });

  test("needs something to change", async () => {
    await expect(bulkEditVariants({ id: "s1" }, { variantIds: ["v1"] })).rejects.toMatchObject({
      code: "INVALID",
    });
  });
});

describe("duplicating a product", () => {
  test("makes a draft copy with fresh stock and suffixed SKUs", async () => {
    products.getProduct.mockResolvedValue({
      id: "p1",
      title: "Mug",
      description: "Stoneware",
      brand: null,
      category: null,
      productUrl: null,
      images: ["https://img.test/mug.jpg"],
      options: [{ name: "Colour", values: ["Blue"] }],
      showOnWhatsapp: true,
      showOnInstagram: false,
      showOnFacebook: false,
      showOnStorefront: true,
      loyaltyMultiplier: 2,
      collections: [{ id: "c1" }],
      variants: [
        {
          title: "Blue",
          optionValues: { Colour: "Blue" },
          sku: "MUG-B",
          price: 14,
          compareAtPrice: null,
          trackInventory: true,
          stock: 9,
          lowStockAt: 2,
          allowBackorder: false,
          imageUrl: null,
          weightGrams: 300,
          retailerId: "MUG-B",
        },
      ],
    });
    await duplicateProduct({ id: "s1", orgId: "o1", mode: "NATIVE" }, "p1", "u1");
    const [, input] = products.createProduct.mock.calls[0];
    expect(input).toMatchObject({
      title: "Mug (copy)",
      status: "DRAFT",
      images: ["https://img.test/mug.jpg"],
      collectionIds: ["c1"],
      loyaltyMultiplier: 2,
    });
    expect(input.variants[0]).toMatchObject({ sku: "MUG-B-copy", stock: 0, trackInventory: true });
    expect(input.variants[0]).not.toHaveProperty("retailerId");
  });

  test("is refused when products come from an online store", async () => {
    await expect(
      duplicateProduct({ id: "s1", orgId: "o1", mode: "SHOPIFY" }, "p1"),
    ).rejects.toMatchObject({ code: "INVALID" });
  });
});
