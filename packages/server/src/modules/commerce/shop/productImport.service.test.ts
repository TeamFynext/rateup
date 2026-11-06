import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopProduct: { count: vi.fn() },
  shopVariant: { findMany: vi.fn() },
  shopStore: { update: vi.fn() },
  integration: { findFirst: vi.fn() },
  whatsappCatalog: { findFirst: vi.fn(), findMany: vi.fn() },
}));
const products = vi.hoisted(() => ({ createProduct: vi.fn() }));
const sync = vi.hoisted(() => ({
  fetchStoreItems: vi.fn(),
  mirrorConnectedStore: vi.fn(),
  splitTitle: (title: string, siblings: number) => {
    if (siblings < 2) return { base: title, variant: "Default" };
    const i = title.lastIndexOf(" - ");
    return i > 0
      ? { base: title.slice(0, i), variant: title.slice(i + 3) }
      : { base: title, variant: title };
  },
}));
const meta = vi.hoisted(() => ({ callMetaApi: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("../../whatsapp/settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(async () => ({ accessToken: "token" })),
}));
vi.mock("../../whatsapp/wa_axios.js", () => meta);
vi.mock("./products.service.js", () => products);
vi.mock("./storeSync.service.js", () => sync);

const { importProducts, importSources, parseMetaPrice } =
  await import("./productImport.service.js");

const store = {
  id: "s1",
  orgId: "org",
  mode: "NATIVE",
  currency: "USD",
  metaCatalogId: "cat1",
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  db.shopVariant.findMany.mockResolvedValue([]);
  db.shopProduct.count.mockResolvedValue(0);
  products.createProduct.mockResolvedValue({ id: "p" });
});

describe("Meta's display prices", () => {
  test("read back as amounts whatever the locale", () => {
    expect(parseMetaPrice("$1,299.00")).toBe(1299);
    expect(parseMetaPrice("1.299,50 €")).toBe(1299.5);
    expect(parseMetaPrice("12.5 USD")).toBe(12.5);
    expect(parseMetaPrice("¥1,200")).toBe(1200);
    expect(parseMetaPrice("")).toBeNull();
    expect(parseMetaPrice(undefined)).toBeNull();
  });
});

describe("importing a Meta catalog", () => {
  test("groups variants, keeps Meta's ids and skips what can't be sold here", async () => {
    meta.callMetaApi
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "m1",
              retailer_id: "tee-s",
              retailer_product_group_id: "tee",
              name: "Tee - Small",
              price: "$20.00",
              sale_price: "$15.00",
              currency: "USD",
              size: "Small",
              image_url: "https://img.test/tee.jpg",
            },
            {
              id: "m2",
              retailer_id: "tee-l",
              retailer_product_group_id: "tee",
              name: "Tee - Large",
              price: "$20.00",
              currency: "USD",
              size: "Large",
              availability: "out of stock",
            },
          ],
          paging: { next: "more", cursors: { after: "c2" } },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: "m3", retailer_id: "mug", name: "Mug", price: "€9,00", currency: "EUR" },
            { id: "m4", retailer_id: "cap", name: "Cap", currency: "USD" },
            { id: "m5", retailer_id: "bag", name: "Bag", price: "$30.00", currency: "USD" },
          ],
        },
      });
    db.shopVariant.findMany.mockResolvedValue([{ retailerId: "bag" }]);

    const result = await importProducts(store, { source: "meta" }, "u1");

    expect(meta.callMetaApi).toHaveBeenCalledTimes(2);
    expect(meta.callMetaApi.mock.calls[1][4].params.after).toBe("c2");
    expect(products.createProduct).toHaveBeenCalledTimes(1);
    const [, input] = products.createProduct.mock.calls[0];
    expect(input.title).toBe("Tee");
    expect(input.variants).toEqual([
      expect.objectContaining({
        retailerId: "tee-s",
        title: "Small",
        price: 15,
        compareAtPrice: 20,
        trackInventory: false,
      }),
      expect.objectContaining({
        retailerId: "tee-l",
        title: "Large",
        trackInventory: true,
        stock: 0,
      }),
    ]);
    expect(result.created).toBe(1);
    expect(result.skipped.map((s) => s.product).sort()).toEqual(["Bag", "Cap", "Mug"]);
  });

  test("reads another of the business's catalogs when asked, and only theirs", async () => {
    meta.callMetaApi.mockResolvedValue({ data: { data: [] } });
    db.whatsappCatalog.findFirst.mockResolvedValueOnce({ catalogId: "cat2" });
    await importProducts(store, { source: "meta", catalogId: "cat2" });
    expect(meta.callMetaApi.mock.calls[0][0]).toBe("/cat2/products");

    db.whatsappCatalog.findFirst.mockResolvedValueOnce(null);
    await expect(
      importProducts(store, { source: "meta", catalogId: "someone-elses" }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(meta.callMetaApi).toHaveBeenCalledTimes(1);
  });

  test("lists every catalog with the connected one first", async () => {
    db.integration.findFirst.mockResolvedValue(null);
    db.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: "cat0", name: "Archive" },
      { catalogId: "cat1", name: "Main" },
    ]);
    const sources = await importSources(store);
    expect(sources.meta.catalogId).toBe("cat1");
    expect(sources.meta.catalogName).toBe("Main");
    expect(sources.meta.catalogs.map((c) => c.catalogId)).toEqual(["cat1", "cat0"]);
  });

  test("needs a connected catalog", async () => {
    await expect(
      importProducts({ ...(store as object), metaCatalogId: null } as never, { source: "meta" }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(meta.callMetaApi).not.toHaveBeenCalled();
  });
});

describe("importing from Shopify or WooCommerce", () => {
  test("copies products in as RateUp's own", async () => {
    sync.fetchStoreItems.mockResolvedValue([
      {
        retailer_id: "101",
        title: "Lamp",
        price: 40,
        currencyCode: "USD",
        availability: "in stock",
      },
    ]);
    const result = await importProducts(store, { source: "shopify" });
    expect(sync.mirrorConnectedStore).not.toHaveBeenCalled();
    expect(products.createProduct.mock.calls[0][1].variants[0].retailerId).toBe("101");
    expect(result.created).toBe(1);
  });

  test("keeps in sync by following the store, in the store's currency", async () => {
    db.shopStore.update.mockResolvedValue({ ...(store as object), mode: "WOOCOMMERCE" });
    sync.fetchStoreItems.mockResolvedValue([{ retailer_id: "wc_1", currencyCode: "eur" }]);
    sync.mirrorConnectedStore.mockResolvedValue({
      created: 3,
      updated: 0,
      total: 3,
      skipped: null,
    });
    const result = await importProducts(store, { source: "woocommerce", keepInSync: true });
    expect(db.shopStore.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { mode: "WOOCOMMERCE", checkoutVia: "WOOCOMMERCE", currency: "EUR" },
    });
    expect(sync.mirrorConnectedStore.mock.calls[0][1]).toEqual([
      { retailer_id: "wc_1", currencyCode: "eur" },
    ]);
    expect(result).toEqual({ source: "woocommerce", created: 3, updated: 0, skipped: [] });
  });

  test("reports products the mirror skipped", async () => {
    db.shopStore.update.mockResolvedValue({ ...(store as object), mode: "SHOPIFY" });
    sync.fetchStoreItems.mockResolvedValue([]);
    sync.mirrorConnectedStore.mockResolvedValue({
      created: 1,
      updated: 0,
      total: 1,
      skipped: { count: 2, reason: "Priced in EUR, but this shop sells in USD" },
    });
    const result = await importProducts(store, { source: "shopify", keepInSync: true });
    expect(result.skipped).toEqual([
      { product: "2 products", reason: "Priced in EUR, but this shop sells in USD" },
    ]);
  });

  test("refuses to follow a store when RateUp already has its own products", async () => {
    db.shopProduct.count.mockResolvedValue(4);
    await expect(
      importProducts(store, { source: "shopify", keepInSync: true }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(db.shopStore.update).not.toHaveBeenCalled();
    expect(sync.mirrorConnectedStore).not.toHaveBeenCalled();
  });
});
