import type {
  ShopProductStatus,
  ShopStore,
  ShopVariant,
} from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { enqueueCatalogPublish } from "../../../workers/bullmq/queues/shop.queue.js";
import { round2, toNumber } from "./pricing.js";
import { adjustStock, afterStockChange, createProduct, getProduct } from "./products.service.js";
import { notFound, ShopError } from "./shop.errors.js";

export interface BulkEditInput {
  variantIds: string[];
  price?: { mode: "set" | "percent" | "amount"; value: number };
  compareAtPrice?: { mode: "set"; value: number } | { mode: "clear" };
  stock?: { mode: "set" | "adjust"; value: number };
  status?: Exclude<ShopProductStatus, "ARCHIVED">;
}

interface Skip {
  variant: string;
  reason: string;
}

interface Change {
  price?: number;
  compareAtPrice?: number | null;
  /** The movement to log, and whether counting has to start first. */
  stock?: { delta: number; startTracking: boolean };
}

type Amount = Parameters<typeof toNumber>[0];
interface Edited {
  price: Amount;
  compareAtPrice: Amount;
  trackInventory: boolean;
  stock: number;
}

/** What one variant becomes, or why it is left alone. Pure, so the rules are testable. */
export function planVariant(v: Edited, input: BulkEditInput): Change | string {
  const change: Change = {};
  const current = toNumber(v.price);
  if (input.price) {
    const { mode, value } = input.price;
    const next =
      mode === "set" ? value : mode === "percent" ? current * (1 + value / 100) : current + value;
    if (round2(next) < 0) return "The price would go below zero";
    change.price = round2(next);
  }
  if (input.compareAtPrice) {
    change.compareAtPrice =
      input.compareAtPrice.mode === "clear" ? null : round2(input.compareAtPrice.value);
  }
  const price = change.price ?? current;
  const compareAt =
    change.compareAtPrice !== undefined
      ? change.compareAtPrice
      : v.compareAtPrice == null
        ? null
        : toNumber(v.compareAtPrice);
  if (compareAt !== null && compareAt < price)
    return "The original price would be lower than the price";

  if (input.stock) {
    const { mode, value } = input.stock;
    if (mode === "adjust" && !v.trackInventory) return "Stock isn't counted for it";
    const from = v.trackInventory ? v.stock : 0;
    const to = mode === "set" ? value : v.stock + value;
    if (to < 0) return "Stock would go below zero";
    change.stock = { delta: to - from, startTracking: !v.trackInventory };
  }
  return change;
}

/**
 * Edits many variants at once. Products that follow Shopify or WooCommerce keep their prices
 * and stock there, so their variants are skipped rather than changed and then overwritten.
 */
export async function bulkEditVariants(
  store: Pick<ShopStore, "id">,
  input: BulkEditInput,
  userId?: string,
) {
  if (!input.price && !input.compareAtPrice && !input.stock && !input.status)
    throw new ShopError("INVALID", "Choose something to change");
  const variants = await prisma.shopVariant.findMany({
    where: { storeId: store.id, id: { in: input.variantIds } },
    include: { product: { select: { id: true, title: true, externalSource: true } } },
  });
  if (!variants.length) throw notFound("Variant");

  const skipped: Skip[] = [];
  const planned: { variant: (typeof variants)[number]; change: Change }[] = [];
  const editsVariants = Boolean(input.price || input.compareAtPrice || input.stock);
  for (const variant of variants) {
    const name =
      variant.title === "Default"
        ? variant.product.title
        : `${variant.product.title} · ${variant.title}`;
    if (!editsVariants) continue;
    if (variant.product.externalSource) {
      skipped.push({ variant: name, reason: "Edit it in your online store" });
      continue;
    }
    const change = planVariant(variant, input);
    if (typeof change === "string") skipped.push({ variant: name, reason: change });
    else planned.push({ variant, change });
  }

  const productIds = [...new Set(planned.map((p) => p.variant.productId))];
  const moved = await prisma.$transaction(
    async (tx) => {
      const out: { before: ShopVariant; after: ShopVariant }[] = [];
      for (const { variant, change } of planned) {
        if (
          change.price !== undefined ||
          change.compareAtPrice !== undefined ||
          change.stock?.startTracking
        ) {
          await tx.shopVariant.update({
            where: { id: variant.id },
            data: {
              ...(change.price !== undefined ? { price: change.price } : {}),
              ...(change.compareAtPrice !== undefined
                ? { compareAtPrice: change.compareAtPrice }
                : {}),
              // Counting starts from zero so the logged movement is the whole opening stock.
              ...(change.stock?.startTracking ? { trackInventory: true, stock: 0 } : {}),
            },
          });
        }
        if (change.stock) {
          const { after } = await adjustStock(tx, variant.id, change.stock.delta, "ADJUSTMENT", {
            userId,
            note: "Bulk edit",
          });
          out.push({ before: variant, after });
        }
      }
      if (productIds.length && editsVariants) {
        await tx.shopProduct.updateMany({
          where: { id: { in: productIds } },
          data: { metaSyncStatus: "SYNCING" },
        });
      }
      if (input.status) {
        await tx.shopProduct.updateMany({
          where: { storeId: store.id, id: { in: [...new Set(variants.map((v) => v.productId))] } },
          data: { status: input.status, metaSyncStatus: "SYNCING" },
        });
      }
      return out;
    },
    { timeout: 30_000 },
  );

  for (const { before, after } of moved) await afterStockChange(before, after);
  const touched = input.status ? [...new Set(variants.map((v) => v.productId))] : productIds;
  await Promise.all(touched.map((id) => enqueueCatalogPublish(id)));
  return { updated: planned.length, skipped };
}

/**
 * A draft copy to start a similar product from. Stock starts at zero and SKUs get a suffix,
 * since neither the count nor the code belongs to the new product yet.
 */
export async function duplicateProduct(
  store: Pick<ShopStore, "id" | "orgId" | "mode">,
  productId: string,
  userId?: string,
) {
  if (store.mode !== "NATIVE")
    throw new ShopError("INVALID", "Your products come from your online store; add new ones there");
  const source = await getProduct(store.id, productId);
  return createProduct(
    store,
    {
      title: `${source.title} (copy)`.slice(0, 150),
      description: source.description,
      brand: source.brand,
      category: source.category,
      productUrl: source.productUrl,
      images: source.images,
      status: "DRAFT",
      options: Array.isArray(source.options) ? (source.options as never) : null,
      showOnWhatsapp: source.showOnWhatsapp,
      showOnInstagram: source.showOnInstagram,
      showOnFacebook: source.showOnFacebook,
      showOnStorefront: source.showOnStorefront,
      loyaltyMultiplier: toNumber(source.loyaltyMultiplier),
      collectionIds: source.collections.map((c) => c.id),
      variants: source.variants.map((v) => ({
        title: v.title,
        optionValues: (v.optionValues as never) ?? null,
        sku: v.sku ? `${v.sku}-copy` : null,
        price: toNumber(v.price),
        compareAtPrice: v.compareAtPrice === null ? null : toNumber(v.compareAtPrice),
        trackInventory: v.trackInventory,
        stock: 0,
        lowStockAt: v.lowStockAt,
        allowBackorder: v.allowBackorder,
        imageUrl: v.imageUrl,
        weightGrams: v.weightGrams,
      })),
    },
    userId,
  );
}
