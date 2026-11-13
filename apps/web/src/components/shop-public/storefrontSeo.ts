import type { SitemapStore, Storefront, StorefrontProduct } from "@/backend/commerce/shop.api";

/**
 * A product's address on the storefront: its title for people and search engines, then the
 * start of its id, which is what the page looks it up by. Mirrors `productHandle` in
 * rateup-api's storefrontLinks.ts, which builds the same links for chat and the Meta catalog.
 */
export function productHandle(product: { id: string; title: string }) {
  const words = product.title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const key = idKey(product.id);
  return words ? `${words}-${key}` : key;
}

const idKey = (id: string) => id.replace(/-/g, "").slice(0, 8).toLowerCase();

/** Finds the product a handle points at, even after the title (and so the handle) changed. */
export function findByHandle<P extends { id: string }>(products: readonly P[], handle: string) {
  const key = handle.slice(handle.lastIndexOf("-") + 1).toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(key)) return undefined;
  return products.find((p) => idKey(p.id) === key);
}

/**
 * What a product URL should do: show the product, move to its current handle, or (for an id from
 * the old `?product=` links) be found by id too.
 */
export function resolveProductLink<P extends { id: string; title: string }>(
  products: readonly P[],
  handleOrId: string,
): { product: P; canonical: boolean } | null {
  const product = products.find((p) => p.id === handleOrId) ?? findByHandle(products, handleOrId);
  if (!product) return null;
  return { product, canonical: productHandle(product) === handleOrId };
}

export const storefrontPath = (slug: string) => `/s/${slug}`;
export const productPath = (slug: string, product: { id: string; title: string }) =>
  `/s/${slug}/p/${encodeURIComponent(productHandle(product))}`;

type Meta =
  | { title: string }
  | { name: string; content: string }
  | {
      property: string;
      content: string;
    };
type JsonLd = Record<string, unknown>;

export interface StorefrontHead {
  meta: Meta[];
  links: { rel: string; href: string }[];
  scripts: { type: string; children: string }[];
}

const INDEX = "index, follow, max-image-preview:large";

/** For a shop that wrote no description, so its preview never falls back to RateUp's own. */
const fallbackDescription = (storeName: string) =>
  `Shop ${storeName} online. Browse products and order on WhatsApp.`;

const absoluteImage = (url: string | null | undefined) =>
  url && /^https?:\/\//.test(url) ? url : undefined;

/** Plain text for a meta description: one line, cut at a word near 160 characters. */
export function summarise(text: string | null | undefined, max = 160) {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** `</script>` in a product title must not end the JSON-LD block it sits in. */
export const serialiseJsonLd = (data: JsonLd) =>
  JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

function socialTags(input: {
  type: "website" | "product";
  title: string;
  description: string;
  url: string;
  image: string | undefined;
  siteName: string;
}): Meta[] {
  const tags: Meta[] = [
    { title: input.title },
    { name: "robots", content: INDEX },
    { property: "og:type", content: input.type },
    { property: "og:site_name", content: input.siteName },
    { property: "og:title", content: input.title },
    { property: "og:url", content: input.url },
    { name: "twitter:card", content: input.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:url", content: input.url },
    // Always set, even when the shop wrote none: the root route's RateUp description would
    // otherwise survive the merge and show as the shop's link preview in WhatsApp.
    { name: "description", content: input.description },
    { property: "og:description", content: input.description },
    { name: "twitter:description", content: input.description },
  ];
  if (input.image) {
    tags.push(
      { property: "og:image", content: input.image },
      { property: "og:image:alt", content: input.title },
      { name: "twitter:image", content: input.image },
    );
  }
  return tags;
}

export function storeHead(storefront: Storefront, baseUrl: string): StorefrontHead {
  const { store, products } = storefront;
  const url = `${baseUrl}${storefrontPath(store.slug)}`;
  const banner = store.theme?.banner;
  const image =
    absoluteImage(banner?.imageUrl) ??
    absoluteImage(store.logoUrl) ??
    absoluteImage(products.find((p) => p.images[0])?.images[0]);
  const description =
    summarise(banner?.subtitle || store.description) || fallbackDescription(store.name);

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: store.name,
    url,
    ...(description ? { description } : {}),
    ...(absoluteImage(store.logoUrl) ? { logo: store.logoUrl } : {}),
    ...(image ? { image } : {}),
    ...(store.instagramUrl ? { sameAs: [store.instagramUrl] } : {}),
  };

  return {
    meta: socialTags({
      type: "website",
      title: store.name,
      description,
      url,
      image,
      siteName: store.name,
    }),
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: serialiseJsonLd(jsonLd) }],
  };
}

const availability = (soldOut: boolean) =>
  soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";

export function productHead(
  storefront: Storefront,
  product: StorefrontProduct,
  baseUrl: string,
): StorefrontHead {
  const { store } = storefront;
  const url = `${baseUrl}${productPath(store.slug, product)}`;
  const images = [...product.images, ...product.variants.map((v) => v.imageUrl)].flatMap(
    (i) => absoluteImage(i) ?? [],
  );
  const image = images[0];
  const description =
    summarise(product.description) ||
    summarise(store.description) ||
    fallbackDescription(store.name);
  const prices = product.variants.map((v) => v.price);
  const lowest = Math.min(...prices);
  const soldOut = product.variants.every((v) => v.soldOut);
  const single = product.variants.length === 1 ? product.variants[0] : undefined;

  const offer = (v: StorefrontProduct["variants"][number]) => ({
    "@type": "Offer",
    url,
    price: v.price.toFixed(2),
    priceCurrency: store.currency,
    availability: availability(v.soldOut),
    ...(product.variants.length > 1 ? { name: v.title } : {}),
    ...(v.sku ? { sku: v.sku } : {}),
  });

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: [...new Set(images)] } : {}),
    ...(single?.sku ? { sku: single.sku } : {}),
    brand: { "@type": "Brand", name: store.name },
    offers: single ? offer(single) : product.variants.map(offer),
  };

  const title = `${product.title} · ${store.name}`;
  return {
    meta: [
      ...socialTags({ type: "product", title, description, url, image, siteName: store.name }),
      { property: "og:price:amount", content: lowest.toFixed(2) },
      { property: "og:price:currency", content: store.currency },
      { property: "product:price:amount", content: lowest.toFixed(2) },
      { property: "product:price:currency", content: store.currency },
      { property: "product:availability", content: soldOut ? "out of stock" : "in stock" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: serialiseJsonLd(jsonLd) }],
  };
}

const escapeXml = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) => `&${{ "<": "lt", ">": "gt", "&": "amp", "'": "apos", '"': "quot" }[c]};`,
  );

export function storefrontSitemap(stores: readonly SitemapStore[], baseUrl: string) {
  const urls = stores.flatMap((s) => {
    const newest = [s.updatedAt, ...s.products.map((p) => p.updatedAt)].sort().at(-1);
    return [
      { loc: `${baseUrl}${storefrontPath(s.slug)}`, lastmod: newest },
      ...s.products.map((p) => ({
        loc: `${baseUrl}${productPath(s.slug, p)}`,
        lastmod: p.updatedAt,
      })),
    ];
  });
  const body = urls
    .map(
      (u) =>
        `<url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
