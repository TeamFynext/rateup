import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const request = vi.hoisted(() => vi.fn());

vi.mock("../../../../utils/prisma.js", () => ({
  default: { waCatalogProduct: { findMany: vi.fn(async () => []) } },
  excludeFields: vi.fn(),
}));
vi.mock("../../../meta/whatsapp/settings/settings.service.js", () => ({ getWaSettings: vi.fn() }));
vi.mock("../../../meta/whatsapp/wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../catalog.service.js", () => ({ getWaCatalog: vi.fn() }));
vi.mock("../../../integrations/shopify/shopify.credential.js", () => ({
  getShopifyInfo: vi.fn(async () => ({ credential: { session: {} } })),
}));
vi.mock("../../../integrations/shopify/shopify.session.js", () => ({
  getActiveShopifySession: vi.fn(async () => ({ shop: "acme.myshopify.com" })),
}));
vi.mock("../../../integrations/shopify/shopify.config.js", () => ({
  default: {
    clients: {
      Graphql: class {
        request = request;
      },
    },
  },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

const { getShopifyProductsForCatalog } = await import("./product.service.js");

const variant = (n: number) => ({
  node: {
    id: `gid://shopify/ProductVariant/${n}`,
    price: "10.00",
    availableForSale: true,
    title: `V${n}`,
  },
});

const product = (over: Record<string, unknown> = {}) => ({
  id: "gid://shopify/Product/1",
  title: "Mug",
  description: "",
  vendor: "Acme",
  handle: "mug",
  images: { edges: [{ node: { image: { url: "https://cdn.test/m.jpg" } } }] },
  variants: { edges: [variant(1)], pageInfo: { hasNextPage: false, endCursor: null } },
  ...over,
});

function answer(products: unknown[]) {
  request.mockImplementation(async (query: string) => {
    if (query.includes("currencyCode")) return { data: { shop: { currencyCode: "USD" } } };
    if (query.includes("moreVariants"))
      return {
        data: {
          product: {
            variants: {
              edges: [variant(101)],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      };
    return {
      data: {
        products: {
          edges: products.map((node) => ({ node })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    };
  });
}

beforeEach(() => vi.clearAllMocks());

describe("reading products from Shopify", () => {
  test("asks only for published products", async () => {
    answer([product()]);
    await getShopifyProductsForCatalog("org", "cat");
    const query = request.mock.calls.find((c) => String(c[0]).includes("getFullProducts"))![0];
    expect(query).toContain('query: "status:active"');
  });

  test("pages past the first 100 variants", async () => {
    answer([
      product({
        variants: {
          edges: Array.from({ length: 100 }, (_, i) => variant(i + 1)),
          pageInfo: { hasNextPage: true, endCursor: "c100" },
        },
      }),
    ]);
    const items = await getShopifyProductsForCatalog("org", "cat");
    expect(items).toHaveLength(101);
    expect(items.at(-1)?.retailer_id).toBe("101");
  });

  test("a product without images is left out of a Meta catalog but kept for the shop", async () => {
    answer([product({ images: { edges: [] } })]);
    expect(await getShopifyProductsForCatalog("org", "cat")).toHaveLength(0);
    const mirrored = await getShopifyProductsForCatalog("org", "cat", { requireImage: false });
    expect(mirrored).toHaveLength(1);
    expect(mirrored[0].image).toEqual([]);
  });
});
