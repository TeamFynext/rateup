import { FRONTEND_URL } from "../../../utils/constants/constants.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { sendProducts } from "../../whatsapp/catalog/products/product.service.js";
import { CatalogProductTypes } from "../../whatsapp/catalog/products/product.schema.js";
import { toNumber } from "./pricing.js";

/**
 * Publishes a product's variants to the store's Meta catalog — the one catalog WhatsApp,
 * Instagram and Facebook all read. Each variant is one catalog item (`id` = retailerId) in an
 * item group named after the product, so Meta shows them as options of one product.
 *
 * Meta's catalog is shared by every Meta surface, so the per-channel switches only hide an
 * item from Meta when every Meta channel is off; otherwise they decide where RateUp offers it.
 */
export async function publishProductToMeta(productId: string, removedRetailerIds: string[] = []) {
  const product = await prisma.shopProduct.findUnique({
    where: { id: productId },
    include: { variants: true, store: true },
  });
  if (!product) return { skipped: "product deleted" };
  const { store } = product;
  if (!store.metaCatalogId) {
    await prisma.shopProduct.update({
      where: { id: productId },
      data: { metaSyncStatus: "NOT_SYNCED", metaSyncError: "No Meta catalog connected" },
    });
    return { skipped: "no catalog" };
  }
  if (product.externalSource) {
    // Products mirrored from Shopify reach Meta through the store's own Meta channel.
    return { skipped: "mirrored product" };
  }

  const onMeta =
    product.status === "ACTIVE" &&
    (product.showOnWhatsapp || product.showOnInstagram || product.showOnFacebook);
  const link =
    product.productUrl ||
    `${FRONTEND_URL}/s/${store.slug}?product=${encodeURIComponent(product.id)}`;
  const image = product.images[0];

  const requests: { method: "UPDATE" | "DELETE"; data: Record<string, unknown> }[] = [];
  for (const v of product.variants) {
    const image_link = v.imageUrl || image;
    const inStock = !v.trackInventory || v.stock > 0 || v.allowBackorder;
    const compareAt = v.compareAtPrice ? toNumber(v.compareAtPrice) : null;
    const price = toNumber(v.price);
    const data: Record<string, unknown> = {
      id: v.retailerId,
      title: product.variants.length > 1 ? `${product.title} — ${v.title}` : product.title,
      description: product.description || product.title,
      availability: inStock ? "in stock" : "out of stock",
      condition: "new",
      // Meta wants the regular price in `price` and the reduced one in `sale_price`.
      price: `${(compareAt ?? price).toFixed(2)} ${store.currency}`,
      ...(compareAt ? { sale_price: `${price.toFixed(2)} ${store.currency}` } : {}),
      link,
      brand: product.brand || store.name,
      item_group_id: product.id,
      visibility: onMeta ? "published" : "hidden",
      ...(product.category ? { google_product_category: product.category } : {}),
      ...(image_link ? { image_link } : {}),
      ...(product.images.length > 1 ? { additional_image_link: product.images.slice(1, 10) } : {}),
      ...(v.trackInventory ? { inventory: Math.max(v.stock, 0) } : {}),
    };
    const values = (v.optionValues ?? {}) as Record<string, string>;
    for (const [name, value] of Object.entries(values)) {
      const key = name.toLowerCase();
      if (key === "size" || key === "color" || key === "colour" || key === "material")
        data[key === "colour" ? "color" : key] = value;
    }
    requests.push({ method: "UPDATE", data });
  }
  for (const retailerId of removedRetailerIds) {
    requests.push({ method: "DELETE", data: { id: retailerId } });
  }
  if (!requests.length) return { skipped: "nothing to publish" };

  try {
    const res = (await sendProducts(
      store.orgId,
      requests,
      CatalogProductTypes.PRODUCT_ITEM,
      store.metaCatalogId,
    )) as {
      validation_status?: { errors?: { message?: string }[]; retailer_id?: string }[];
    };
    const errors = (res?.validation_status ?? [])
      .flatMap((s) => s.errors ?? [])
      .map((e) => e.message)
      .filter(Boolean);
    await prisma.shopProduct.update({
      where: { id: productId },
      data: errors.length
        ? { metaSyncStatus: "REJECTED", metaSyncError: errors.join("; ").slice(0, 500) }
        : {
            metaSyncStatus: onMeta ? "LIVE" : "HIDDEN",
            metaSyncError: null,
            metaSyncedAt: new Date(),
          },
    });
    return { published: requests.length, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Meta rejected the update";
    log.warn({ err, productId }, "Publishing product to the Meta catalog failed");
    await prisma.shopProduct.update({
      where: { id: productId },
      data: { metaSyncStatus: "REJECTED", metaSyncError: message.slice(0, 500) },
    });
    throw err;
  }
}
