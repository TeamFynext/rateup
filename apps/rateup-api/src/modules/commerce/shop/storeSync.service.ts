import type { ShopStore } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import type { CatalogProductCoreInput } from "../../whatsapp/catalog/products/product.schema.js";
import { addOrderEvent } from "./orders.service.js";
import { round2, toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";
import type { ShopAddress } from "./shop.types.js";

/**
 * Shopify and WooCommerce stores stay the source of truth for their products: they are
 * mirrored in here (so chat, the AI agent and the storefront can sell them) and paid orders
 * are written back. A mirrored variant keeps the store's own id as its Meta retailer id — the
 * id the store's Meta catalog already uses — so carts from that catalog map onto it.
 */

/** No WaCatalogProduct row has this catalog id, so the fetchers return every product. */
const NO_CATALOG = "__shop_mirror__";

type Source = "shopify" | "woocommerce";

async function fetchItems(orgId: string, source: Source): Promise<CatalogProductCoreInput[]> {
  if (source === "shopify") {
    const { getShopifyProductsForCatalog } =
      await import("../../whatsapp/catalog/products/product.service.js");
    return getShopifyProductsForCatalog(orgId, NO_CATALOG);
  }
  const { getWooProductsForCatalog } =
    await import("../../integrations/woocommerce/woocommerce.products.js");
  return getWooProductsForCatalog(orgId, NO_CATALOG);
}

/** "Linen throw - Sand" → base "Linen throw", variant "Sand". */
function splitTitle(title: string, siblings: number) {
  if (siblings < 2) return { base: title, variant: "Default" };
  const i = title.lastIndexOf(" - ");
  return i > 0
    ? { base: title.slice(0, i), variant: title.slice(i + 3) }
    : { base: title, variant: title };
}

export async function mirrorConnectedStore(store: ShopStore) {
  const source: Source | null =
    store.mode === "SHOPIFY" ? "shopify" : store.mode === "WOOCOMMERCE" ? "woocommerce" : null;
  if (!source) throw new ShopError("INVALID", "Connect Shopify or WooCommerce first");
  const items = await fetchItems(store.orgId, source);

  const groups = new Map<string, CatalogProductCoreInput[]>();
  for (const item of items) {
    const key = item.item_group_id || item.retailer_id;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  let created = 0;
  let updated = 0;
  for (const [groupId, group] of groups) {
    const first = group[0];
    const { base } = splitTitle(first.title, group.length);
    const images = (first.image ?? []).map((i) => i.url).filter(Boolean);
    const existing = await prisma.shopProduct.findUnique({
      where: {
        storeId_externalSource_externalId: {
          storeId: store.id,
          externalSource: source,
          externalId: groupId,
        },
      },
      include: { variants: true },
    });
    const productData = {
      title: base.slice(0, 150),
      description: first.description ?? null,
      brand: first.brand ?? null,
      productUrl: first.link ?? null,
      images,
    };
    const product = existing
      ? await prisma.shopProduct.update({ where: { id: existing.id }, data: productData })
      : await prisma.shopProduct.create({
          data: {
            ...productData,
            storeId: store.id,
            orgId: store.orgId,
            status: "ACTIVE",
            externalSource: source,
            externalId: groupId,
            metaSyncStatus: "LIVE",
          },
        });
    if (existing) updated++;
    else created++;

    for (const [position, item] of group.entries()) {
      const original = toNumber(item.price);
      const sale = item.sale_price === undefined ? original : toNumber(item.sale_price);
      const price = round2(Math.min(sale, original) || original);
      const data = {
        title: splitTitle(item.title, group.length).variant.slice(0, 80),
        price,
        compareAtPrice: original > price ? round2(original) : null,
        // The store keeps the real count; availability is all its catalog item tells us.
        trackInventory: true,
        stock: item.availability === "in stock" ? 999 : 0,
        allowBackorder: false,
        imageUrl: item.image?.[0]?.url ?? null,
        externalId: item.retailer_id,
        position,
      };
      await prisma.shopVariant.upsert({
        where: { storeId_retailerId: { storeId: store.id, retailerId: item.retailer_id } },
        create: { ...data, productId: product.id, storeId: store.id, retailerId: item.retailer_id },
        update: data,
      });
    }
  }
  log.info(
    { orgId: store.orgId, source, created, updated },
    "Store products mirrored into the shop",
  );
  return { source, created, updated, total: groups.size };
}

/**
 * A paid order from a mirrored store goes back to it as a paid order, so the merchant
 * fulfils it where they fulfil everything else. Shopify answers with its own order
 * webhooks, which is how its loyalty and automations hear about the sale.
 */
export async function writeBackPaidOrder(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true, items: { include: { variant: { include: { product: true } } } } },
  });
  if (!order || order.externalId || order.store.mode !== "SHOPIFY") return null;
  const mirrored = order.items.filter((i) => i.variant?.product.externalSource === "shopify");
  if (!mirrored.length) return null;

  const { createShopifyDraftOrderWithAddress, captureShopifyOrderPayment } =
    await import("../../integrations/shopify/shopify.catalog.js");
  const address = (order.shippingAddress ?? {}) as ShopAddress;
  const [first, ...rest] = (address.name ?? order.customerName ?? "").split(" ");
  try {
    const draft = await createShopifyDraftOrderWithAddress(
      order.orgId,
      mirrored.map((i) => ({
        retailerId: i.retailerId ?? i.variant!.retailerId,
        quantity: i.quantity,
        title: i.title,
        price: toNumber(i.unitPrice),
      })),
      {
        first_name: first,
        last_name: rest.join(" "),
        address1: address.line1,
        address2: address.line2,
        city: address.city,
        province: address.region,
        zip: address.postalCode,
        country_code: address.country,
        phone: address.phone ?? order.customerPhone ?? undefined,
      },
      order.shippingRate
        ? { name: order.shippingRate.name, charge: order.shippingRate.price }
        : null,
    );
    if (!draft) return null;
    const shopifyOrderId = await captureShopifyOrderPayment(order.orgId, String(draft.id));
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        externalProvider: "shopify",
        externalId: String(shopifyOrderId === true ? draft.id : shopifyOrderId),
      },
    });
    await addOrderEvent(order.id, "external", "Sent to Shopify as a paid order");
    return shopifyOrderId;
  } catch (err) {
    log.warn({ err, orderId }, "Writing a shop order back to Shopify failed");
    await addOrderEvent(
      order.id,
      "external_failed",
      "Could not create this order in Shopify — add it there by hand",
    );
    return null;
  }
}
