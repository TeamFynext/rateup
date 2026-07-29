import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./product.service.js", () => ({
  createCatalogProductsBatch: vi.fn(),
  deleteCatalogProducts: vi.fn(),
  getCatalogProducts: vi.fn(),
  getShopifyProductsForCatalog: vi.fn(),
  importSelectedShopifyProducts: vi.fn(),
  syncCatalogProducts: vi.fn(),
  syncShopifyProductsToCatalog: vi.fn(),
  updateCatalogProducts: vi.fn(),
}));

vi.mock("../../../integrations/shopify/shopify.service.js", () => ({
  createShopifyProduct: vi.fn(),
}));

vi.mock("../catalog.service.js", () => ({ getWaCatalog: vi.fn() }));

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  createCatalogProductsBatch,
  deleteCatalogProducts,
  getCatalogProducts,
  getShopifyProductsForCatalog,
  importSelectedShopifyProducts,
  syncCatalogProducts,
  syncShopifyProductsToCatalog,
  updateCatalogProducts,
} from "./product.service.js";
import { createShopifyProduct } from "../../../integrations/shopify/shopify.service.js";
import { getWaCatalog } from "../catalog.service.js";
import { log } from "../../../../utils/logger.js";
import {
  createCatalogProductsBatchHandler,
  createShopifyProductHandler,
  deleteCatalogProductsHandler,
  getCatalogProductsHandler,
  getShopifyAvailableProductsHandler,
  importShopifyProductsHandler,
  syncCatalogProductsHandler,
  syncShopifyProductsFromShopifyHandler,
  updateCatalogProductsHandler,
} from "./product.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  createBatch: createCatalogProductsBatch as unknown as Mock,
  remove: deleteCatalogProducts as unknown as Mock,
  list: getCatalogProducts as unknown as Mock,
  shopifyAvailable: getShopifyProductsForCatalog as unknown as Mock,
  importShopify: importSelectedShopifyProducts as unknown as Mock,
  syncToMeta: syncCatalogProducts as unknown as Mock,
  syncFromShopify: syncShopifyProductsToCatalog as unknown as Mock,
  update: updateCatalogProducts as unknown as Mock,
  createInShopify: createShopifyProduct as unknown as Mock,
  getCatalog: getWaCatalog as unknown as Mock,
};

const CATALOG = { catalogId: "cat-1", orgId: "org-1" };

/** A Shopify product as the create mutation returns it, with GID-style ids. */
function shopifyProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "gid://shopify/Product/999",
    variants: { nodes: [{ id: "gid://shopify/ProductVariant/123" }] },
    ...overrides,
  };
}

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: { catalogId: "cat-1" },
    body: {},
    query: {},
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getCatalog.mockResolvedValue(CATALOG);
  m.createBatch.mockResolvedValue(undefined);
  m.remove.mockResolvedValue({ deleted: 1 });
  m.list.mockResolvedValue([{ id: "prod-1" }]);
  m.shopifyAvailable.mockResolvedValue([{ retailer_id: "sku-1" }]);
  m.importShopify.mockResolvedValue({ imported: 1 });
  m.syncToMeta.mockResolvedValue({ synced: 1 });
  m.syncFromShopify.mockResolvedValue({ synced: 2 });
  m.update.mockResolvedValue({ updated: 1 });
  m.createInShopify.mockResolvedValue(shopifyProduct());
});

describe("createCatalogProductsBatchHandler", () => {
  test("creates the batch of the type the body names", async () => {
    const reply = makeReply();
    const items = [{ retailer_id: "sku-1" }];

    await createCatalogProductsBatchHandler(
      makeRequest({ body: { type: "product", product: items } }),
      reply,
    );

    expect(m.createBatch).toHaveBeenCalledWith("org-1", "product", items, "cat-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("reads the items from the key matching the type", async () => {
    const rooms = [{ retailer_id: "room-1" }];

    await createCatalogProductsBatchHandler(
      makeRequest({ body: { type: "hotel", hotel: rooms, product: [] } }),
      makeReply(),
    );

    expect(m.createBatch).toHaveBeenCalledWith("org-1", "hotel", rooms, "cat-1");
  });

  test("returns 404 without creating anything for an unknown catalog", async () => {
    m.getCatalog.mockResolvedValue(null);
    const reply = makeReply();

    await createCatalogProductsBatchHandler(
      makeRequest({ body: { type: "product", product: [] } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toBe("No catalog found");
    expect(m.createBatch).not.toHaveBeenCalled();
  });

  // NOTE: the catalog is fetched but its orgId is never compared to the caller's, so
  // the 404 guard confirms the catalog exists without confirming it is theirs.
  test("creates against another org's catalog once it is found to exist", async () => {
    m.getCatalog.mockResolvedValue({ catalogId: "cat-victim", orgId: "org-victim" });

    await createCatalogProductsBatchHandler(
      makeRequest({ params: { catalogId: "cat-victim" }, body: { type: "product", product: [] } }),
      makeReply(),
    );

    expect(m.createBatch).toHaveBeenCalledWith("org-1", "product", [], "cat-victim");
  });

  test("returns 500 when the batch fails", async () => {
    m.createBatch.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await createCatalogProductsBatchHandler(
      makeRequest({ body: { type: "product", product: [] } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("syncCatalogProductsHandler", () => {
  test("syncs the catalog with the filter it was given", async () => {
    const reply = makeReply();
    const filter = { after: "cursor-1" };

    await syncCatalogProductsHandler(makeRequest({ body: filter }), reply);

    expect(m.syncToMeta).toHaveBeenCalledWith("org-1", "cat-1", filter);
    expect(reply.payload).toEqual({ synced: 1 });
  });

  // NOTE: unlike its neighbours this one performs no catalog lookup at all.
  test("does not check the catalog exists first", async () => {
    await syncCatalogProductsHandler(makeRequest({ body: {} }), makeReply());

    expect(m.getCatalog).not.toHaveBeenCalled();
  });

  test("returns 500 when the sync fails", async () => {
    m.syncToMeta.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await syncCatalogProductsHandler(makeRequest({ body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getCatalogProductsHandler", () => {
  test("lists the catalog's products, passing the query through", async () => {
    const reply = makeReply();

    await getCatalogProductsHandler(makeRequest({ query: { search: "shoe" } }), reply);

    expect(m.list).toHaveBeenCalledWith("cat-1", { search: "shoe" });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  // NOTE: no ownership check — another org's products are listed given its catalog id.
  test("lists another org's products given its catalog id", async () => {
    await getCatalogProductsHandler(
      makeRequest({ params: { catalogId: "cat-victim" }, query: {} }),
      makeReply(),
    );

    expect(m.list).toHaveBeenCalledWith("cat-victim", {});
  });

  test("returns 500 when the listing fails", async () => {
    m.list.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getCatalogProductsHandler(makeRequest({ query: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteCatalogProductsHandler", () => {
  test("deletes the products the body names", async () => {
    const reply = makeReply();

    await deleteCatalogProductsHandler(
      makeRequest({ body: { productIds: ["sku-1", "sku-2"] } }),
      reply,
    );

    expect(m.remove).toHaveBeenCalledWith("org-1", "cat-1", ["sku-1", "sku-2"]);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when the delete fails", async () => {
    m.remove.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await deleteCatalogProductsHandler(makeRequest({ body: { productIds: [] } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("updateCatalogProductsHandler", () => {
  test("updates the items of the type the body names", async () => {
    const items = [{ retailer_id: "sku-1", price: 100 }];
    const reply = makeReply();

    await updateCatalogProductsHandler(
      makeRequest({ body: { type: "product", product: items } }),
      reply,
    );

    expect(m.update).toHaveBeenCalledWith("org-1", "cat-1", items, "product");
    expect(reply.payload).toEqual({ updated: 1 });
  });

  test("returns 500 when the update fails", async () => {
    m.update.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await updateCatalogProductsHandler(makeRequest({ body: { type: "product" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("Shopify listing and import", () => {
  test("lists the Shopify products available to import", async () => {
    const reply = makeReply();

    await getShopifyAvailableProductsHandler(makeRequest(), reply);

    expect(m.shopifyAvailable).toHaveBeenCalledWith("org-1", "cat-1");
    expect(reply.payload).toEqual([{ retailer_id: "sku-1" }]);
  });

  test("imports the items the body names", async () => {
    const items = [{ retailer_id: "sku-1" }];
    const reply = makeReply();

    await importShopifyProductsHandler(makeRequest({ body: { items } }), reply);

    expect(m.importShopify).toHaveBeenCalledWith("org-1", "cat-1", items);
    expect(reply.payload).toEqual({ imported: 1 });
  });

  test("imports nothing rather than failing when the body has no items", async () => {
    await importShopifyProductsHandler(makeRequest({ body: {} }), makeReply());

    expect(m.importShopify).toHaveBeenCalledWith("org-1", "cat-1", []);
  });

  test("pulls the whole Shopify catalog when asked to sync", async () => {
    const reply = makeReply();

    await syncShopifyProductsFromShopifyHandler(makeRequest(), reply);

    expect(m.syncFromShopify).toHaveBeenCalledWith("org-1", "cat-1");
    expect(reply.payload).toEqual({ synced: 2 });
  });

  test.each([
    ["getShopifyAvailableProductsHandler", getShopifyAvailableProductsHandler, "shopifyAvailable"],
    ["importShopifyProductsHandler", importShopifyProductsHandler, "importShopify"],
    [
      "syncShopifyProductsFromShopifyHandler",
      syncShopifyProductsFromShopifyHandler,
      "syncFromShopify",
    ],
  ])("%s returns 404 for an unknown catalog", async (_name, handler, key) => {
    m.getCatalog.mockResolvedValue(null);
    const reply = makeReply();

    await (handler as any)(makeRequest({ body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect((m as any)[key]).not.toHaveBeenCalled();
  });

  test("returns 500 when listing the Shopify products fails", async () => {
    m.shopifyAvailable.mockRejectedValue(new Error("shopify down"));
    const reply = makeReply();

    await getShopifyAvailableProductsHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  // This one reports the message rather than the raw error object.
  test("returns 500 with the failure's message when the Shopify sync fails", async () => {
    m.syncFromShopify.mockRejectedValue(new Error("shopify down"));
    const reply = makeReply();

    await syncShopifyProductsFromShopifyHandler(makeRequest(), reply);

    expect(reply.payload).toEqual({ message: "shopify down" });
  });
});

describe("createShopifyProductHandler", () => {
  const body = {
    title: "Running shoe",
    description: "A shoe",
    brand: "Acme",
    price: 99.5,
    currencyCode: "INR",
    imageUrl: "https://img/1.png",
  };

  test("creates the product in Shopify and returns it", async () => {
    const reply = makeReply();

    await createShopifyProductHandler(makeRequest({ body }), reply);

    expect(m.createInShopify).toHaveBeenCalledWith("org-1", body);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual(shopifyProduct());
  });

  test("imports the new product into the catalog so it shows up straight away", async () => {
    await createShopifyProductHandler(makeRequest({ body }), makeReply());

    const [orgId, catalogId, items] = m.importShopify.mock.calls[0];
    expect(orgId).toBe("org-1");
    expect(catalogId).toBe("cat-1");
    expect(items[0]).toMatchObject({
      retailer_id: "123",
      item_group_id: "999",
      title: "Running shoe",
      brand: "Acme",
      condition: "new",
      availability: "in stock",
      price: 99.5,
      currencyCode: "INR",
    });
  });

  // Shopify returns GIDs like gid://shopify/ProductVariant/123; Meta wants the number.
  test("reduces the Shopify GIDs to their numeric ids", async () => {
    await createShopifyProductHandler(makeRequest({ body }), makeReply());

    const item = m.importShopify.mock.calls[0][2][0];
    expect(item.retailer_id).toBe("123");
    expect(item.item_group_id).toBe("999");
  });

  test("formats the sale price to two decimal places", async () => {
    await createShopifyProductHandler(makeRequest({ body: { ...body, price: 99.5 } }), makeReply());

    expect(m.importShopify.mock.calls[0][2][0].sale_price).toBe("99.50");
  });

  test("falls back to the title when the product has no description", async () => {
    await createShopifyProductHandler(
      makeRequest({ body: { ...body, description: "" } }),
      makeReply(),
    );

    expect(m.importShopify.mock.calls[0][2][0].description).toBe("Running shoe");
  });

  test("trims an over-long title and description to what Meta accepts", async () => {
    await createShopifyProductHandler(
      makeRequest({
        body: { ...body, title: "t".repeat(150), description: "d".repeat(6000) },
      }),
      makeReply(),
    );

    const item = m.importShopify.mock.calls[0][2][0];
    expect(item.title).toHaveLength(100);
    expect(item.description).toHaveLength(5000);
  });

  // Meta rejects catalog items without an image, so the import is skipped instead.
  test("creates the product but does not import it when there is no image", async () => {
    const reply = makeReply();

    await createShopifyProductHandler(
      makeRequest({ body: { ...body, imageUrl: undefined } }),
      reply,
    );

    expect(m.createInShopify).toHaveBeenCalled();
    expect(m.importShopify).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("skips the import when Shopify returned no variant", async () => {
    m.createInShopify.mockResolvedValue(shopifyProduct({ variants: { nodes: [] } }));

    await createShopifyProductHandler(makeRequest({ body }), makeReply());

    expect(m.importShopify).not.toHaveBeenCalled();
  });

  test("returns 500 with the failure's message when Shopify rejects the product", async () => {
    m.createInShopify.mockRejectedValue(new Error("handle already taken"));
    const reply = makeReply();

    await createShopifyProductHandler(makeRequest({ body }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ message: "handle already taken" });
  });

  test("falls back to a generic message when the failure carries none", async () => {
    m.createInShopify.mockRejectedValue({});
    const reply = makeReply();

    await createShopifyProductHandler(makeRequest({ body }), reply);

    expect(reply.payload).toEqual({ message: "Failed to create Shopify product" });
  });

  // NOTE: this handler never checks the catalog exists, unlike the other Shopify
  // handlers — the product is created in Shopify before anything is validated.
  test("creates the product in Shopify without checking the catalog first", async () => {
    await createShopifyProductHandler(makeRequest({ body }), makeReply());

    expect(m.getCatalog).not.toHaveBeenCalled();
  });
});
