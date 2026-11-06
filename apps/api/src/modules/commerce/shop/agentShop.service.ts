import prisma from "../../../utils/prisma.js";
import { sellableWhere } from "./checkoutVia.js";
import { checkoutUrl } from "./events.js";
import { checkoutLinkFor, storeChecksOut } from "./externalCheckout.service.js";
import { createDraftOrder, repriceOrder } from "./orders.service.js";
import { toNumber } from "./pricing.js";
import { subscribeBackInStock } from "./recovery.service.js";
import { formatMoney } from "./money.js";
import { ShopError } from "./shop.errors.js";
import { assertCanTakeOrder } from "./orderAllowance.js";
import { assertCommerceEnabled } from "./store.service.js";

/**
 * What the Meta AI agent's shop tools answer. Shapes are flat and snake_case because a model
 * reads them, and nothing here sends a message: Meta hands the thread to whichever app sends,
 * so the agent shares the checkout link in its own reply.
 */

async function storeFor(orgId: string) {
  const store = await prisma.shopStore.findUnique({ where: { orgId } });
  if (!store) throw new ShopError("NOT_FOUND", "This business has no shop set up");
  await assertCommerceEnabled(orgId);
  return store;
}

export async function agentSearchProducts(orgId: string, q: string | undefined) {
  const store = await storeFor(orgId);
  const words = (q ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);
  const products = await prisma.shopProduct.findMany({
    where: {
      storeId: store.id,
      status: "ACTIVE",
      showOnWhatsapp: true,
      ...sellableWhere(store),
      ...(words.length
        ? {
            OR: words.flatMap((w) => [
              { title: { contains: w, mode: "insensitive" as const } },
              { description: { contains: w, mode: "insensitive" as const } },
              { collections: { some: { name: { contains: w, mode: "insensitive" as const } } } },
              { variants: { some: { title: { contains: w, mode: "insensitive" as const } } } },
            ]),
          }
        : {}),
    },
    include: { variants: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return {
    currency: store.currency,
    products: products.map((p) => ({
      title: p.title,
      description: p.description?.slice(0, 300) ?? null,
      image: p.images[0] ?? null,
      options: p.variants.map((v) => ({
        variant_id: v.id,
        option: v.title === "Default" ? null : v.title,
        price: toNumber(v.price),
        was_price: v.compareAtPrice === null ? null : toNumber(v.compareAtPrice),
        in_stock: !v.trackInventory || v.stock > 0 || v.allowBackorder,
        only_left: v.trackInventory && v.stock > 0 && v.stock <= 5 ? v.stock : null,
      })),
    })),
  };
}

export async function agentStartCheckout(
  orgId: string,
  phone: string,
  items: { variant_id: string; quantity: number }[],
  couponCode: string | undefined,
  whatsappPhoneId: string | null,
) {
  const store = await storeFor(orgId);
  await assertCanTakeOrder({ orgId, source: "ai_agent" });
  const digits = phone.replace(/\D/g, "");
  const contact = await prisma.contact.findUnique({
    where: { contact_phone_org_id_unique: { phone: digits, orgId } },
    select: { id: true, name: true },
  });
  const draft = await createDraftOrder({
    store,
    items: items.map((i) => ({ variantId: i.variant_id, quantity: i.quantity })),
    channel: "WHATSAPP",
    source: "ai_agent",
    contactId: contact?.id ?? null,
    channelAccountId: whatsappPhoneId,
    customer: { name: contact?.name ?? null, phone: digits },
  });
  let couponNote: string | null = null;
  let order = draft;
  if (couponCode && storeChecksOut(store)) {
    couponNote = "Codes are entered on the checkout page.";
  } else if (couponCode) {
    try {
      order = await repriceOrder(draft.id, { discountCode: couponCode });
    } catch (err) {
      couponNote = err instanceof ShopError ? err.message : "That code couldn't be applied";
    }
  }
  return {
    order_number: order.number,
    currency: order.currency,
    items: order.items.map((i) => ({
      title: i.title + (i.variantTitle ? ` (${i.variantTitle})` : ""),
      quantity: i.quantity,
      price: toNumber(i.unitPrice),
    })),
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discountTotal),
    total_before_delivery: toNumber(order.total),
    coupon_problem: couponNote,
    checkout_url: await checkoutLinkFor(order.id),
    note: storeChecksOut(store)
      ? "Delivery, tax and any codes are added on the checkout page, so the final total may differ."
      : "Delivery is chosen on the checkout page, so the final total may add delivery.",
  };
}

export async function agentOrderStatus(orgId: string, phone: string) {
  const store = await storeFor(orgId);
  const digits = phone.replace(/\D/g, "");
  const orders = await prisma.shopOrder.findMany({
    where: {
      storeId: store.id,
      status: { in: ["OPEN", "COMPLETED", "CANCELLED"] },
      // A typed-in storefront number proves nothing; the chatter's own contact, or a number
      // its owner confirmed, does.
      OR: [
        { contact: { phone: digits } },
        { customerPhone: digits, phoneVerifiedAt: { not: null } },
      ],
    },
    include: { items: true, shipments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return {
    orders: orders.map((o) => ({
      order_number: o.number,
      placed: o.placedAt?.toISOString() ?? o.createdAt.toISOString(),
      items: o.items.map(
        (i) => `${i.quantity} × ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""}`,
      ),
      total: formatMoney(toNumber(o.total), o.currency),
      payment: o.paymentStatus.toLowerCase().replace(/_/g, " "),
      delivery:
        o.status === "CANCELLED"
          ? "cancelled"
          : o.fulfillmentStatus.toLowerCase().replace(/_/g, " "),
      carrier: o.shipments[0]?.carrier ?? null,
      tracking_url: o.shipments[0]?.trackingUrl ?? null,
      order_page: o.checkoutToken ? checkoutUrl(o.checkoutToken) : null,
    })),
  };
}

export async function agentBackInStock(orgId: string, phone: string, variantId: string) {
  const store = await storeFor(orgId);
  await subscribeBackInStock({ storeId: store.id, variantId, phone, channel: "WHATSAPP" });
  return { ok: true };
}
