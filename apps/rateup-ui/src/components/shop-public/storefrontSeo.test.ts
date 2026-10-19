import { describe, expect, test } from "vitest";

import type { Storefront, StorefrontProduct } from "@/backend/commerce/shop.api";

import {
  findByHandle,
  productHandle,
  productHead,
  resolveProductLink,
  serialiseJsonLd,
  storeHead,
  storefrontSitemap,
  summarise,
  type StorefrontHead,
} from "./storefrontSeo.ts";

const BASE = "https://shop.test";

const variant = (id: string, extra: Partial<StorefrontProduct["variants"][number]> = {}) => ({
  id,
  title: "Default",
  sku: null,
  optionValues: null,
  price: 18,
  compareAtPrice: null,
  imageUrl: null,
  soldOut: false,
  lowStock: false,
  ...extra,
});

const beans: StorefrontProduct = {
  id: "3f9a2b1c-77aa-4c1e-9d2f-0a1b2c3d4e5f",
  title: "Ethiopia Guji — Single Origin",
  description: "Bright, floral and sweet.\n\nRoasted every Monday.",
  images: ["https://img.test/guji.jpg"],
  options: null,
  collectionIds: [],
  variants: [variant("v1", { sku: "GUJI-250" })],
};

const grinds: StorefrontProduct = {
  ...beans,
  id: "9e8d7c6b-0000-4000-8000-000000000000",
  title: "Morning Ridge",
  variants: [
    variant("v2", { title: "Whole bean", price: 16 }),
    variant("v3", { title: "Ground", price: 17, soldOut: true }),
  ],
};

const storefront: Storefront = {
  store: {
    name: "Fern & Field",
    slug: "fern",
    description: "Small-batch coffee.",
    logoUrl: "https://img.test/logo.png",
    currency: "USD",
    theme: { banner: { imageUrl: "https://img.test/banner.jpg", subtitle: "Roasted weekly" } },
    whatsappNumber: "15555550100",
    instagramUrl: "https://instagram.com/fernandfield",
    highlight: null,
  },
  collections: [],
  products: [beans, grinds],
} as Storefront;

const tag = (head: StorefrontHead, key: string) => {
  const found = head.meta.find(
    (m) => ("name" in m && m.name === key) || ("property" in m && m.property === key),
  );
  return found && "content" in found ? found.content : undefined;
};
const ld = (head: StorefrontHead) =>
  JSON.parse(head.scripts[0].children) as Record<string, unknown>;

describe("product links", () => {
  test("handles survive a rename because the id part decides", () => {
    const handle = productHandle(beans);
    expect(handle).toBe("ethiopia-guji-single-origin-3f9a2b1c");
    expect(findByHandle([beans, grinds], "old-name-3f9a2b1c")).toBe(beans);
    expect(findByHandle([beans, grinds], "no-id-here")).toBeUndefined();
  });

  test("old ?product= ids and renamed handles both resolve, flagged for a redirect", () => {
    expect(resolveProductLink([beans], beans.id)).toEqual({ product: beans, canonical: false });
    expect(resolveProductLink([beans], "old-name-3f9a2b1c")).toEqual({
      product: beans,
      canonical: false,
    });
    expect(resolveProductLink([beans], productHandle(beans))).toEqual({
      product: beans,
      canonical: true,
    });
    expect(resolveProductLink([beans], "gone-deadbeef")).toBeNull();
  });
});

describe("storefront head", () => {
  test("is indexable, canonical, and describes the shop", () => {
    const head = storeHead(storefront, BASE);
    expect(head.links).toEqual([{ rel: "canonical", href: "https://shop.test/s/fern" }]);
    expect(tag(head, "robots")).toMatch(/^index, follow/);
    expect(tag(head, "og:image")).toBe("https://img.test/banner.jpg");
    expect(tag(head, "og:site_name")).toBe("Fern & Field");
    expect(tag(head, "description")).toBe("Roasted weekly");
    expect(ld(head)).toMatchObject({
      "@type": "OnlineStore",
      name: "Fern & Field",
      sameAs: ["https://instagram.com/fernandfield"],
    });
  });
});

describe("product head", () => {
  test("carries price, availability and a Product with one offer", () => {
    const head = productHead(storefront, beans, BASE);
    const url = "https://shop.test/s/fern/p/ethiopia-guji-single-origin-3f9a2b1c";
    expect(head.links[0].href).toBe(url);
    expect(tag(head, "og:type")).toBe("product");
    expect(tag(head, "og:price:amount")).toBe("18.00");
    expect(tag(head, "product:availability")).toBe("in stock");
    expect(tag(head, "description")).toBe("Bright, floral and sweet. Roasted every Monday.");
    expect(ld(head)).toMatchObject({
      "@type": "Product",
      sku: "GUJI-250",
      brand: { "@type": "Brand", name: "Fern & Field" },
      offers: {
        "@type": "Offer",
        price: "18.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url,
      },
    });
  });

  test("lists one offer per variant and quotes the lowest price", () => {
    const head = productHead(storefront, grinds, BASE);
    expect(tag(head, "og:price:amount")).toBe("16.00");
    expect(tag(head, "product:availability")).toBe("in stock");
    const offers = ld(head).offers as { name: string; availability: string }[];
    expect(offers.map((o) => [o.name, o.availability])).toEqual([
      ["Whole bean", "https://schema.org/InStock"],
      ["Ground", "https://schema.org/OutOfStock"],
    ]);
  });

  test("a title cannot close the JSON-LD script", () => {
    const out = serialiseJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

describe("helpers", () => {
  test("summaries cut at a word", () => {
    expect(summarise("word ".repeat(60))).toMatch(/word…$/);
    expect(summarise("word ".repeat(60)).length).toBeLessThanOrEqual(160);
    expect(summarise(null)).toBe("");
  });

  test("the sitemap lists each shop and its product URLs, escaped", () => {
    const xml = storefrontSitemap(
      [
        {
          slug: "fern",
          updatedAt: "2026-10-01T00:00:00.000Z",
          products: [{ id: beans.id, title: "Tea & Toast", updatedAt: "2026-10-12T08:00:00.000Z" }],
        },
      ],
      BASE,
    );
    expect(xml).toContain("<loc>https://shop.test/s/fern</loc><lastmod>2026-10-12</lastmod>");
    expect(xml).toContain("<loc>https://shop.test/s/fern/p/tea-toast-3f9a2b1c</loc>");
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|apos;|quot;)/);
  });
});
