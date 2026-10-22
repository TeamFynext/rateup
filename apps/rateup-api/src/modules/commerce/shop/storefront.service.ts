import { withCache } from "../../../utils/cache.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import connection from "../../../utils/redisConnection.js";
import { inStoreCheckout, sellableWhere } from "./checkoutVia.js";
import { storeAcceptingOrders } from "./orderAllowance.js";
import { toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";
import { commerceEnabled } from "./store.service.js";

/**
 * The public storefront at /s/<slug>: a link-in-bio shop. Read-only and unauthenticated, so
 * it returns only what a shopper may see — no stock counts beyond "low" and "sold out", no
 * costs, no internal ids other than the ones the cart sends back.
 */

const publicVariant = (
  v: {
    id: string;
    title: string;
    sku: string | null;
    optionValues: unknown;
    price: unknown;
    compareAtPrice: unknown;
    trackInventory: boolean;
    stock: number;
    allowBackorder: boolean;
    imageUrl: string | null;
    lowStockAt: number | null;
  },
  lowStockThreshold: number,
) => {
  const soldOut = v.trackInventory && v.stock <= 0 && !v.allowBackorder;
  return {
    id: v.id,
    title: v.title,
    sku: v.sku,
    optionValues: v.optionValues ?? null,
    price: toNumber(v.price as number),
    compareAtPrice: v.compareAtPrice === null ? null : toNumber(v.compareAtPrice as number),
    imageUrl: v.imageUrl,
    soldOut,
    lowStock: !soldOut && v.trackInventory && v.stock <= (v.lowStockAt ?? lowStockThreshold),
  };
};

/** `preview` lets the dashboard show the storefront before it is switched on. */
const PUBLIC_STOREFRONT_TTL_SECONDS = 30;
const publicStorefrontKey = (slug: string) => `storefront:public:${slug}`;

/**
 * The live storefront, cached for a few seconds: crawlers, link previews and shoppers ask
 * for the same pages over and over, and each miss is several queries.
 */
export function getPublicStorefront(slug: string) {
  return withCache(publicStorefrontKey(slug), PUBLIC_STOREFRONT_TTL_SECONDS, () =>
    getStorefront(slug),
  );
}

/** Drops the cached page so a merchant's own edit shows on their next look. */
export function forgetPublicStorefront(...slugs: string[]) {
  if (connection.status !== "ready" || !slugs.length) return;
  connection.del(...new Set(slugs.map(publicStorefrontKey))).catch((error: unknown) => {
    log.warn({ err: error }, "Could not clear the cached storefront");
  });
}

export async function getStorefront(slug: string, opts: { preview?: boolean } = {}) {
  const store = await prisma.shopStore.findUnique({ where: { slug } });
  if (
    !store ||
    (!opts.preview && (!store.storefrontEnabled || !(await commerceEnabled(store.orgId))))
  )
    throw new ShopError("NOT_FOUND", "Shop not found");

  const [collections, products, wa, org, acceptingOrders] = await Promise.all([
    prisma.shopCollection.findMany({
      where: {
        storeId: store.id,
        products: {
          some: {
            storeId: store.id,
            status: "ACTIVE",
            showOnStorefront: true,
            ...sellableWhere(store),
          },
        },
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, imageUrl: true },
    }),
    prisma.shopProduct.findMany({
      where: {
        storeId: store.id,
        status: "ACTIVE",
        showOnStorefront: true,
        ...sellableWhere(store),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        variants: { orderBy: { position: "asc" } },
        collections: { where: { storeId: store.id }, select: { id: true } },
      },
      take: 500,
    }),
    prisma.whatsappSettings.findFirst({
      where: { orgId: store.orgId, phone: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { phone: true },
    }),
    prisma.org.findUnique({ where: { id: store.orgId }, select: { name: true } }),
    storeAcceptingOrders(store.orgId),
  ]);

  const banner = store.storefrontTheme?.banner ?? null;
  // A RateUp code can't be entered on the store's own checkout, so it isn't advertised there.
  const discount =
    banner?.title || inStoreCheckout(store.checkoutVia)
      ? null
      : await prisma.shopDiscount.findFirst({
          where: {
            storeId: store.id,
            active: true,
            source: "MANUAL",
            eligibility: "ANYONE",
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
            startsAt: { lte: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

  return {
    store: {
      name: store.name || org?.name,
      slug: store.slug,
      description: store.description,
      logoUrl: store.logoUrl,
      currency: store.currency,
      theme: store.storefrontTheme ?? null,
      whatsappNumber: wa?.phone ? wa.phone.replace(/[^\d]/g, "") : null,
      instagramUrl: store.storefrontTheme?.instagramUrl ?? null,
      // False once the plan's monthly orders are spent, so the bag says so before checkout.
      acceptingOrders,
      highlight: discount
        ? {
            code: discount.code,
            type: discount.type,
            value: discount.value === null ? null : toNumber(discount.value),
            endsAt: discount.endsAt,
          }
        : null,
    },
    collections,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      images: p.images,
      options: p.options ?? null,
      collectionIds: p.collections.map((c) => c.id),
      variants: p.variants.map((v) => publicVariant(v, store.lowStockThreshold)),
    })),
  };
}

/**
 * Every live storefront and its products, for the storefront sitemap. Capped well inside the
 * 50,000 URLs one sitemap file may hold.
 */
export async function listStorefrontPages() {
  const stores = await prisma.shopStore.findMany({
    where: { storefrontEnabled: true },
    select: { id: true, orgId: true, slug: true, updatedAt: true, checkoutVia: true },
    orderBy: { createdAt: "asc" },
    take: 2000,
  });
  const live = (
    await Promise.all(stores.map(async (s) => ((await commerceEnabled(s.orgId)) ? s : null)))
  ).filter((s) => s !== null);
  if (!live.length) return [];

  const products = await prisma.shopProduct.findMany({
    where: {
      storeId: { in: live.map((s) => s.id) },
      status: "ACTIVE",
      showOnStorefront: true,
    },
    select: { id: true, storeId: true, title: true, updatedAt: true, externalSource: true },
    orderBy: { updatedAt: "desc" },
    take: 45_000,
  });
  return live.map((s) => {
    const only = (sellableWhere(s) as { externalSource?: string }).externalSource;
    return {
      slug: s.slug,
      updatedAt: s.updatedAt,
      products: products
        .filter((p) => p.storeId === s.id && (!only || p.externalSource === only))
        .map((p) => ({ id: p.id, title: p.title, updatedAt: p.updatedAt })),
    };
  });
}
