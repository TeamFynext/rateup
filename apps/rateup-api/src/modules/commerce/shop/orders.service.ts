import { randomBytes } from "node:crypto";

import type {
  Prisma,
  ShopChannel,
  ShopCheckoutStage,
  ShopFulfillmentStatus,
  ShopOrder,
  ShopStore,
} from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { redeemDiscount, releaseDiscount, resolveDiscount } from "./discounts.service.js";
import { onShopOrderEvent, type ShopOrderEventType } from "./events.js";
import { priceOrder, round2, shippingFor, toNumber, type PricedLine } from "./pricing.js";
import { adjustStock, afterStockChange } from "./products.service.js";
import { notFound, ShopError } from "./shop.errors.js";
import { pointsOffer, refundSpentPoints, reverseEarnedPoints, spendPoints } from "./shopLoyalty.js";
import type { ShopAddress, ShopAttribution, ShopSelectedShipping } from "./shop.types.js";
import { getStoreById, nextOrderNumber, ratesForDestination } from "./store.service.js";

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
      phone: true,
      igsId: true,
      psid: true,
      email: true,
      profilePic: true,
    },
  },
} satisfies Prisma.ShopOrderInclude;

export type ShopOrderDetail = Prisma.ShopOrderGetPayload<{ include: typeof orderDetailInclude }>;

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
async function resolveLines(storeId: string, items: CartLineInput[]) {
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
  return [...merged.values()];
}

function stageAfterCreate(store: ShopStore): ShopCheckoutStage {
  if (store.askAddress) return "ADDRESS";
  if (store.askDelivery) return "DELIVERY";
  return "PAYMENT";
}

export async function createDraftOrder(input: CreateDraftInput) {
  const { store } = input;
  const lines = await resolveLines(store.id, input.items);
  if (!lines.length)
    throw new ShopError("INVALID", "None of those products are for sale right now");

  const contact = input.contactId
    ? await prisma.contact.findUnique({
        where: { id: input.contactId },
        select: { name: true, phone: true, email: true },
      })
    : null;

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, store.id);
    return tx.shopOrder.create({
      data: {
        storeId: store.id,
        orgId: store.orgId,
        number,
        contactId: input.contactId ?? null,
        channel: input.channel,
        source: input.source ?? null,
        channelAccountId: input.channelAccountId ?? null,
        currency: store.currency,
        checkoutStage: stageAfterCreate(store),
        customerName: input.customer?.name ?? contact?.name ?? null,
        customerPhone: input.customer?.phone ?? contact?.phone ?? null,
        customerEmail: input.customer?.email ?? contact?.email ?? null,
        attribution: input.attribution ?? undefined,
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

  // Shipping: an explicit pick, else the current pick re-quoted, else the only option.
  let shipping: ShopSelectedShipping | null =
    (order.shippingRate as ShopSelectedShipping | null) ?? null;
  const rates = await ratesForDestination(store.id, address?.country);
  const wantedRateId = patch.shippingRateId !== undefined ? patch.shippingRateId : shipping?.rateId;
  if (wantedRateId) {
    const rate = rates.find((r) => r.id === wantedRateId);
    if (!rate && patch.shippingRateId)
      throw new ShopError("INVALID", "That delivery option isn't available");
    shipping = rate
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
  } else if (rates.length === 1 && !shipping) {
    const rate = rates[0];
    shipping = {
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
    };
  }

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
        orderId: order.id,
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

  return prisma.shopOrder.update({
    where: { id: order.id },
    data: {
      shippingAddress: address ?? undefined,
      shippingRate: shipping ?? undefined,
      discountCode: discountCode ?? null,
      discountId: discount?.discount.id ?? null,
      pointsRedeemed,
      customerName: patch.customer?.name ?? patch.shippingAddress?.name ?? order.customerName,
      customerEmail: patch.customer?.email ?? order.customerEmail,
      customerPhone: patch.customer?.phone ?? order.customerPhone,
      note: patch.note !== undefined ? patch.note : order.note,
      ...totals,
    },
    include: orderDetailInclude,
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
 * Turns a draft into a real order: stock is taken, the coupon and points are spent. Paid and
 * cash orders both pass through here; the stock check is the moment a sold-out item is found.
 */
export async function placeOrder(
  orderId: string,
  opts: { paymentMethod: string; codPending?: boolean; actorUserId?: string | null },
) {
  const changed: {
    before: Parameters<typeof afterStockChange>[0];
    after: Parameters<typeof afterStockChange>[1];
  }[] = [];
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.shopOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) throw notFound("Order");
    if (o.status !== "DRAFT") return o;

    for (const item of o.items) {
      if (!item.variantId) continue;
      const v = await tx.shopVariant.findUnique({ where: { id: item.variantId } });
      if (v && v.trackInventory && !v.allowBackorder) {
        // Conditional, so two customers paying for the last one cannot both take it.
        const { count } = await tx.shopVariant.updateMany({
          where: { id: v.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (!count) {
          const left =
            (await tx.shopVariant.findUnique({ where: { id: v.id }, select: { stock: true } }))
              ?.stock ?? 0;
          throw new ShopError(
            "OUT_OF_STOCK",
            left > 0
              ? `Only ${left} of ${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ""} left`
              : `${item.title} just sold out`,
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
    if (o.discountId) {
      await redeemDiscount(tx, o.discountId, o.id, o.contactId, toNumber(o.discountTotal));
    }
    if (o.pointsRedeemed > 0 && o.contactId) {
      await spendPoints(tx, o.orgId, o.contactId, o.id, o.pointsRedeemed);
    }
    const placed = await tx.shopOrder.update({
      where: { id: o.id },
      data: {
        status: "OPEN",
        placedAt: new Date(),
        paymentMethod: opts.paymentMethod,
        paymentStatus: opts.codPending ? "COD_PENDING" : o.paymentStatus,
        checkoutStage: "DONE",
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
    return placed;
  });
  for (const c of changed)
    await afterStockChange(c.before, c.after).catch((err) =>
      log.warn({ err }, "stock follow-up failed"),
    );
  await onShopOrderEvent(order.id, "placed");
  return order;
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
  if (current.status === "CANCELLED") {
    // Paid after it was cancelled (a slow payment page). Keep the money visible to staff.
    await addOrderEvent(
      orderId,
      "paid_after_cancel",
      "Payment arrived after the order was cancelled — refund or reopen it",
      { provider: payment.provider },
    );
    return current;
  }
  if (current.status === "DRAFT") {
    try {
      await placeOrder(orderId, {
        paymentMethod: payment.provider,
        actorUserId: payment.actorUserId,
      });
    } catch (err) {
      // Stock, the coupon or the points ran out between the payment page and the payment:
      // the customer has paid, so the order stands and staff decide (backorder or refund).
      const conflict = ["OUT_OF_STOCK", "DISCOUNT_INVALID", "CONFLICT"];
      if (!(err instanceof ShopError && conflict.includes(err.code))) throw err;
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: {
          status: "OPEN",
          placedAt: new Date(),
          checkoutStage: "DONE",
          paymentMethod: payment.provider,
        },
      });
      await addOrderEvent(
        orderId,
        "paid_with_conflict",
        `${err.message} — paid anyway, please review`,
      );
    }
  }
  const order = await prisma.shopOrder.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", paidAt: new Date(), paymentMethod: payment.provider },
  });
  await addOrderEvent(
    orderId,
    "paid",
    `Paid ${order.currency} ${toNumber(payment.amount ?? order.total).toFixed(2)} · ${payment.provider}`,
    { paymentId: payment.paymentId ?? null },
    payment.actorUserId,
  );
  await onShopOrderEvent(orderId, "paid");
  return order;
}

export async function confirmCodOrder(orderId: string, actorUserId?: string | null) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.paymentStatus !== "COD_PENDING" || order.confirmedAt) return order;
  const updated = await prisma.shopOrder.update({
    where: { id: orderId },
    data: { confirmedAt: new Date() },
  });
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
  opts: { reason: string; restock?: boolean; actorUserId?: string | null; notify?: boolean },
) {
  const changed: Awaited<ReturnType<typeof adjustStock>>[] = [];
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.shopOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) throw notFound("Order");
    if (o.status === "CANCELLED") return o;
    if (o.fulfillmentStatus === "SHIPPED" || o.fulfillmentStatus === "DELIVERED")
      throw new ShopError("CONFLICT", "This order has shipped; start a return instead");
    const wasPlaced = o.status !== "DRAFT";
    if (wasPlaced && opts.restock !== false) {
      for (const item of o.items) {
        if (item.variantId)
          changed.push(await adjustStock(tx, item.variantId, item.quantity, "CANCEL", { orderId }));
      }
    }
    if (wasPlaced) await releaseDiscount(tx, o.id);
    await tx.shopPayment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    const cancelled = await tx.shopOrder.update({
      where: { id: o.id },
      data: {
        status: "CANCELLED",
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
  for (const c of changed) await afterStockChange(c.before, c.after).catch(() => {});
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

function tabWhere(tab: OrderTab): Prisma.ShopOrderWhereInput {
  switch (tab) {
    case "needs_action":
      return {
        OR: [
          { status: "OPEN", paymentStatus: "COD_PENDING", confirmedAt: null },
          { status: "OPEN", paymentStatus: "PAID", fulfillmentStatus: "UNFULFILLED" },
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
        contact: { select: { id: true, name: true, phone: true, whatsappUserName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
    }),
    prisma.shopOrder.count({ where }),
    ...TABS.map((t) => prisma.shopOrder.count({ where: { AND: [{ storeId }, tabWhere(t)] } })),
  ]);
  return {
    items: items.map((o) => ({ ...o, nextStep: nextStep(o) })),
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
    "status" | "paymentStatus" | "fulfillmentStatus" | "confirmedAt" | "checkoutStage"
  >,
): string {
  if (o.status === "CANCELLED") return "—";
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
  return {
    ...order,
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
  return order;
}

export async function updateStaffNote(storeId: string, id: string, staffNote: string | null) {
  const { count } = await prisma.shopOrder.updateMany({
    where: { id, storeId },
    data: { staffNote },
  });
  if (!count) throw notFound("Order");
}
