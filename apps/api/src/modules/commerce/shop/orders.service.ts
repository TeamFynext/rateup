import { randomBytes } from "node:crypto";

import {
  Prisma,
  type ShopChannel,
  type ShopCheckoutStage,
  type ShopFulfillmentStatus,
  type ShopOrder,
  type ShopStore,
} from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { redeemDiscount, releaseDiscount, resolveDiscount, ruleOf } from "./discounts.service.js";
import { onShopOrderEvent, type ShopOrderEventType } from "./events.js";
import { formatMoney } from "./money.js";
import { priceOrder, round2, shippingFor, toNumber, type PricedLine } from "./pricing.js";
import { adjustStock, afterStockChange } from "./products.service.js";
import { notFound, ShopError } from "./shop.errors.js";
import { countsTowardOrders, orderAllowance, orderLimitError } from "./orderAllowance.js";
import { countPlacedOrder } from "../../settings/subscription/shopOrders.js";
import { currentPeriodStart } from "../../settings/subscription/billingPeriod.js";
import { maybeNotifyOrderUsage } from "../../settings/subscription/limitAlerts.js";
import { shopProductsActionSchema } from "./commentToBuy.schema.js";
import {
  pointsOffer,
  refundSpentPoints,
  returnSpentPoints,
  reverseEarnedPoints,
  spendPoints,
} from "./shopLoyalty.js";
import type { ShopAddress, ShopAttribution, ShopSelectedShipping } from "./shop.types.js";
import { getStoreById, nextOrderNumber, ratesForDestination } from "./store.service.js";
import { fulfilledInStore, inStoreCheckout, paysInStore, storeLabel } from "./checkoutVia.js";
import { contactFields, primaryIdentities } from "../../contacts/identity/contactFields.js";

export const orderDetailInclude = {
  items: { orderBy: { title: "asc" } },
  payments: { orderBy: { createdAt: "desc" } },
  events: { orderBy: { createdAt: "desc" } },
  shipments: { orderBy: { createdAt: "desc" } },
  returns: { orderBy: { createdAt: "desc" } },
  contact: {
    select: {
      id: true,
      name: true,
      profilePic: true,
      ...primaryIdentities,
    },
  },
} satisfies Prisma.ShopOrderInclude;

type ShopOrderDetailRow = Prisma.ShopOrderGetPayload<{ include: typeof orderDetailInclude }>;

/** An order loaded with `orderDetailInclude`, its contact in the shape the API returns. */
export function withOrderContact<T extends Pick<ShopOrderDetailRow, "contact">>(order: T) {
  const { contact, ...rest } = order;
  if (!contact) return { ...rest, contact: null };
  const { phone, igsId, psid, email } = contactFields(contact.identities);
  return {
    ...rest,
    contact: {
      id: contact.id,
      name: contact.name,
      phone,
      igsId,
      psid,
      email,
      profilePic: contact.profilePic,
    },
  };
}

export type ShopOrderDetail = ReturnType<typeof withOrderContact<ShopOrderDetailRow>>;

export interface CartLineInput {
  variantId?: string;
  retailerId?: string;
  quantity: number;
}

export interface CreateDraftInput {
  store: ShopStore;
  items: CartLineInput[];
  channel: ShopChannel;
  source?: string;
  contactId?: string | null;
  channelAccountId?: string | null;
  customer?: { name?: string | null; phone?: string | null; email?: string | null };
  attribution?: ShopAttribution | null;
  createdById?: string | null;
  legacyWaOrderId?: string | null;
  note?: string | null;
}

export const newCheckoutToken = () => randomBytes(18).toString("base64url");

/**
 * Prices lines from the store's own variants. A cart from Meta carries prices too, but the
 * customer could have sent it hours ago at an old price — the store's price is what is charged.
 */
async function resolveLines(store: ShopStore, items: CartLineInput[]) {
  const storeId = store.id;
  const ids = items.map((i) => i.variantId).filter(Boolean) as string[];
  const retailerIds = items.map((i) => i.retailerId).filter(Boolean) as string[];
  const variants = await prisma.shopVariant.findMany({
    where: { storeId, OR: [{ id: { in: ids } }, { retailerId: { in: retailerIds } }] },
    include: { product: { include: { collections: { select: { id: true } } } } },
  });
  const merged = new Map<string, { variant: (typeof variants)[number]; quantity: number }>();
  for (const item of items) {
    const variant = variants.find(
      (v) =>
        (item.variantId && v.id === item.variantId) ||
        (item.retailerId && v.retailerId === item.retailerId),
    );
    if (!variant || variant.product.status !== "ACTIVE") continue;
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const prev = merged.get(variant.id);
    merged.set(variant.id, { variant, quantity: (prev?.quantity ?? 0) + qty });
  }
  const lines = [...merged.values()];
  if (!inStoreCheckout(store.checkoutVia)) {
    for (const { variant, quantity } of lines)
      assertInStock(variant, quantity, variant.product.title, variant.title);
  }
  return lines;
}

/**
 * Refuses a line the store can't fill. Stores that check out in Shopify or WooCommerce are
 * skipped, as in `placeOrder`: the store's own checkout takes the stock.
 */
function assertInStock(
  v: { trackInventory: boolean; allowBackorder: boolean; stock: number },
  quantity: number,
  title: string,
  variantTitle: string | null,
) {
  if (!v.trackInventory || v.allowBackorder || v.stock >= quantity) return;
  const label = `${title}${variantTitle && variantTitle !== "Default" ? ` (${variantTitle})` : ""}`;
  throw new ShopError(
    "OUT_OF_STOCK",
    v.stock > 0 ? `Only ${v.stock} of ${label} left` : `${label} is sold out`,
  );
}

function stageAfterCreate(store: ShopStore): ShopCheckoutStage {
  // The store's checkout asks for everything else; all that's left here is to pay there.
  if (inStoreCheckout(store.checkoutVia)) return "PAYMENT";
  if (store.askAddress) return "ADDRESS";
  if (store.askDelivery) return "DELIVERY";
  return "PAYMENT";
}

/** Orders a customer starts in chat themselves, which an ad click names as their source. */
const CHAT_SOURCES = new Set(["wa_cart", "wa_dm", "ig_dm", "messenger_dm"]);

/**
 * The ad a contact clicked in the attribution window, for orders whose caller named no other
 * source (an agent's order, the AI agent's, a cart). Best effort: a lookup failure never
 * stops the sale.
 */
async function fallbackAttribution(input: CreateDraftInput): Promise<ShopAttribution | null> {
  if (input.attribution) return input.attribution;
  if (!input.contactId) return null;
  try {
    const { adAttribution } = await import("./attribution.js");
    return await adAttribution(input.store.orgId, input.contactId);
  } catch (err) {
    log.warn({ err, contactId: input.contactId }, "Could not look up the contact's ad click");
    return null;
  }
}

export async function createDraftOrder(input: CreateDraftInput) {
  const { store } = input;
  const lines = await resolveLines(store, input.items);
  if (!lines.length)
    throw new ShopError("INVALID", "None of those products are for sale right now");
  const attribution = await fallbackAttribution(input);
  const source =
    attribution?.kind === "ctwa_ad" && input.source && CHAT_SOURCES.has(input.source)
      ? "ctwa_ad"
      : input.source;

  const contact = input.contactId
    ? await prisma.contact.findUnique({
        where: { id: input.contactId },
        select: { name: true, ...primaryIdentities },
      })
    : null;
  const contactIds = contactFields(contact?.identities);

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, store.id);
    return tx.shopOrder.create({
      data: {
        storeId: store.id,
        orgId: store.orgId,
        number,
        contactId: input.contactId ?? null,
        channel: input.channel,
        source: source ?? null,
        channelAccountId: input.channelAccountId ?? null,
        currency: store.currency,
        checkoutVia: store.checkoutVia,
        checkoutStage: stageAfterCreate(store),
        customerName: input.customer?.name ?? contact?.name ?? null,
        customerPhone: input.customer?.phone ?? contactIds.phone ?? null,
        customerEmail: input.customer?.email ?? contactIds.email ?? null,
        attribution: attribution ?? undefined,
        createdById: input.createdById ?? null,
        legacyWaOrderId: input.legacyWaOrderId ?? null,
        note: input.note ?? null,
        checkoutToken: newCheckoutToken(),
        checkoutExpiresAt: new Date(Date.now() + store.paymentLinkTtlHours * 3_600_000),
        items: {
          create: lines.map(({ variant, quantity }) => {
            const unit = toNumber(variant.price);
            return {
              variantId: variant.id,
              productId: variant.productId,
              title: variant.product.title,
              variantTitle: variant.title === "Default" ? null : variant.title,
              sku: variant.sku,
              retailerId: variant.retailerId,
              imageUrl: variant.imageUrl ?? variant.product.images[0] ?? null,
              unitPrice: unit,
              quantity,
              lineTotal: round2(unit * quantity),
            };
          }),
        },
        events: {
          create: {
            type: "created",
            message: input.createdById
              ? "Order created by staff"
              : `Cart sent from ${channelLabel(input.channel)}`,
            actorUserId: input.createdById ?? null,
            data: { items: lines.length },
          },
        },
      },
    });
  });
  return repriceOrder(order.id);
}

export function channelLabel(channel: ShopChannel) {
  return {
    WHATSAPP: "WhatsApp",
    INSTAGRAM: "Instagram",
    MESSENGER: "Messenger",
    STOREFRONT: "the storefront",
    MANUAL: "the dashboard",
  }[channel];
}

export interface CheckoutPatch {
  shippingAddress?: ShopAddress | null;
  shippingRateId?: string | null;
  discountCode?: string | null;
  usePoints?: boolean;
  customer?: { name?: string | null; email?: string | null; phone?: string | null };
  note?: string | null;
}

/**
 * Re-derives every total from the lines and the choices made so far. Called after each
 * checkout step so the amounts shown — in chat or on the page — are never stale.
 */
export async function repriceOrder(orderId: string, patch: CheckoutPatch = {}) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { collections: { select: { id: true } } } } } },
        },
      },
    },
  });
  if (!order) throw notFound("Order");
  if (order.status !== "DRAFT")
    throw new ShopError("CONFLICT", "This order has already been placed");
  const store = await getStoreById(order.storeId);

  const lines: PricedLine[] = order.items.map((i) => ({
    variantId: i.variantId,
    productId: i.productId,
    collectionIds: i.variant?.product.collections.map((c) => c.id) ?? [],
    unitPrice: toNumber(i.unitPrice),
    quantity: i.quantity,
  }));
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));

  const address =
    patch.shippingAddress !== undefined
      ? patch.shippingAddress
      : (order.shippingAddress as ShopAddress | null);

  // Shipping: an explicit pick, else the current pick re-quoted, else the only option. A pick
  // that no longer serves the address is dropped rather than kept at its old price.
  const rates = await ratesForDestination(store.id, address?.country);
  const current = (order.shippingRate as ShopSelectedShipping | null) ?? null;
  const wantedRateId = patch.shippingRateId !== undefined ? patch.shippingRateId : current?.rateId;
  let rate = wantedRateId ? rates.find((r) => r.id === wantedRateId) : undefined;
  if (!rate && patch.shippingRateId)
    throw new ShopError("INVALID", "That delivery option isn't available");
  if (!rate && rates.length === 1) rate = rates[0];
  const shipping: ShopSelectedShipping | null = rate
    ? {
        rateId: rate.id,
        name: rate.name,
        price: shippingFor(
          {
            price: toNumber(rate.price),
            freeOver: rate.freeOver === null ? null : toNumber(rate.freeOver),
          },
          subtotal,
        ),
        minDays: rate.minDays,
        maxDays: rate.maxDays,
      }
    : null;

  // Discount
  let discountCode = patch.discountCode !== undefined ? patch.discountCode : order.discountCode;
  let discount = null;
  if (discountCode) {
    if (!store.allowCoupons)
      throw new ShopError("DISCOUNT_INVALID", "This shop doesn't take coupon codes");
    try {
      discount = await resolveDiscount(store.id, discountCode, {
        subtotal,
        contactId: order.contactId,
        // The number may arrive in the same save as the code.
        phone: patch.customer?.phone ?? order.customerPhone,
        orderId: order.id,
        currency: order.currency,
      });
      discountCode = discount.discount.code;
    } catch (err) {
      // A code the customer just typed is reported; one that lapsed since is dropped quietly.
      if (patch.discountCode) throw err;
      discountCode = null;
      discount = null;
    }
  }

  // Points
  const wantPoints = patch.usePoints !== undefined ? patch.usePoints : order.pointsRedeemed > 0;
  let pointsRedeemed = 0;
  let pointsValue = 0;
  if (wantPoints) {
    const goodsBase = priceOrder({
      lines,
      discount: discount ? { rule: discount.rule, scope: discount.scope } : null,
    });
    const offer = await pointsOffer(
      store,
      order.contactId,
      goodsBase.subtotal - goodsBase.discountTotal,
      order.reservedAt ? order.pointsRedeemed : 0,
    );
    if (offer && offer.points > 0) {
      pointsRedeemed = offer.points;
      pointsValue = offer.value;
    } else if (patch.usePoints) {
      throw new ShopError("INVALID", "There aren't enough points to use on this order");
    }
  }

  const totals = priceOrder({
    lines,
    discount: discount ? { rule: discount.rule, scope: discount.scope } : null,
    pointsValue,
    shipping: shipping?.price ?? 0,
    taxRate: store.taxRate === null ? null : toNumber(store.taxRate),
    pricesIncludeTax: store.pricesIncludeTax,
  });

  // The coupon or points this draft holds for its payment link no longer match it.
  const newDiscountId = discount?.discount.id ?? null;
  if (
    order.reservedAt &&
    (newDiscountId !== order.discountId || pointsRedeemed !== order.pointsRedeemed)
  ) {
    await releaseOrderBenefits(order.id);
  }

  const updated = await prisma.shopOrder.update({
    where: { id: order.id },
    data: {
      shippingAddress: address ?? undefined,
      shippingRate: shipping ?? Prisma.DbNull,
      discountCode: discountCode ?? null,
      discountId: newDiscountId,
      pointsRedeemed,
      customerName: patch.customer?.name ?? patch.shippingAddress?.name ?? order.customerName,
      customerEmail: patch.customer?.email ?? order.customerEmail,
      customerPhone: patch.customer?.phone ?? order.customerPhone,
      note: patch.note !== undefined ? patch.note : order.note,
      ...totals,
    },
    include: orderDetailInclude,
  });
  return withOrderContact(updated);
}

/** An order's lines and saved coupon, priced the way `repriceOrder` prices them. */
async function pricingContext(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { collections: { select: { id: true } } } } } },
        },
      },
    },
  });
  if (!order) throw notFound("Order");
  const store = await getStoreById(order.storeId);
  const lines: PricedLine[] = order.items.map((i) => ({
    variantId: i.variantId,
    productId: i.productId,
    collectionIds: i.variant?.product.collections.map((c) => c.id) ?? [],
    unitPrice: toNumber(i.unitPrice),
    quantity: i.quantity,
  }));
  const discount = order.discountId
    ? await prisma.shopDiscount.findUnique({ where: { id: order.discountId } })
    : null;
  return { order, store, lines, discount: discount ? ruleOf(discount) : null };
}

/**
 * The points a customer may spend on an order, offered on the base `repriceOrder` spends them
 * against — goods after the coupon — so the chat, the hosted page and the total agree.
 */
export async function pointsOfferForOrder(orderId: string) {
  const { order, store, lines, discount } = await pricingContext(orderId);
  const goods = priceOrder({ lines, discount });
  return pointsOffer(
    store,
    order.contactId,
    goods.subtotal - goods.discountTotal,
    order.reservedAt ? order.pointsRedeemed : 0,
  );
}

/**
 * A cash order switched to paying online at `pct` off the goods: priced again so tax and the
 * invoice match. Returns null when it was already switched or confirmed (a double tap).
 */
export async function applyPrepaidDiscount(orderId: string, pct: number) {
  const { order, store, lines, discount } = await pricingContext(orderId);
  const shipping = (order.shippingRate as ShopSelectedShipping | null)?.price ?? 0;
  const totals = priceOrder({
    lines,
    discount,
    extraDiscountPct: pct,
    pointsValue: toNumber(order.pointsDiscount),
    shipping,
    taxRate: store.taxRate === null ? null : toNumber(store.taxRate),
    pricesIncludeTax: store.pricesIncludeTax,
  });
  const { count } = await prisma.shopOrder.updateMany({
    where: { id: orderId, paymentStatus: "COD_PENDING", confirmedAt: null },
    data: { ...totals, paymentStatus: "PENDING", confirmedAt: new Date() },
  });
  if (!count) return null;
  return { saved: round2(toNumber(order.total) - totals.total), order };
}

/** Undoes `applyPrepaidDiscount` when no payment link could be sent for it. */
export async function revertPrepaidDiscount(original: ShopOrder) {
  await prisma.shopOrder.updateMany({
    where: { id: original.id, paymentStatus: "PENDING" },
    data: {
      subtotal: original.subtotal,
      discountTotal: original.discountTotal,
      pointsDiscount: original.pointsDiscount,
      shippingTotal: original.shippingTotal,
      taxTotal: original.taxTotal,
      total: original.total,
      paymentStatus: "COD_PENDING",
      confirmedAt: original.confirmedAt,
    },
  });
}

export async function addOrderEvent(
  orderId: string,
  type: string,
  message: string,
  data?: Prisma.InputJsonValue,
  actorUserId?: string | null,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  await db.shopOrderEvent.create({
    data: { orderId, type, message, data, actorUserId: actorUserId ?? null },
  });
}

/**
 * A store that charges for delivery (it asks for it and has active rates) takes no payment
 * and places no order until a rate that serves the order's address is on it; otherwise the
 * customer would get free delivery by picking nothing, or ship where the store doesn't.
 */
export async function assertDeliveryChosen(
  order: Pick<ShopOrder, "storeId" | "shippingAddress" | "shippingRate">,
  store: Pick<ShopStore, "askDelivery">,
) {
  if (!store.askDelivery) return;
  const anyRate = await prisma.shopShippingRate.count({
    where: { storeId: order.storeId, active: true },
  });
  if (!anyRate) return;
  const country = (order.shippingAddress as ShopAddress | null)?.country;
  const rates = await ratesForDestination(order.storeId, country);
  if (!rates.length)
    throw new ShopError(
      "INVALID",
      country ? `We don't deliver to ${countryName(country)}` : "Add a delivery address first",
    );
  const picked = (order.shippingRate as ShopSelectedShipping | null)?.rateId;
  if (!picked || !rates.some((r) => r.id === picked))
    throw new ShopError("INVALID", "Pick a delivery option first");
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** A draft past its checkout window can't be paid; its prices and holds are no longer kept. */
export function assertCheckoutOpen(
  order: Pick<ShopOrder, "status" | "checkoutExpiresAt">,
  now = new Date(),
) {
  if (order.status === "DRAFT" && order.checkoutExpiresAt && order.checkoutExpiresAt < now)
    throw new ShopError(
      "CHECKOUT_EXPIRED",
      "This checkout has expired. Message us and we'll start a fresh one.",
    );
}

/**
 * Brings a draft's lines up to the store's current prices before money is taken, so a draft
 * kept from a sale or a typo can't be paid at that price later. A product taken off sale
 * since stops it. Returns the totals before and after.
 */
export async function refreshDraftPrices(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!order) throw notFound("Order");
  const before = toNumber(order.total);
  if (order.status !== "DRAFT") return { before, after: before, changed: false };
  const gone = order.items.find((i) => i.variant && i.variant.product.status !== "ACTIVE");
  if (gone) throw new ShopError("OUT_OF_STOCK", `${gone.title} is no longer for sale`);
  if (!inStoreCheckout(order.checkoutVia)) {
    for (const i of order.items)
      if (i.variant) assertInStock(i.variant, i.quantity, i.title, i.variantTitle);
  }
  const stale = order.items.filter(
    (i) => i.variant && toNumber(i.variant.price) !== toNumber(i.unitPrice),
  );
  if (!stale.length) return { before, after: before, changed: false };
  await prisma.$transaction(
    stale.map((i) => {
      const unit = toNumber(i.variant!.price);
      return prisma.shopOrderItem.update({
        where: { id: i.id },
        data: { unitPrice: unit, lineTotal: round2(unit * i.quantity) },
      });
    }),
  );
  const after = toNumber((await repriceOrder(orderId)).total);
  await addOrderEvent(orderId, "repriced", "Prices updated to the store's current prices", {
    before,
    after,
  });
  return { before, after, changed: Math.abs(after - before) > 0.009 };
}

/**
 * The checks every way of paying a draft runs first: still open, at today's prices. `strict`
 * refuses when the total moved, so the customer sees the new amount before paying it.
 */
export async function prepareDraftForPayment(orderId: string, opts: { strict: boolean }) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.status !== "DRAFT") return { changed: false, before: 0, after: 0 };
  assertCheckoutOpen(order);
  const prices = await refreshDraftPrices(orderId);
  if (prices.changed && opts.strict)
    throw new ShopError(
      "CONFLICT",
      `Prices have changed since this order was started. The total is now ${formatMoney(prices.after, order.currency)}; check it and pay again.`,
    );
  return prices;
}

/**
 * Takes the coupon use and the points a draft spends while its payment link is open, so two
 * drafts can't both pay with the last use of a code or the same balance. Released when the
 * link lapses, the choices change, or the draft is cancelled; kept when the order is placed.
 * An anonymous checkout holds nothing, or anyone could tie up a limited code for the link's
 * lifetime; its code is redeemed (or found used up) when the order is placed.
 */
export async function reserveOrderBenefits(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const o = await tx.shopOrder.findUnique({ where: { id: orderId } });
    if (!o || o.status !== "DRAFT" || o.reservedAt || !o.contactId) return;
    if (!o.discountId && !(o.pointsRedeemed > 0)) return;
    const reservedAt = new Date();
    const { count } = await tx.shopOrder.updateMany({
      where: { id: orderId, status: "DRAFT", reservedAt: null },
      data: { reservedAt },
    });
    if (!count) return;
    if (o.discountId) {
      await redeemDiscount(
        tx,
        o.discountId,
        o.id,
        { contactId: o.contactId, phone: o.customerPhone },
        toNumber(o.discountTotal),
      );
    }
    if (o.pointsRedeemed > 0 && o.contactId) {
      await spendPoints(
        tx,
        o.orgId,
        o.contactId,
        o.id,
        o.pointsRedeemed,
        `hold-${reservedAt.getTime()}`,
      );
    }
  });
}

/** Gives a draft's held coupon use and points back. Safe to call twice. */
export async function releaseOrderBenefits(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.shopOrder.updateMany({
      where: { id: orderId, status: "DRAFT", reservedAt: { not: null } },
      data: { reservedAt: null },
    });
    if (!count) return;
    const o = await tx.shopOrder.findUniqueOrThrow({ where: { id: orderId } });
    await releaseDiscount(tx, orderId);
    await returnSpentPoints(tx, o.orgId, orderId, "Returned: checkout not completed");
  });
}

/**
 * Whether a comment-to-buy drop already placed its limit, for an order one of its claims
 * started. Serialised with `claimDropUnit` by the same advisory lock.
 */
async function dropSoldOut(tx: Prisma.TransactionClient, orderId: string) {
  const claim = await tx.shopDropClaim.findFirst({ where: { orderId }, select: { ruleId: true } });
  if (!claim) return false;
  const action = await tx.ruleAction.findFirst({
    where: { ruleId: claim.ruleId, type: "SEND_SHOP_PRODUCTS" },
    select: { value: true },
  });
  const limit = shopProductsActionSchema.safeParse(action?.value).data?.dropLimit;
  if (!limit) return false;
  await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${claim.ruleId}))) AS l`;
  const [row] = await tx.$queryRaw<{ placed: bigint }[]>`
    SELECT count(*)::bigint AS placed
    FROM "ShopDropClaim" c JOIN "ShopOrder" o ON o.id = c."orderId"
    WHERE c."ruleId" = ${claim.ruleId}::uuid AND o.id <> ${orderId}::uuid
      AND o.status IN ('OPEN', 'COMPLETED')`;
  return Number(row?.placed ?? 0) >= limit;
}

/**
 * Turns a draft into a real order: stock is taken, the coupon and points are spent (or the
 * hold on them kept). Unpaid placements (cash, bank) refuse when something ran out. A `paid`
 * placement never refuses, since the money is already taken: what ran out is recorded on
 * the order, with what the customer was given but not charged, and staff are told. The same
 * holds for the plan's monthly orders: a paid placement past them is counted, never refused.
 */
export async function placeOrder(
  orderId: string,
  opts: {
    paymentMethod: string;
    codPending?: boolean;
    actorUserId?: string | null;
    paid?: boolean;
  },
) {
  const head = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: { orgId: true, source: true, status: true },
  });
  if (!head) throw notFound("Order");
  const allowance = head.status === "DRAFT" ? await orderAllowance(head) : null;
  if (!opts.paid && allowance?.exceeded) throw orderLimitError("customer", allowance.max ?? 0);
  if (!opts.paid) await prepareDraftForPayment(orderId, { strict: true });
  let ordersThisMonth: number | null = null;
  const changed: {
    before: Parameters<typeof afterStockChange>[0];
    after: Parameters<typeof afterStockChange>[1];
  }[] = [];
  const problems: string[] = [];
  let owed = 0;
  const order = await prisma.$transaction(async (tx) => {
    // Claimed first: the row lock makes a second caller (the payment webhook and the customer's
    // return to the checkout page arrive together) wait here, then find nothing to claim.
    const claim = await tx.shopOrder.updateMany({
      where: { id: orderId, status: "DRAFT" },
      data: { status: "OPEN" },
    });
    const o = await tx.shopOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) throw notFound("Order");
    if (!claim.count) return { ...o, alreadyPlaced: true as const };

    if (await dropSoldOut(tx, o.id)) {
      if (!opts.paid) throw new ShopError("OUT_OF_STOCK", "This drop has sold out");
      problems.push("The drop it came from had already sold out");
    }

    for (const item of o.items) {
      // An order checked out in Shopify or WooCommerce took stock there; the mirror follows.
      if (!item.variantId || inStoreCheckout(o.checkoutVia)) continue;
      const v = await tx.shopVariant.findUnique({ where: { id: item.variantId } });
      if (v && v.trackInventory && !v.allowBackorder) {
        // Conditional, so two customers paying for the last one cannot both take it.
        const { count } = await tx.shopVariant.updateMany({
          where: { id: v.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        const label = `${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ""}`;
        if (!count) {
          const left =
            (await tx.shopVariant.findUnique({ where: { id: v.id }, select: { stock: true } }))
              ?.stock ?? 0;
          if (!opts.paid)
            throw new ShopError(
              "OUT_OF_STOCK",
              left > 0 ? `Only ${left} of ${label} left` : `${item.title} just sold out`,
            );
          // Paid for: taken anyway, so the shortfall shows as negative stock to restock or refund.
          await tx.shopVariant.update({
            where: { id: v.id },
            data: { stock: { decrement: item.quantity } },
          });
          problems.push(
            `${label} was oversold: ${item.quantity} paid for, ${Math.max(left, 0)} in stock`,
          );
        }
        await tx.shopInventoryMovement.create({
          data: { variantId: v.id, delta: -item.quantity, reason: "ORDER", orderId },
        });
        const after = await tx.shopVariant.findUniqueOrThrow({ where: { id: v.id } });
        changed.push({ before: v, after });
        continue;
      }
      changed.push(await adjustStock(tx, item.variantId, -item.quantity, "ORDER", { orderId }));
    }
    // A held coupon and points were taken with the payment link; only unheld ones are spent here.
    if (!o.reservedAt && o.discountId) {
      try {
        await redeemDiscount(
          tx,
          o.discountId,
          o.id,
          { contactId: o.contactId, phone: o.customerPhone },
          toNumber(o.discountTotal),
        );
      } catch (err) {
        if (!opts.paid) throw err;
        problems.push(
          o.discountCode
            ? `Coupon ${o.discountCode} was used up first`
            : "The coupon was used up first",
        );
        owed += toNumber(o.discountTotal);
      }
    }
    if (!o.reservedAt && o.pointsRedeemed > 0 && o.contactId) {
      try {
        await spendPoints(tx, o.orgId, o.contactId, o.id, o.pointsRedeemed);
      } catch (err) {
        if (!opts.paid) throw err;
        problems.push(`The customer's ${o.pointsRedeemed} points were already spent`);
        owed += toNumber(o.pointsDiscount);
      }
    }
    const placed = await tx.shopOrder.update({
      where: { id: o.id },
      data: {
        status: "OPEN",
        placedAt: new Date(),
        paymentMethod: opts.paymentMethod,
        paymentStatus: opts.codPending ? "COD_PENDING" : o.paymentStatus,
        checkoutStage: "DONE",
        reservedAt: null,
        ...(problems.length
          ? { reviewReason: problems.join("; "), amountDue: owed > 0 ? round2(owed) : null }
          : {}),
      },
      include: { items: true },
    });
    await addOrderEvent(
      o.id,
      "placed",
      `Order placed · ${opts.paymentMethod.replace(/_/g, " ")}`,
      undefined,
      opts.actorUserId,
      tx,
    );
    if (problems.length) {
      await addOrderEvent(
        o.id,
        "needs_review",
        `Paid, but needs review: ${problems.join("; ")}${owed > 0 ? ` (${formatMoney(round2(owed), o.currency)} given but not covered)` : ""}`,
        { problems, owed: round2(owed) },
        undefined,
        tx,
      );
    }
    // Last, so the org's UsageStats row (which every message send also updates) is locked
    // only until commit. Re-checked on the locked counter: two unpaid orders racing for the
    // last slot.
    if (countsTowardOrders(o)) {
      ordersThisMonth = await countPlacedOrder(tx, o.orgId);
      if (!opts.paid && allowance?.max !== undefined && ordersThisMonth > allowance.max)
        throw orderLimitError("customer", allowance.max);
    }
    return placed;
  });
  if ("alreadyPlaced" in order) return order;
  if (ordersThisMonth !== null)
    await maybeNotifyOrderUsage(order.orgId, ordersThisMonth, allowance?.max, currentPeriodStart());
  for (const c of changed)
    await afterStockChange(c.before, c.after).catch((err) =>
      log.warn({ err }, "stock follow-up failed"),
    );
  if (problems.length) await notifyNeedsReview(order, problems.join("; "));
  await onShopOrderEvent(order.id, "placed");
  return order;
}

async function notifyNeedsReview(
  order: Pick<ShopOrder, "id" | "orgId" | "number">,
  reason: string,
) {
  try {
    const { notify } = await import("../../settings/notifications/notify.js");
    await notify({
      event: "commerce.order_needs_review",
      orgId: order.orgId,
      audience: { kind: "permitted" },
      data: { orderId: order.id, orderNumber: order.number, reason },
    });
  } catch (err) {
    log.warn({ err, orderId: order.id }, "Could not tell staff an order needs review");
  }
}

/** Records a confirmed payment. Places the order first if it was still a draft. */
export async function markOrderPaid(
  orderId: string,
  payment: {
    provider: string;
    paymentId?: string | null;
    amount?: number;
    actorUserId?: string | null;
  },
) {
  const current = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!current) throw notFound("Order");
  if (current.paymentStatus === "PAID") return current;
  if (current.status === "CANCELLED") return paidAfterCancel(current, payment.provider);
  if (current.status === "DRAFT") {
    await placeOrder(orderId, {
      paymentMethod: payment.provider,
      actorUserId: payment.actorUserId,
      paid: true,
    });
  }
  // Conditional, so of two confirmations of the same payment only one sends "paid" on, and a
  // cancel that landed since the check above is not overwritten.
  const { count } = await prisma.shopOrder.updateMany({
    where: { id: orderId, paymentStatus: { not: "PAID" }, status: { not: "CANCELLED" } },
    data: { paymentStatus: "PAID", paidAt: new Date(), paymentMethod: payment.provider },
  });
  const order = await prisma.shopOrder.findUniqueOrThrow({ where: { id: orderId } });
  if (!count) {
    if (order.status === "CANCELLED" && order.paymentStatus !== "PAID")
      return paidAfterCancel(order, payment.provider);
    return order;
  }
  await addOrderEvent(
    orderId,
    "paid",
    `Paid ${formatMoney(toNumber(payment.amount ?? order.total), order.currency)} · ${payment.provider}`,
    { paymentId: payment.paymentId ?? null },
    payment.actorUserId,
  );
  await onShopOrderEvent(orderId, "paid");
  return order;
}

/** Paid after it was cancelled (a slow payment page): kept visible to staff, nothing sent on. */
async function paidAfterCancel(order: ShopOrder, provider: string) {
  const reason = "Payment arrived after the order was cancelled — refund or reopen it";
  await addOrderEvent(order.id, "paid_after_cancel", reason, { provider });
  await notifyNeedsReview(order, reason);
  return order;
}

export async function confirmCodOrder(orderId: string, actorUserId?: string | null) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.paymentStatus !== "COD_PENDING" || order.confirmedAt) return order;
  const { count } = await prisma.shopOrder.updateMany({
    where: { id: orderId, paymentStatus: "COD_PENDING", confirmedAt: null },
    data: { confirmedAt: new Date() },
  });
  const updated = await prisma.shopOrder.findUniqueOrThrow({ where: { id: orderId } });
  if (!count) return updated;
  await addOrderEvent(
    orderId,
    "cod_confirmed",
    "Customer confirmed the cash order",
    undefined,
    actorUserId,
  );
  await onShopOrderEvent(orderId, "cod_confirmed");
  return updated;
}

/** Cash collected on delivery. */
export async function markCodCollected(orderId: string, actorUserId?: string | null) {
  return markOrderPaid(orderId, { provider: "cod", actorUserId });
}

export async function cancelOrder(
  orderId: string,
  opts: {
    reason: string;
    restock?: boolean;
    actorUserId?: string | null;
    notify?: boolean;
    /** The store cancelled it, so its copy there is already cancelled. */
    fromStore?: boolean;
    /** Cancel only if the order still matches, checked under the row lock (a deadline racing a confirm). */
    onlyIf?: Prisma.ShopOrderWhereInput;
  },
) {
  const changed: Awaited<ReturnType<typeof adjustStock>>[] = [];
  let cancelledNow = false;
  let skipped = false;
  const order = await prisma.$transaction(async (tx) => {
    if (opts.onlyIf) {
      await tx.$queryRaw`SELECT 1 FROM "ShopOrder" WHERE id = ${orderId}::uuid FOR UPDATE`;
      const still = await tx.shopOrder.findFirst({
        where: { AND: [{ id: orderId }, opts.onlyIf] },
        select: { id: true },
      });
      if (!still) {
        skipped = true;
        return tx.shopOrder.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
      }
    }
    const o = await tx.shopOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) throw notFound("Order");
    if (o.status === "CANCELLED") return o;
    if (!opts.fromStore && o.status !== "DRAFT" && paysInStore(o))
      throw new ShopError(
        "CONFLICT",
        `This order was placed in ${storeLabel(o.checkoutVia)}. Cancel it there and RateUp follows.`,
      );
    cancelledNow = true;
    if (o.fulfillmentStatus === "SHIPPED" || o.fulfillmentStatus === "DELIVERED")
      throw new ShopError("CONFLICT", "This order has shipped; start a return instead");
    const wasPlaced = o.status !== "DRAFT";
    if (wasPlaced && opts.restock !== false) {
      for (const item of o.items) {
        if (item.variantId)
          changed.push(await adjustStock(tx, item.variantId, item.quantity, "CANCEL", { orderId }));
      }
    }
    if (wasPlaced || o.reservedAt) await releaseDiscount(tx, o.id);
    // A cancelled order frees the drop unit its comment claimed.
    await tx.shopDropClaim.deleteMany({ where: { orderId } });
    await tx.shopPayment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    const cancelled = await tx.shopOrder.update({
      where: { id: o.id },
      data: {
        status: "CANCELLED",
        reservedAt: null,
        cancelledAt: new Date(),
        cancelReason: opts.reason,
        fulfillmentStatus: "CANCELLED",
        paymentStatus:
          o.paymentStatus === "PAID"
            ? o.paymentStatus
            : o.paymentStatus === "UNPAID"
              ? "UNPAID"
              : "EXPIRED",
      },
      include: { items: true },
    });
    await addOrderEvent(
      o.id,
      "cancelled",
      `Cancelled: ${opts.reason}`,
      undefined,
      opts.actorUserId,
      tx,
    );
    return cancelled;
  });
  if (skipped) return order;
  for (const c of changed) await afterStockChange(c.before, c.after).catch(() => {});
  if (cancelledNow && !opts.fromStore) {
    const { cancelInStore } = await import("./storeSync.service.js");
    await cancelInStore(order.id);
  }
  const { closeOpenLinks } = await import("./payments/payments.service.js");
  await closeOpenLinks(order.orgId, order.id).catch(() => {});
  await refundSpentPoints(order.orgId, order.id).catch((err) =>
    log.warn({ err }, "points refund failed"),
  );
  await reverseEarnedPoints(order.id, "order_cancelled").catch(() => {});
  if (opts.notify !== false) await onShopOrderEvent(order.id, "cancelled");
  return order;
}

const FULFILLMENT_EVENT: Partial<Record<ShopFulfillmentStatus, ShopOrderEventType>> = {
  PACKED: "packed",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  FAILED_DELIVERY: "delivery_failed",
};

export async function setFulfillmentStatus(
  orderId: string,
  status: ShopFulfillmentStatus,
  actorUserId?: string | null,
  note?: string,
) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.status === "DRAFT" || order.status === "CANCELLED")
    throw new ShopError("CONFLICT", "Only placed orders can be fulfilled");
  if (order.fulfillmentStatus === status) return order;
  const updated = await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: status,
      ...(status === "DELIVERED" && order.paymentStatus === "PAID" ? { status: "COMPLETED" } : {}),
    },
  });
  const label = status.toLowerCase().replace(/_/g, " ");
  await addOrderEvent(
    orderId,
    `fulfillment_${status.toLowerCase()}`,
    note ? `Marked ${label}: ${note}` : `Marked ${label}`,
    undefined,
    actorUserId,
  );
  const event = FULFILLMENT_EVENT[status];
  if (event) await onShopOrderEvent(orderId, event);
  return updated;
}

// ─── Reading ─────────────────────────────────────────────────────────────────

export type OrderTab =
  | "all"
  | "needs_action"
  | "awaiting_payment"
  | "to_pack"
  | "shipped"
  | "delivered"
  | "returns"
  | "drafts"
  | "cancelled";

/** Packed and shipped from RateUp; the rest are fulfilled in the Shopify or WooCommerce store. */
const FULFILLED_HERE = {
  checkoutVia: "RATEUP",
  externalId: null,
} satisfies Prisma.ShopOrderWhereInput;

function tabWhere(tab: OrderTab): Prisma.ShopOrderWhereInput {
  switch (tab) {
    case "needs_action":
      return {
        OR: [
          { status: "OPEN", paymentStatus: "COD_PENDING", confirmedAt: null },
          {
            status: "OPEN",
            paymentStatus: "PAID",
            fulfillmentStatus: "UNFULFILLED",
            ...FULFILLED_HERE,
          },
          { fulfillmentStatus: "FAILED_DELIVERY" },
          { returns: { some: { status: "REQUESTED" } } },
        ],
      };
    case "awaiting_payment":
      return {
        status: { in: ["DRAFT", "OPEN"] },
        paymentStatus: { in: ["UNPAID", "PENDING"] },
        checkoutStage: { in: ["PAYMENT", "DONE"] },
      };
    case "to_pack":
      return {
        status: "OPEN",
        fulfillmentStatus: { in: ["UNFULFILLED", "PACKED"] },
        ...FULFILLED_HERE,
        OR: [
          { paymentStatus: "PAID" },
          { paymentStatus: "COD_PENDING", confirmedAt: { not: null } },
        ],
      };
    case "shipped":
      return { fulfillmentStatus: { in: ["SHIPPED", "OUT_FOR_DELIVERY"] } };
    case "delivered":
      return { fulfillmentStatus: "DELIVERED" };
    case "returns":
      return {
        OR: [
          { returns: { some: {} } },
          { paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
        ],
      };
    case "drafts":
      return { status: "DRAFT" };
    case "cancelled":
      return { status: "CANCELLED" };
    default:
      return { status: { not: "DRAFT" } };
  }
}

export interface OrderListQuery {
  tab?: OrderTab;
  search?: string;
  channel?: ShopChannel;
  paymentStatus?: string;
  contactId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

const TABS: OrderTab[] = [
  "all",
  "needs_action",
  "awaiting_payment",
  "to_pack",
  "shipped",
  "delivered",
  "returns",
];

export async function listOrders(storeId: string, q: OrderListQuery) {
  const page = q.page ?? 0;
  const limit = Math.min(q.limit ?? 25, 100);
  const base: Prisma.ShopOrderWhereInput = {
    storeId,
    ...(q.channel ? { channel: q.channel } : {}),
    ...(q.contactId ? { contactId: q.contactId } : {}),
    ...(q.paymentStatus ? { paymentStatus: q.paymentStatus as ShopOrder["paymentStatus"] } : {}),
    ...(q.from || q.to
      ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
      : {}),
    ...(q.search
      ? {
          OR: [
            ...(/^#?\d+$/.test(q.search.trim())
              ? [{ number: Number(q.search.replace("#", "")) }]
              : []),
            { customerName: { contains: q.search, mode: "insensitive" as const } },
            { customerPhone: { contains: q.search.replace(/\s/g, "") } },
            {
              contact: {
                whatsappUserName: {
                  contains: q.search.replace(/^@/, ""),
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };
  const where = { AND: [base, tabWhere(q.tab ?? "all")] };
  const [items, total, ...counts] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      include: {
        items: { select: { id: true, quantity: true } },
        contact: { select: { id: true, name: true, whatsappUserName: true, ...primaryIdentities } },
      },
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
    }),
    prisma.shopOrder.count({ where }),
    ...TABS.map((t) => prisma.shopOrder.count({ where: { AND: [{ storeId }, tabWhere(t)] } })),
  ]);
  return {
    items: items.map(({ invoiceKey: _key, contact, ...o }) => ({
      ...o,
      contact: contact
        ? {
            id: contact.id,
            name: contact.name,
            phone: contactFields(contact.identities).phone,
            whatsappUserName: contact.whatsappUserName,
          }
        : null,
      nextStep: nextStep(o),
    })),
    total,
    page,
    limit,
    counts: Object.fromEntries(TABS.map((t, i) => [t, counts[i]])),
  };
}

/** One line telling staff what this order is waiting on. */
export function nextStep(
  o: Pick<
    ShopOrder,
    | "status"
    | "paymentStatus"
    | "fulfillmentStatus"
    | "confirmedAt"
    | "checkoutStage"
    | "checkoutVia"
    | "externalProvider"
    | "externalId"
  >,
): string {
  if (o.status === "CANCELLED") return "—";
  const store =
    o.externalProvider === "woocommerce" || o.checkoutVia === "WOOCOMMERCE"
      ? "WooCommerce"
      : "Shopify";
  if (o.status === "DRAFT" && inStoreCheckout(o.checkoutVia))
    return `Waiting for checkout in ${store}`;
  if (o.status !== "DRAFT" && fulfilledInStore(o)) {
    if (o.paymentStatus === "PENDING" || o.paymentStatus === "UNPAID") return "Waiting for payment";
    if (o.paymentStatus === "COD_PENDING" && !o.confirmedAt)
      return "Waiting for the customer to confirm";
    if (o.fulfillmentStatus === "UNFULFILLED" || o.fulfillmentStatus === "PACKED")
      return `Fulfil it in ${store}`;
    if (o.fulfillmentStatus === "DELIVERED") return "Delivered";
    return `Fulfilled in ${store}`;
  }
  if (o.status === "DRAFT") {
    return {
      ADDRESS: "Waiting for the address",
      DELIVERY: "Waiting for a delivery choice",
      LOYALTY: "Waiting on points",
      PAYMENT: "Waiting for payment",
      DONE: "Waiting for payment",
    }[o.checkoutStage];
  }
  if (o.paymentStatus === "COD_PENDING" && !o.confirmedAt)
    return "Waiting for the customer to confirm";
  if (o.fulfillmentStatus === "FAILED_DELIVERY") return "Delivery failed — arrange a new slot";
  if (o.paymentStatus === "PENDING" || o.paymentStatus === "UNPAID") return "Waiting for payment";
  if (o.fulfillmentStatus === "UNFULFILLED") return "Pack and ship";
  if (o.fulfillmentStatus === "PACKED") return "Add tracking and ship";
  if (o.fulfillmentStatus === "SHIPPED" || o.fulfillmentStatus === "OUT_FOR_DELIVERY")
    return "On its way";
  if (o.fulfillmentStatus === "DELIVERED") return "Delivered";
  return "—";
}

export async function getOrder(storeId: string, id: string) {
  const order = await prisma.shopOrder.findFirst({
    where: { id, storeId },
    include: orderDetailInclude,
  });
  if (!order) throw notFound("Order");
  const [stats, member] = await Promise.all([
    order.contactId
      ? prisma.shopOrder.aggregate({
          where: { storeId, contactId: order.contactId, status: { in: ["OPEN", "COMPLETED"] } },
          _count: { _all: true },
          _sum: { total: true },
        })
      : null,
    order.contactId
      ? import("./shopLoyalty.js").then((m) => m.memberFor(order.orgId, order.contactId))
      : null,
  ]);
  const { invoiceKey, ...rest } = withOrderContact(order);
  return {
    ...rest,
    hasInvoice: Boolean(invoiceKey),
    nextStep: nextStep(order),
    customerStats: stats ? { orders: stats._count._all, spent: toNumber(stats._sum.total) } : null,
    loyalty: member
      ? { points: member.account.currentPoints, tier: member.account.currentTier?.name ?? null }
      : null,
  };
}

export async function getOrderByToken(token: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { checkoutToken: token },
    include: orderDetailInclude,
  });
  if (!order) throw notFound("Checkout");
  return withOrderContact(order);
}

export async function updateStaffNote(storeId: string, id: string, staffNote: string | null) {
  const { count } = await prisma.shopOrder.updateMany({
    where: { id, storeId },
    data: { staffNote },
  });
  if (!count) throw notFound("Order");
}

/** The sweep's cancel reason; the checkout page reads it to say "expired" rather than "cancelled". */
export const CHECKOUT_EXPIRED_REASON = "Checkout expired";

/** How long an expired draft is kept before it is cancelled, for staff to see or revive. */
const EXPIRED_DRAFT_GRACE_MS = 3 * 24 * 3_600_000;

/**
 * Hourly: drafts past their checkout window give their held coupon uses and points back at
 * once, and are cancelled a few days later (which also frees any drop unit they claimed).
 */
export async function sweepExpiredDrafts(now = new Date()) {
  const held = await prisma.shopOrder.findMany({
    where: { status: "DRAFT", reservedAt: { not: null }, checkoutExpiresAt: { lt: now } },
    select: { id: true },
    take: 500,
  });
  for (const o of held)
    await releaseOrderBenefits(o.id).catch((err) =>
      log.warn({ err, orderId: o.id }, "Could not release an expired draft's holds"),
    );
  // Store checkouts too: cancelling closes the store's unpaid draft or order, which neither
  // Shopify nor WooCommerce does for an order RateUp created.
  const stale = await prisma.shopOrder.findMany({
    where: {
      status: "DRAFT",
      checkoutExpiresAt: { lt: new Date(now.getTime() - EXPIRED_DRAFT_GRACE_MS) },
    },
    select: { id: true },
    take: 500,
  });
  for (const o of stale)
    await cancelOrder(o.id, { reason: CHECKOUT_EXPIRED_REASON, notify: false }).catch((err) =>
      log.warn({ err, orderId: o.id }, "Could not cancel an expired draft"),
    );
  return { released: held.length, cancelled: stale.length };
}
