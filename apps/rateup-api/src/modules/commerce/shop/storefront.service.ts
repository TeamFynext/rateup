import prisma from "../../../utils/prisma.js";
import { toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";

/**
 * The public storefront at /s/<slug>: a link-in-bio shop. Read-only and unauthenticated, so
 * it returns only what a shopper may see — no stock counts beyond "low" and "sold out", no
 * costs, no internal ids other than the ones the cart sends back.
 */

const publicVariant = (
  v: {
    id: string;
    title: string;
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
    optionValues: v.optionValues ?? null,
    price: toNumber(v.price as number),
    compareAtPrice: v.compareAtPrice === null ? null : toNumber(v.compareAtPrice as number),
    imageUrl: v.imageUrl,
    soldOut,
    lowStock: !soldOut && v.trackInventory && v.stock <= (v.lowStockAt ?? lowStockThreshold),
  };
};

export async function getStorefront(slug: string) {
  const store = await prisma.shopStore.findUnique({ where: { slug } });
  if (!store || !store.storefrontEnabled) throw new ShopError("NOT_FOUND", "Shop not found");

  const [collections, products, wa, org] = await Promise.all([
    prisma.shopCollection.findMany({
      where: {
        storeId: store.id,
        products: { some: { status: "ACTIVE", showOnStorefront: true } },
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, imageUrl: true },
    }),
    prisma.shopProduct.findMany({
      where: { storeId: store.id, status: "ACTIVE", showOnStorefront: true },
      orderBy: { updatedAt: "desc" },
      include: {
        variants: { orderBy: { position: "asc" } },
        collections: { select: { id: true } },
      },
      take: 500,
    }),
    prisma.whatsappSettings.findFirst({
      where: { orgId: store.orgId, phone: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { phone: true },
    }),
    prisma.org.findUnique({ where: { id: store.orgId }, select: { name: true } }),
  ]);

  const banner = store.storefrontTheme?.banner ?? null;
  const discount = banner?.title
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
