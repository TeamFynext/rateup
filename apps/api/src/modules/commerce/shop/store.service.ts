import { randomBytes } from "node:crypto";

import type { Prisma, ShopStore } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { assertCheckoutVia } from "./externalCheckout.service.js";
import { notFound, ShopError } from "./shop.errors.js";
import type { ShopNotificationSettings } from "./shop.types.js";
import { storeLogoUrl } from "./storeLogo.js";
import { getSubscriptionGate } from "../../settings/subscription/subscription.service.js";

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.shopStore.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${slugify(base).slice(0, 33)}-${randomBytes(3).toString("hex")}`;
  }
  return `shop-${randomBytes(6).toString("hex")}`;
}

/**
 * Every org has at most one store, created the first time anything asks for it. Currency and
 * the meaning of a point come from the loyalty programme when there is one, so a merchant who
 * already set those up does not set them twice.
 */
export async function getOrCreateStore(orgId: string): Promise<ShopStore> {
  const existing = await prisma.shopStore.findUnique({ where: { orgId } });
  if (existing) return { ...existing, logoUrl: storeLogoUrl(existing.logoUrl) };

  const [org, program, catalog] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId }, select: { name: true, logo: true } }),
    prisma.loyaltyProgram.findUnique({ where: { orgId }, select: { currencyCode: true } }),
    // Only the catalog connected to a WhatsApp number can send product cards; with none,
    // the store starts without one and setup picks it (and connects it on Meta).
    prisma.whatsappCatalog.findFirst({
      where: { orgId, connectedWaPhoneIds: { some: {} } },
      select: { catalogId: true },
    }),
  ]);
  if (!org) throw notFound("Organisation");

  // A shop starts with products of its own; following a connected store is the merchant's
  // choice, made with "Keep in sync" in the import.
  try {
    return await prisma.shopStore.create({
      data: {
        orgId,
        name: org.name,
        slug: await uniqueSlug(org.name),
        logoUrl: storeLogoUrl(org.logo),
        currency: program?.currencyCode ?? "USD",
        metaCatalogId: catalog?.catalogId ?? null,
      },
    });
  } catch (err) {
    // Two first requests raced; the other one created it.
    const raced = await prisma.shopStore.findUnique({ where: { orgId } });
    if (raced) return raced;
    throw err;
  }
}

export async function getStoreById(storeId: string) {
  const store = await prisma.shopStore.findUnique({ where: { id: storeId } });
  if (!store) throw notFound("Store");
  return store;
}

export async function updateStore(orgId: string, data: Prisma.ShopStoreUpdateInput) {
  const store = await getOrCreateStore(orgId);
  if (typeof data.slug === "string") {
    const slug = slugify(data.slug);
    const taken = await prisma.shopStore.findFirst({
      where: { slug, NOT: { id: store.id } },
      select: { id: true },
    });
    if (taken) throw new ShopError("CONFLICT", "That storefront address is already taken");
    data.slug = slug;
  }
  if (typeof data.checkoutVia === "string") await assertCheckoutVia(store, data.checkoutVia);
  const discountId = (data as { cartReminderDiscountId?: unknown }).cartReminderDiscountId;
  if (typeof discountId === "string") {
    const own = await prisma.shopDiscount.findFirst({
      where: { id: discountId, storeId: store.id },
      select: { id: true },
    });
    if (!own) throw new ShopError("INVALID", "That discount doesn't exist");
  }
  if (data.notifications && typeof data.notifications === "object") {
    data.notifications = mergeNotifications(store.notifications, data.notifications);
  }
  return prisma.shopStore.update({ where: { id: store.id }, data });
}

/**
 * Applies a notifications update on top of what is saved, per message and per field. A page
 * that saves only the switches must not wipe the words another page wrote; `body: null`
 * is how a store goes back to the default words.
 */
export function mergeNotifications(saved: unknown, update: unknown): ShopNotificationSettings {
  const current = (saved ?? {}) as Record<string, Record<string, unknown>>;
  const merged: Record<string, Record<string, unknown>> = { ...current };
  for (const [key, value] of Object.entries((update ?? {}) as Record<string, object>)) {
    merged[key] = { ...current[key], ...value };
  }
  return merged as ShopNotificationSettings;
}

/** Hands out the next order number atomically. */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  storeId: string,
): Promise<number> {
  const { orderNumberSeq } = await tx.shopStore.update({
    where: { id: storeId },
    data: { orderNumberSeq: { increment: 1 } },
    select: { orderNumberSeq: true },
  });
  return orderNumberSeq;
}

// ─── Shipping rates ──────────────────────────────────────────────────────────

export async function listShippingRates(storeId: string) {
  return prisma.shopShippingRate.findMany({
    where: { storeId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function upsertShippingRate(
  storeId: string,
  id: string | undefined,
  data: Omit<Prisma.ShopShippingRateUncheckedCreateInput, "storeId" | "id">,
) {
  if (id) {
    const { count } = await prisma.shopShippingRate.updateMany({ where: { id, storeId }, data });
    if (!count) throw notFound("Shipping rate");
    return prisma.shopShippingRate.findUniqueOrThrow({ where: { id } });
  }
  return prisma.shopShippingRate.create({ data: { ...data, storeId } });
}

export async function deleteShippingRate(storeId: string, id: string) {
  const { count } = await prisma.shopShippingRate.deleteMany({ where: { id, storeId } });
  if (!count) throw notFound("Shipping rate");
}

/** The active rates that serve a destination; a rate with no countries serves everywhere. */
export async function ratesForDestination(storeId: string, country?: string | null) {
  const rates = await prisma.shopShippingRate.findMany({
    where: { storeId, active: true },
    orderBy: [{ position: "asc" }, { price: "asc" }],
  });
  const code = country?.toUpperCase();
  return rates.filter((r) => r.countries.length === 0 || (code && r.countries.includes(code)));
}

/**
 * Whether the org's plan includes Commerce (`whatsapp.catalog`). The session routes use the
 * shared subscription guard; this is for the doors without a session — the storefront, chat
 * carts and the AI agent's tools. An expired plan sells nothing new.
 */
export async function commerceEnabled(orgId: string): Promise<boolean> {
  const gate = await getSubscriptionGate(orgId);
  if (!gate) return false;
  if (new Date(gate.expiresAt).getTime() < Date.now()) return false;
  const features = gate.features as { whatsapp?: { catalog?: { active?: boolean } } } | null;
  return features?.whatsapp?.catalog?.active === true;
}

export async function assertCommerceEnabled(orgId: string) {
  if (!(await commerceEnabled(orgId)))
    throw new ShopError("PLAN_REQUIRED", "This shop isn't taking orders right now");
}

/**
 * A Shopify or WooCommerce store was connected: Commerce is shown (selling what is in that
 * store is why they connected it). A shop already following that store (a reconnect) copies
 * its products in again; any other shop is left as it is, and the Products page offers the
 * import.
 */
export async function onOnlineStoreConnected(orgId: string, mode: "SHOPIFY" | "WOOCOMMERCE") {
  const { revealModule } = await import("../../settings/org/modules.js");
  await revealModule(orgId, "commerce");
  const store = await prisma.shopStore.findUnique({
    where: { orgId },
    select: { id: true, mode: true },
  });
  if (store?.mode === mode) {
    const { enqueueStoreMirror } = await import("../../../workers/bullmq/queues/shop.queue.js");
    await enqueueStoreMirror(store.id, 0);
  }
}

/**
 * The store a shop checks out in was disconnected: RateUp takes the payments again so carts
 * aren't stranded, and staff are told, since RateUp checkout may still need a way to get paid.
 */
export async function onOnlineStoreDisconnected(orgId: string, mode: "SHOPIFY" | "WOOCOMMERCE") {
  const store = await prisma.shopStore.findUnique({ where: { orgId } });
  if (!store || store.checkoutVia !== mode) return;
  await prisma.shopStore.update({ where: { id: store.id }, data: { checkoutVia: "RATEUP" } });
  const label = mode === "SHOPIFY" ? "Shopify" : "WooCommerce";
  const { notify } = await import("../../settings/notifications/notify.js");
  await notify({
    event: "integration.error",
    orgId,
    audience: { kind: "permitted" },
    data: {
      integration: label,
      error: `${label} was disconnected, so customers now check out in RateUp. Make sure a way to get paid is set up in Commerce → Settings, or reconnect ${label}.`,
    },
  });
}
