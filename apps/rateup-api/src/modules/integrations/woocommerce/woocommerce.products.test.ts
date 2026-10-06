import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn() },
    waCatalogProduct: { findMany: vi.fn() },
  },
}));
vi.mock("../../whatsapp/catalog/products/product.service.js", () => ({
  createCatalogProductsBatch: vi.fn(),
  updateCatalogProducts: vi.fn(),
}));

// The store's product endpoints, behind axios.
const store = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => {
  const axios = {
    create: vi.fn(() => ({ get: store.get })),
    isAxiosError: (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true,
  };
  return { default: axios, ...axios };
});

import prisma from "../../../utils/prisma.js";
import {
  createCatalogProductsBatch,
  updateCatalogProducts,
} from "../../whatsapp/catalog/products/product.service.js";
import type { WooCatalogProduct, WooVariation } from "./woocommerce.client.js";
import {
  getWooProductsForCatalog,
  handleWooProductUpdated,
  importSelectedWooProducts,
  plainText,
  toCatalogItems,
} from "./woocommerce.products.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const credential = {
  storeUrl: "https://shop.example.com",
  consumerKey: "ck",
  consumerSecret: "cs",
  webhookSecret: "secret",
  webhooks: [],
  store: { name: "Chai Co", currency: "INR" },
  connectedAt: "2026-09-28T00:00:00.000Z",
};
const context = { currencyCode: "INR", brand: "Chai Co" };

const simple = (over: Partial<WooCatalogProduct> = {}): WooCatalogProduct => ({
  id: 77,
  name: "Masala Tea",
  type: "simple",
  status: "publish",
  permalink: "https://shop.example.com/product/masala-tea",
  short_description: "<p>Strong &amp; spicy.</p>",
  regular_price: "250",
  sale_price: "199",
  price: "199",
  stock_status: "instock",
  images: [{ src: "https://shop.example.com/tea.jpg" }],
  ...over,
});

const variable = (over: Partial<WooCatalogProduct> = {}): WooCatalogProduct => ({
  ...simple({ id: 80, name: "Mug", type: "variable", regular_price: "", sale_price: "" }),
  variations: [81, 82],
  ...over,
});

const variations: WooVariation[] = [
  {
    id: 81,
    regular_price: "300",
    stock_status: "instock",
    attributes: [{ name: "Colour", option: "Red" }],
    image: { src: "https://shop.example.com/red.jpg" },
  },
  {
    id: 82,
    regular_price: "300",
    stock_status: "outofstock",
    attributes: [{ name: "Colour", option: "Blue" }],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findUnique.mockResolvedValue({ id: "int-1", active: true, credential });
  db.waCatalogProduct.findMany.mockResolvedValue([]);
  store.get.mockImplementation(async (url: string) => {
    if (url === "/products") return { data: [simple(), variable()] };
    if (url === "/products/80/variations") return { data: variations };
    if (url === "/products/80") return { data: variable() };
    throw new Error(`unexpected ${url}`);
  });
});

describe("a WooCommerce product as catalog items", () => {
  test("a simple product is one item, prefixed, with its sale and plain-text description", () => {
    expect(toCatalogItems(simple(), [], context)).toEqual([
      {
        retailer_id: "wc_77",
        title: "Masala Tea",
        description: "Strong & spicy.",
        condition: "new",
        image: [{ url: "https://shop.example.com/tea.jpg" }],
        internal_label: [],
        link: "https://shop.example.com/product/masala-tea",
        currencyCode: "INR",
        availability: "in stock",
        brand: "Chai Co",
        price: 250,
        sale_price: 199,
      },
    ]);
  });

  test("a variable product is one item per variation, grouped under the product", () => {
    const items = toCatalogItems(variable(), variations, context);

    expect(items.map((item) => [item.retailer_id, item.title, item.availability])).toEqual([
      ["wc_81", "Mug - Red", "in stock"],
      ["wc_82", "Mug - Blue", "out of stock"],
    ]);
    expect(items.every((item) => item.item_group_id === "wc_80")).toBe(true);
    // A variation without its own image shows the product's.
    expect(items[1].image).toEqual([{ url: "https://shop.example.com/tea.jpg" }]);
    expect(items[0]).not.toHaveProperty("sale_price");
  });

  test("nothing to sell — no price, no image, a grouped product — is no item", () => {
    expect(toCatalogItems(simple({ regular_price: "", price: "" }), [], context)).toEqual([]);
    expect(toCatalogItems(simple({ images: [] }), [], context)).toEqual([]);
    expect(toCatalogItems(simple({ type: "grouped" }), [], context)).toEqual([]);
  });

  test("an unpublished product stays an item, out of stock", () => {
    expect(toCatalogItems(simple({ status: "draft" }), [], context)[0].availability).toBe(
      "out of stock",
    );
  });

  test("HTML descriptions become plain text", () => {
    expect(plainText("<p>One<br/>Two &lt;3</p><ul><li>A</li></ul>")).toBe("One\nTwo <3\nA");
  });
});

describe("the import", () => {
  test("offers every sellable item not already in the catalog", async () => {
    db.waCatalogProduct.findMany.mockResolvedValue([{ retailer_id: "wc_81" }]);

    const items = await getWooProductsForCatalog("org-1", "cat-1");

    expect(items.map((item) => item.retailer_id)).toEqual(["wc_77", "wc_82"]);
  });

  test("adds only WooCommerce items", async () => {
    const [woo] = toCatalogItems(simple(), [], context);

    await expect(
      importSelectedWooProducts("org-1", "cat-1", [woo, { ...woo, retailer_id: "12345" }]),
    ).resolves.toEqual({ imported: 1 });
    expect(createCatalogProductsBatch).toHaveBeenCalledWith(
      "org-1",
      "PRODUCT_ITEM",
      [woo],
      "cat-1",
    );
  });
});

describe("product.updated", () => {
  const integration = { id: "int-1", orgId: "org-1", credential } as never;

  test("pushes the product to each catalog holding it, keeping the admin's labels", async () => {
    db.waCatalogProduct.findMany.mockResolvedValue([
      {
        catalogId: "cat-1",
        retailer_id: "wc_77",
        productProps: { condition: "refurbished", internal_label: ["'bestseller'"] },
      },
    ]);

    await expect(
      handleWooProductUpdated(integration, {
        deliveryId: "d-1",
        webhookId: "104",
        payload: simple({ regular_price: "275" }) as never,
      }),
    ).resolves.toEqual({ updated: 1 });

    expect(updateCatalogProducts).toHaveBeenCalledWith(
      "org-1",
      "cat-1",
      [
        expect.objectContaining({
          retailer_id: "wc_77",
          price: 275,
          condition: "refurbished",
          internal_label: ["bestseller"],
        }),
      ],
      "PRODUCT_ITEM",
    );
  });

  test("a product in no catalog is left alone, without asking the store anything", async () => {
    await expect(
      handleWooProductUpdated(integration, {
        deliveryId: "d-1",
        webhookId: "104",
        payload: simple() as never,
      }),
    ).resolves.toEqual({ updated: 0 });
    expect(store.get).not.toHaveBeenCalled();
    expect(updateCatalogProducts).not.toHaveBeenCalled();
  });

  test("a variation saved on its own is updated with its parent's details", async () => {
    db.waCatalogProduct.findMany.mockResolvedValue([
      { catalogId: "cat-1", retailer_id: "wc_82", productProps: {} },
    ]);

    await handleWooProductUpdated(integration, {
      deliveryId: "d-1",
      webhookId: "104",
      payload: { id: 82, type: "variation", parent_id: 80, name: "Mug - Blue" } as never,
    });

    expect(db.waCatalogProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ retailer_id: { in: ["wc_82"] } }),
      }),
    );
    expect(updateCatalogProducts).toHaveBeenCalledWith(
      "org-1",
      "cat-1",
      [expect.objectContaining({ retailer_id: "wc_82", title: "Mug - Blue" })],
      "PRODUCT_ITEM",
    );
  });
});
