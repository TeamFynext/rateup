import { PlatformType } from "../../../../generated/prisma/client.js";
import { inStoreCheckout, sellableWhere } from "./checkoutVia.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { enqueueCatalogPublish } from "../../../workers/bullmq/queues/shop.queue.js";
import { findOpenSession } from "../../loyalty/messaging/channels/whatsapp/session.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import {
  syncConnectedCatalog,
  syncWaCatalogs,
  updateConnectWaCatalog,
} from "../../whatsapp/catalog/catalog.service.js";
import { sendMetaMessage } from "../../whatsapp/meta/metaMessage.service.js";
import { checkoutUrl } from "./events.js";
import { checkoutLinkFor } from "./externalCheckout.service.js";
import { formatMoney } from "./money.js";
import { createDraftOrder } from "./orders.service.js";
import { toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";
import { storefrontProductUrl } from "./storefrontLinks.js";

/**
 * The guided setup's server side: what the merchant has connected, finding their Meta
 * catalog, and the "try it yourself" actions (a product card to their own WhatsApp, a test
 * order) that let them see the shop work before a customer does.
 */

export async function whatsappStatus(orgId: string) {
  const numbers = await prisma.whatsappSettings.findMany({
    where: { orgId, phoneId: { not: null } },
    select: { id: true, phone: true, phoneId: true, wabaId: true },
    orderBy: { createdAt: "asc" },
  });
  return {
    connected: numbers.length > 0,
    numbers: numbers.map((n) => ({
      id: n.id,
      phone: n.phone,
      phoneId: n.phoneId,
      wabaId: n.wabaId,
    })),
  };
}

/**
 * Pulls the org's catalogs from Meta, and the ones already connected to its WhatsApp numbers.
 * A store with no catalog yet gets the connected one (else the only one), so the common case
 * needs no second click.
 */
export async function findCatalogs(store: {
  id: string;
  orgId: string;
  metaCatalogId: string | null;
}) {
  const wa = await whatsappStatus(store.orgId);
  if (!wa.connected) {
    return {
      whatsapp: wa,
      catalogs: [],
      selected: null,
      warnings: ["Connect a WhatsApp number first"],
    };
  }
  const warnings: string[] = [];
  for (const sync of [syncWaCatalogs, syncConnectedCatalog]) {
    try {
      const results = (await sync(store.orgId)) as { warning?: string }[];
      for (const r of results) if (r.warning) warnings.push(r.warning);
    } catch (err) {
      log.warn({ err, orgId: store.orgId }, "Catalog sync from Meta failed");
      warnings.push("Meta didn't answer; try again in a minute");
    }
  }
  const catalogs = await prisma.whatsappCatalog.findMany({
    where: { orgId: store.orgId },
    select: {
      catalogId: true,
      name: true,
      connectedWaPhoneIds: { select: { whatsappSettingsPhoneId: true } },
    },
  });
  let selected = store.metaCatalogId;
  if (!selected && catalogs.length) {
    const connected = catalogs.find((c) => c.connectedWaPhoneIds.length > 0);
    const pick = connected ?? (catalogs.length === 1 ? catalogs[0] : null);
    if (pick) {
      await connectCatalog(store, pick.catalogId);
      selected = pick.catalogId;
    }
  }
  return {
    whatsapp: wa,
    catalogs: catalogs.map((c) => ({
      catalogId: c.catalogId,
      name: c.name,
      connectedToWhatsapp: c.connectedWaPhoneIds.length > 0,
    })),
    selected,
    warnings: [...new Set(warnings)],
  };
}

/**
 * Makes `catalogId` the store's catalog: links it to every WhatsApp account (so carts can be
 * sent from it) and publishes every product the store owns, including ones added before a
 * catalog existed.
 */
export async function connectCatalog(store: { id: string; orgId: string }, catalogId: string) {
  const catalog = await prisma.whatsappCatalog.findFirst({
    where: { catalogId, orgId: store.orgId },
  });
  if (!catalog) throw new ShopError("NOT_FOUND", "That catalog isn't on this account");
  await prisma.shopStore.update({ where: { id: store.id }, data: { metaCatalogId: catalogId } });

  const wabas = await prisma.whatsappSettings.findMany({
    where: { orgId: store.orgId, wabaId: { not: null } },
    select: { wabaId: true },
    distinct: ["wabaId"],
  });
  for (const { wabaId } of wabas) {
    await updateConnectWaCatalog(wabaId!, store.orgId, catalogId).catch((err) =>
      log.warn({ err, wabaId }, "Could not link the catalog to a WhatsApp account"),
    );
  }
  return republishStore(store.id);
}

/** Queues every product the store owns (not mirrored ones) for the Meta catalog. */
export async function republishStore(storeId: string) {
  const products = await prisma.shopProduct.findMany({
    where: { storeId, externalSource: null, status: { not: "ARCHIVED" } },
    select: { id: true },
  });
  await prisma.shopProduct.updateMany({
    where: { id: { in: products.map((p) => p.id) } },
    data: { metaSyncStatus: "SYNCING", metaSyncError: null },
  });
  await Promise.all(products.map((p) => enqueueCatalogPublish(p.id)));
  return { republished: products.length };
}

/** The business number a merchant writes to so their own 24-hour window opens. */
async function businessNumber(orgId: string) {
  const wa = await whatsappStatus(orgId);
  const first = wa.numbers[0];
  if (!first?.phone) throw new ShopError("INVALID", "Connect a WhatsApp number first");
  return { phoneId: first.phoneId, digits: first.phone.replace(/\D/g, "") };
}

/**
 * Sends one product, as a customer would get it, to the merchant's own WhatsApp. WhatsApp
 * only allows it inside the 24-hour window, so when that is closed the answer carries a
 * wa.me link that opens the chat with the business number to start one.
 */
export async function sendProductToMe(
  store: {
    id: string;
    orgId: string;
    slug: string;
    metaCatalogId: string | null;
    currency: string;
  },
  productId: string,
  rawPhone: string,
) {
  const product = await prisma.shopProduct.findFirst({
    where: { id: productId, storeId: store.id },
    include: { variants: { orderBy: { position: "asc" } } },
  });
  if (!product) throw new ShopError("NOT_FOUND", "Product not found");
  const to = parsePhoneforWa(rawPhone.replace(/[^\d+]/g, ""));
  if (to.length < 7)
    throw new ShopError("INVALID", "Enter your WhatsApp number with the country code");
  const business = await businessNumber(store.orgId);
  const session = await findOpenSession({
    orgId: store.orgId,
    phone: to,
    phoneId: business.phoneId,
  });
  if (!session) {
    return {
      sent: false as const,
      reason: "window_closed" as const,
      openChatUrl: `https://wa.me/${business.digits}?text=${encodeURIComponent("Hi")}`,
    };
  }
  const variant = product.variants[0];
  const live = product.metaSyncStatus === "LIVE" && store.metaCatalogId && variant;
  const payload = live
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
          type: "product",
          body: { text: product.title.slice(0, 1024) },
          action: { catalog_id: store.metaCatalogId, product_retailer_id: variant.retailerId },
        },
      }
    : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: true,
          body: `${product.title}${variant ? ` — ${formatMoney(toNumber(variant.price), store.currency)}` : ""}\n${storefrontProductUrl(store.slug, product)}`,
        },
      };
  const result = await sendMetaMessage({
    platform: PlatformType.WHATSAPP,
    orgId: store.orgId,
    to,
    sourceIdentifier: session.phoneId ?? business.phoneId ?? undefined,
    payload,
    messageType: "INBOX",
    enforcePlanLimits: false,
  });
  if (!result.ok)
    throw new ShopError("PAYMENT_FAILED", result.error ?? "WhatsApp refused the message");
  return { sent: true as const, asProductCard: Boolean(live) };
}

/**
 * A real draft order for one product, marked as a test, with its hosted checkout link. With
 * a gateway in test mode the merchant can pay it end to end; it counts toward setup.
 */
export async function createTestOrder(
  store: Parameters<typeof createDraftOrder>[0]["store"],
  input: { productId?: string | null; phone?: string | null; actorUserId: string | null },
) {
  const variant = await prisma.shopVariant.findFirst({
    where: {
      storeId: store.id,
      product: {
        status: "ACTIVE",
        ...sellableWhere(store),
        ...(input.productId ? { id: input.productId } : {}),
      },
    },
    orderBy: [{ product: { updatedAt: "desc" } }, { position: "asc" }],
  });
  if (!variant) throw new ShopError("INVALID", "Add an active product first");
  const order = await createDraftOrder({
    store,
    items: [{ variantId: variant.id, quantity: 1 }],
    channel: "MANUAL",
    source: "test",
    customer: { name: "Test order", phone: input.phone ?? null },
    createdById: input.actorUserId,
    note: "Test order from setup",
  });
  return {
    orderId: order.id,
    number: order.number,
    checkoutUrl: (await checkoutLinkFor(order.id)) ?? checkoutUrl(order.checkoutToken!),
    // Opening the link creates a real order in the store, which the merchant then deletes there.
    createsStoreOrder: inStoreCheckout(store.checkoutVia),
  };
}
