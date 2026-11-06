import type { Prisma, ShopStore } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { enqueueStoreMirror } from "../../../workers/bullmq/queues/shop.queue.js";
import type { CatalogProductCoreInput } from "../../whatsapp/catalog/products/product.schema.js";
import { inStoreCheckout } from "./checkoutVia.js";
import { addOrderEvent } from "./orders.service.js";
import { round2, toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";
import type { ShopAddress } from "./shop.types.js";

/**
 * Shopify and WooCommerce stores stay the source of truth for their products: they are
 * mirrored in here (so chat, the AI agent and the storefront can sell them) and RateUp-checkout
 * orders are written back. A mirrored variant keeps the store's own id as its Meta retailer
 * id — the id the store's Meta catalog already uses — so carts from that catalog map onto it.
 */

/** No WaCatalogProduct row has this catalog id, so the fetchers return every product. */
const NO_CATALOG = "__shop_mirror__";

export type StoreSource = "shopify" | "woocommerce";

const sourceOf = (mode: ShopStore["mode"]): StoreSource | null =>
  mode === "SHOPIFY" ? "shopify" : mode === "WOOCOMMERCE" ? "woocommerce" : null;

export async function fetchStoreItems(
  orgId: string,
  source: StoreSource,
): Promise<CatalogProductCoreInput[]> {
  if (source === "shopify") {
    const { getShopifyProductsForCatalog } =
      await import("../../whatsapp/catalog/products/product.service.js");
    return getShopifyProductsForCatalog(orgId, NO_CATALOG, { requireImage: false });
  }
  const { getWooProductsForCatalog } =
    await import("../../integrations/woocommerce/woocommerce.products.js");
  return getWooProductsForCatalog(orgId, NO_CATALOG);
}

/** "Linen throw - Sand" → base "Linen throw", variant "Sand". */
export function splitTitle(title: string, siblings: number) {
  if (siblings < 2) return { base: title, variant: "Default" };
  const i = title.lastIndexOf(" - ");
  return i > 0
    ? { base: title.slice(0, i), variant: title.slice(i + 3) }
    : { base: title, variant: title };
}

/**
 * The store's count when it keeps one; otherwise RateUp doesn't track it and the store's
 * availability decides, so an untracked product never shows a made-up number.
 */
function stockOf(item: CatalogProductCoreInput & { inventory?: number }) {
  if (typeof item.inventory === "number" && item.availability === "in stock")
    return { trackInventory: true, stock: Math.max(0, item.inventory) };
  if (item.availability === "in stock") return { trackInventory: false, stock: 0 };
  return { trackInventory: true, stock: 0 };
}

export async function mirrorConnectedStore(store: ShopStore, fetched?: CatalogProductCoreInput[]) {
  const source = sourceOf(store.mode);
  if (!source) throw new ShopError("INVALID", "Connect Shopify or WooCommerce first");
  const items = fetched ?? (await fetchStoreItems(store.orgId, source));

  // Prices are copied as numbers, so one in another currency would sell at the wrong amount.
  const currency = store.currency.toUpperCase();
  const otherCurrency = items.filter(
    (i) => i.currencyCode && i.currencyCode.toUpperCase() !== currency,
  );
  const groups = new Map<string, CatalogProductCoreInput[]>();
  for (const item of items) {
    if (otherCurrency.includes(item)) continue;
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
      // Back in the store after it was gone.
      ...(existing?.status === "ARCHIVED" && { status: "ACTIVE" as const }),
      // Meta's catalog refuses a product without an image; it is sold in the shop only.
      metaSyncStatus: images.length ? ("LIVE" as const) : ("HIDDEN" as const),
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
        ...stockOf(item),
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
    if (existing)
      await retireGoneVariants(
        product.id,
        group.map((i) => i.retailer_id),
      );
  }

  // Deleted or unpublished in the store: no longer sold here. Skipped when the store sent
  // nothing at all, which is likelier a hiccup than a store emptied overnight.
  let archived = 0;
  if (items.length) {
    ({ count: archived } = await prisma.shopProduct.updateMany({
      where: {
        storeId: store.id,
        externalSource: source,
        status: { not: "ARCHIVED" },
        externalId: { notIn: [...groups.keys()] },
      },
      data: { status: "ARCHIVED" },
    }));
  }
  await prisma.shopStore.update({ where: { id: store.id }, data: { mirroredAt: new Date() } });

  const otherCurrencies = [...new Set(otherCurrency.map((i) => i.currencyCode!.toUpperCase()))];
  log.info(
    { orgId: store.orgId, source, created, updated, archived, skipped: otherCurrency.length },
    "Store products mirrored into the shop",
  );
  return {
    source,
    created,
    updated,
    archived,
    total: groups.size,
    skipped: otherCurrency.length
      ? {
          count: otherCurrency.length,
          reason: `Priced in ${otherCurrencies.join(", ")}, but this shop sells in ${currency}`,
        }
      : null,
  };
}

/**
 * Variants the store no longer has stop selling: removed outright when no order points at
 * them, otherwise kept (for order history) at zero tracked stock.
 */
async function retireGoneVariants(productId: string, keep: string[]) {
  const gone = { productId, retailerId: { notIn: keep } };
  await prisma.shopVariant.deleteMany({ where: { ...gone, orderItems: { none: {} } } });
  await prisma.shopVariant.updateMany({
    where: gone,
    data: { trackInventory: true, stock: 0, allowBackorder: false },
  });
}

/** The background refresh: a store that stopped following or lost its connection is left alone. */
export async function mirrorStoreById(storeId: string) {
  const store = await prisma.shopStore.findUnique({ where: { id: storeId } });
  const source = store && sourceOf(store.mode);
  if (!store || !source) return null;
  const connected = await prisma.integration.findFirst({
    where: { orgId: store.orgId, name: source, active: true },
    select: { id: true },
  });
  if (!connected) return null;
  return mirrorConnectedStore(store);
}

/** A product webhook from the store: the shop following it copies its products in again soon. */
export async function scheduleStoreMirror(orgId: string, source: StoreSource) {
  const store = await prisma.shopStore.findUnique({
    where: { orgId },
    select: { id: true, mode: true },
  });
  if (!store || sourceOf(store.mode) !== source) return;
  await enqueueStoreMirror(store.id);
}

/** Daily, for every shop that follows a store. */
export async function mirrorFollowedStores() {
  const stores = await prisma.shopStore.findMany({
    where: { mode: { in: ["SHOPIFY", "WOOCOMMERCE"] } },
    select: { id: true },
  });
  for (const store of stores) {
    await mirrorStoreById(store.id).catch((err) =>
      log.warn({ err, storeId: store.id }, "Daily store mirror failed"),
    );
  }
  return { stores: stores.length };
}

/**
 * Stops following Shopify or WooCommerce: the mirrored products become the shop's own (kept
 * as they are, edited in RateUp from now on) and RateUp takes the payments again.
 */
export async function stopFollowingStore(store: ShopStore) {
  const source = sourceOf(store.mode);
  if (!source) throw new ShopError("INVALID", "This shop doesn't follow another store");
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.shopProduct.updateMany({
      where: { storeId: store.id, externalSource: source },
      data: { externalSource: null, externalId: null },
    });
    const updated = await tx.shopStore.update({
      where: { id: store.id },
      data: { mode: "NATIVE", checkoutVia: "RATEUP" },
    });
    return { store: updated, products: count };
  });
}

// ─── Orders written back to the store ───────────────────────────────────────

type WriteBackOrder = Prisma.ShopOrderGetPayload<{
  include: { store: true; items: { include: { variant: { include: { product: true } } } } };
}>;

/** Refused while another write-back of the order runs, so the job retries rather than drops. */
async function withWriteBackLock<T>(orderId: string, fn: () => Promise<T>) {
  const key = `shop:writeback:${orderId}`;
  const got = await redis.set(key, "1", "EX", 120, "NX").catch(() => "OK");
  if (got !== "OK") throw new Error("Another write-back of this order is running");
  try {
    return await fn();
  } finally {
    await redis.del(key).catch(() => {});
  }
}

interface WriteBackOpts {
  lastAttempt?: boolean;
}

/**
 * A RateUp-checkout order from a shop that follows a store goes into that store when it is
 * placed, so the merchant fulfils it there: paid as paid, a cash or transfer order as awaiting
 * payment and marked paid there once the money arrives. Store-checkout orders are already
 * there. Runs as a retried job (`enqueueStoreWriteBack`): a failure throws, and staff are told
 * to add the order by hand only once the last attempt fails.
 */
export async function writeBackOrder(
  orderId: string,
  phase: "placed" | "paid",
  opts: WriteBackOpts = {},
) {
  return withWriteBackLock(orderId, async () => {
    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { store: true, items: { include: { variant: { include: { product: true } } } } },
    });
    const source = order && sourceOf(order.store.mode);
    if (!order || !source || inStoreCheckout(order.checkoutVia)) return null;
    const paid = order.paymentStatus === "PAID";
    if (order.externalId) {
      if (!paid || order.externalPaidAt || order.externalProvider !== source) return null;
      return markPaidInStore(order, source, opts);
    }
    // An online payment places and pays in one go; it is written once, as paid.
    const offline = order.paymentStatus === "COD_PENDING" || order.paymentMethod === "bank";
    if (phase === "placed" && (paid || !offline)) return null;
    return source === "shopify"
      ? writeBackToShopify(order, paid, opts)
      : writeBackToWoo(order, paid, opts);
  });
}

async function failed(order: WriteBackOrder, opts: WriteBackOpts, message: string, err: unknown) {
  log.warn({ err, orderId: order.id, lastAttempt: opts.lastAttempt }, message);
  if (opts.lastAttempt ?? true) await addOrderEvent(order.id, "external_failed", message);
  throw err;
}

async function markPaidInStore(order: WriteBackOrder, source: StoreSource, opts: WriteBackOpts) {
  const label = source === "shopify" ? "Shopify" : "WooCommerce";
  try {
    if (source === "shopify") {
      const { markShopifyOrderPaid } =
        await import("../../integrations/shopify/shopify.shopOrders.js");
      await markShopifyOrderPaid(order.orgId, order.externalId!);
    } else {
      const { markWooOrderPaid } =
        await import("../../integrations/woocommerce/woocommerce.shopOrders.js");
      await markWooOrderPaid(order.orgId, order.externalId!);
    }
  } catch (err) {
    return failed(
      order,
      opts,
      `Could not mark this order paid in ${label} — mark it paid there by hand`,
      err,
    );
  }
  await prisma.shopOrder.update({
    where: { id: order.id },
    data: { externalPaidAt: new Date() },
  });
  await addOrderEvent(order.id, "external", `Marked paid in ${label}`);
  return order.externalId;
}

function addressParts(order: WriteBackOrder) {
  const address = (order.shippingAddress ?? {}) as ShopAddress;
  const [first, ...rest] = (address.name ?? order.customerName ?? "").split(" ");
  return { address, first, last: rest.join(" ") };
}

/** Coupon and points together, as the stores take one order-level discount. */
const discountOf = (order: WriteBackOrder) =>
  round2(toNumber(order.discountTotal) + toNumber(order.pointsDiscount));

const taxOnTop = (order: WriteBackOrder) =>
  order.store.pricesIncludeTax ? 0 : toNumber(order.taxTotal);

/**
 * Saved with a few quick retries: the store order already exists, and a job retry after a
 * lost record would create a second one in WooCommerce (Shopify's is found again).
 */
async function recordWriteBack(
  order: WriteBackOrder,
  source: StoreSource,
  created: { id: string; name: string | null },
  paid: boolean,
) {
  const label = source === "shopify" ? "Shopify" : "WooCommerce";
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          externalProvider: source,
          externalId: created.id,
          externalName: created.name,
          ...(paid && { externalPaidAt: new Date() }),
        },
      });
      break;
    } catch (err) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      log.error({ err, orderId: order.id, externalId: created.id }, "Write-back not recorded");
      await addOrderEvent(
        order.id,
        "external_failed",
        `Created in ${label} as ${created.name ?? created.id}, but RateUp could not link it — check it there`,
      ).catch(() => {});
      return;
    }
  }
  await addOrderEvent(
    order.id,
    "external",
    paid ? `Sent to ${label} as a paid order` : `Sent to ${label}, awaiting payment`,
    { externalId: created.id },
  );
}

async function writeBackToShopify(order: WriteBackOrder, paid: boolean, opts: WriteBackOpts) {
  const mirrored = order.items.filter((i) => i.variant?.product.externalSource === "shopify");
  if (!mirrored.length) return null;
  const shop = await import("../../integrations/shopify/shopify.shopOrders.js");
  const resume = await import("../../integrations/shopify/shopify.orders.js");
  const { address, first, last } = addressParts(order);
  const shipping = order.shippingRate as { name?: string } | null;
  let created: { id: string; name: string | null };
  try {
    const earlier = await resume.findShopifyWriteBack(order.orgId, order.id, order.createdAt);
    if (earlier && "order" in earlier) created = earlier.order;
    else if (earlier)
      created = await resume.completeShopifyWriteBackDraft(order.orgId, earlier.draftId, paid);
    else
      created = await shop.createShopifyWriteBackOrder(order.orgId, {
        rateupOrderId: order.id,
        orderNumber: order.number,
        paid,
        paymentMethod: order.paymentMethod ?? "online",
        currency: order.currency,
        lines: mirrored.map((i) => ({
          retailerId: i.retailerId ?? i.variant!.retailerId,
          title: i.title,
          quantity: i.quantity,
          unitPrice: toNumber(i.unitPrice),
        })),
        address: address.line1
          ? {
              first_name: first,
              last_name: last,
              address1: address.line1,
              address2: address.line2,
              city: address.city,
              province: address.region,
              zip: address.postalCode,
              country_code: address.country,
              phone: address.phone ?? order.customerPhone ?? undefined,
            }
          : null,
        email: order.customerEmail,
        phone: order.customerPhone ? `+${order.customerPhone.replace(/^\+/, "")}` : null,
        shipping:
          toNumber(order.shippingTotal) > 0 || shipping?.name
            ? { name: shipping?.name ?? "Delivery", price: toNumber(order.shippingTotal) }
            : null,
        discount: discountOf(order),
        taxOnTop: taxOnTop(order),
      });
  } catch (err) {
    return failed(
      order,
      opts,
      "Could not create this order in Shopify — add it there by hand",
      err,
    );
  }
  await recordWriteBack(order, "shopify", created, paid);
  return created.id;
}

async function writeBackToWoo(order: WriteBackOrder, paid: boolean, opts: WriteBackOpts) {
  const mirrored = order.items.filter((i) => i.variant?.product.externalSource === "woocommerce");
  if (!mirrored.length) return null;
  const { createWooWriteBackOrder } =
    await import("../../integrations/woocommerce/woocommerce.shopOrders.js");
  const { address, first, last } = addressParts(order);
  const shipping = order.shippingRate as { name?: string } | null;
  let created: Awaited<ReturnType<typeof createWooWriteBackOrder>>;
  try {
    created = await createWooWriteBackOrder(order.orgId, {
      rateupOrderId: order.id,
      paid,
      currency: order.currency,
      paymentMethod: order.paymentMethod ?? "online",
      lines: mirrored.map((i) => ({
        productExternalId: i.variant!.product.externalId,
        retailerId: i.retailerId ?? i.variant!.retailerId,
        quantity: i.quantity,
        total: toNumber(i.lineTotal),
      })),
      address: {
        first_name: first,
        last_name: last,
        address_1: address.line1,
        address_2: address.line2,
        city: address.city,
        state: address.region,
        postcode: address.postalCode,
        country: address.country,
        phone: address.phone ?? order.customerPhone ?? undefined,
      },
      email: order.customerEmail,
      shipping:
        toNumber(order.shippingTotal) > 0 || shipping?.name
          ? { name: shipping?.name ?? "Delivery", price: toNumber(order.shippingTotal) }
          : null,
      discount: discountOf(order),
      tax: taxOnTop(order),
    });
  } catch (err) {
    return failed(
      order,
      opts,
      "Could not create this order in WooCommerce — add it there by hand",
      err,
    );
  }
  await recordWriteBack(
    order,
    "woocommerce",
    { id: created.id, name: created.number ? `#${created.number}` : null },
    paid,
  );
  return created.id;
}

/**
 * Cancelled in RateUp: the store's copy goes too, so nobody ships it. An unpaid checkout draft
 * in Shopify is deleted, since Shopify drafts never expire on their own. Best effort; a
 * failure is left on the order for staff.
 */
export async function cancelInStore(orderId: string) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order?.externalId || !order.externalProvider) return;
  const provider = order.externalProvider as StoreSource;
  const label = provider === "shopify" ? "Shopify" : "WooCommerce";
  // A store-checkout order that never got paid is still the store's checkout draft.
  const draft = inStoreCheckout(order.checkoutVia) && order.paymentStatus !== "PAID";
  try {
    if (provider === "shopify") {
      const shop = await import("../../integrations/shopify/shopify.shopOrders.js");
      if (draft) await shop.deleteShopifyDraftOrder(order.orgId, order.externalId);
      else await shop.cancelShopifyOrder(order.orgId, order.externalId);
    } else {
      const { cancelWooOrder } =
        await import("../../integrations/woocommerce/woocommerce.shopOrders.js");
      await cancelWooOrder(order.orgId, order.externalId);
    }
    await addOrderEvent(
      order.id,
      "external",
      draft ? `Checkout closed in ${label}` : `Cancelled in ${label} too`,
    );
  } catch (err) {
    log.warn({ err, orderId }, "Cancelling a shop order in the store failed");
    await addOrderEvent(
      order.id,
      "external_failed",
      `Could not cancel this order in ${label} — cancel it there by hand`,
    );
  }
}
