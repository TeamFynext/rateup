import type { Prisma, ShopOrder, ShopReturnStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { addOrderEvent, setFulfillmentStatus } from "./orders.service.js";
import { refundOrder } from "./payments/payments.service.js";
import { adjustStock, afterStockChange } from "./products.service.js";
import { round2, toNumber } from "./pricing.js";
import { notFound, ShopError } from "./shop.errors.js";
import type { ShopReturnItem } from "./shop.types.js";

/**
 * Returns move REQUESTED → APPROVED → RECEIVED → REFUNDED (or REJECTED). Stock comes back
 * only when the parcel is received with `restock` (the default), never on approval or refund:
 * an approved return may never arrive.
 */

type PricedOrder = Pick<
  ShopOrder,
  "subtotal" | "discountTotal" | "pointsDiscount" | "shippingTotal" | "total"
>;

/**
 * What the customer actually paid per unit of the goods: the coupon, a prepaid-switch discount
 * and points are spread over every line by value, and tax added on top of the prices (when the
 * store prices exclude it) is spread the same way. `shippingDiscount` is the part of
 * `discountTotal` a free-shipping code took off delivery rather than the goods.
 */
export function paidShareOfGoods(order: PricedOrder, shippingDiscount: number): number {
  const subtotal = toNumber(order.subtotal);
  if (subtotal <= 0) return 0;
  const goodsDiscount = Math.max(toNumber(order.discountTotal) - shippingDiscount, 0);
  const goodsPaid = Math.max(subtotal - goodsDiscount - toNumber(order.pointsDiscount), 0);
  const shippingPaid = Math.max(toNumber(order.shippingTotal) - shippingDiscount, 0);
  const taxable = goodsPaid + shippingPaid;
  const total = toNumber(order.total);
  const taxOnTop = taxable > 0 && total > taxable ? total / taxable : 1;
  return Math.min((goodsPaid / subtotal) * taxOnTop, taxOnTop);
}

async function shippingDiscountOf(
  order: Pick<ShopOrder, "discountId" | "discountTotal" | "shippingTotal">,
  db: Prisma.TransactionClient,
) {
  if (!order.discountId) return 0;
  const discount = await db.shopDiscount.findUnique({
    where: { id: order.discountId },
    select: { type: true, value: true },
  });
  if (discount?.type !== "FREE_SHIPPING") return 0;
  const cap = discount.value === null ? Infinity : toNumber(discount.value);
  return Math.min(toNumber(order.shippingTotal), toNumber(order.discountTotal), cap);
}

/** Units of each order line already on a return that was not rejected. */
function returnedSoFar(returns: { items: unknown }[]) {
  const taken = new Map<string, number>();
  for (const r of returns)
    for (const i of r.items as ShopReturnItem[])
      taken.set(i.orderItemId, (taken.get(i.orderItemId) ?? 0) + i.quantity);
  return taken;
}

export async function requestReturn(
  orderId: string,
  input: {
    reason: string;
    items: ShopReturnItem[];
    note?: string | null;
    actorUserId?: string | null;
  },
) {
  if (!input.reason?.trim()) throw new ShopError("INVALID", "Say why it's coming back");
  const items = input.items.filter((i) => i.quantity > 0);
  if (!items.length) throw new ShopError("INVALID", "Pick at least one item");

  // The order row is locked so two returns filed at once can't both claim the same units.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ShopOrder" WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true, returns: { where: { status: { not: "REJECTED" } } } },
    });
    if (!order) throw notFound("Order");
    if (order.fulfillmentStatus !== "DELIVERED" && order.fulfillmentStatus !== "SHIPPED")
      throw new ShopError("CONFLICT", "Only shipped or delivered orders can be returned");
    const taken = returnedSoFar(order.returns);
    const asked = new Map<string, number>();
    for (const i of items) asked.set(i.orderItemId, (asked.get(i.orderItemId) ?? 0) + i.quantity);
    for (const [orderItemId, quantity] of asked) {
      const line = order.items.find((l) => l.id === orderItemId);
      if (!line) throw new ShopError("INVALID", "Those items aren't on this order");
      if (quantity > line.quantity - (taken.get(orderItemId) ?? 0))
        throw new ShopError("INVALID", `More of ${line.title} than is left to return`);
    }
    const share = paidShareOfGoods(order, await shippingDiscountOf(order, tx));
    const refundAmount = round2(
      items.reduce(
        (s, i) =>
          s +
          toNumber(order.items.find((l) => l.id === i.orderItemId)!.unitPrice) * share * i.quantity,
        0,
      ),
    );
    return tx.shopReturn.create({
      data: { orderId, reason: input.reason.trim(), items, note: input.note ?? null, refundAmount },
    });
  });
  await addOrderEvent(
    orderId,
    "return_requested",
    `Return requested: ${input.reason.trim()}`,
    undefined,
    input.actorUserId,
  );
  return created;
}

export async function updateReturn(
  storeId: string,
  returnId: string,
  action: "approve" | "reject" | "receive" | "refund",
  opts: {
    actorUserId: string;
    refundAmount?: number | null;
    restock?: boolean;
    note?: string | null;
  },
) {
  const ret = await prisma.shopReturn.findFirst({
    where: { id: returnId, order: { storeId } },
    include: { order: { include: { items: true } } },
  });
  if (!ret) throw notFound("Return");
  const next: Record<typeof action, { from: ShopReturnStatus[]; to: ShopReturnStatus }> = {
    approve: { from: ["REQUESTED"], to: "APPROVED" },
    reject: { from: ["REQUESTED", "APPROVED"], to: "REJECTED" },
    receive: { from: ["APPROVED"], to: "RECEIVED" },
    refund: { from: ["APPROVED", "RECEIVED"], to: "REFUNDED" },
  };
  const step = next[action];
  if (!step.from.includes(ret.status))
    throw new ShopError("CONFLICT", `This return is ${ret.status.toLowerCase()}`);
  const owed = ret.refundAmount === null ? null : toNumber(ret.refundAmount);
  if (
    action === "refund" &&
    opts.refundAmount != null &&
    owed !== null &&
    opts.refundAmount > owed + 0.009
  )
    throw new ShopError("INVALID", `This return is for up to ${owed.toFixed(2)}`);

  const restock = action === "receive" && (opts.restock ?? true);
  const claim = {
    where: { id: returnId, status: { in: step.from } },
    data: {
      status: step.to,
      note: opts.note ?? ret.note,
      ...(action === "receive" ? { restock } : {}),
      ...(action === "refund" && opts.refundAmount != null
        ? { refundAmount: opts.refundAmount }
        : {}),
      ...(step.to === "REFUNDED" || step.to === "REJECTED" ? { resolvedAt: new Date() } : {}),
    },
  };
  const conflict = () =>
    new ShopError("CONFLICT", "This return was just updated. Reload to see it.");

  if (action === "receive") {
    // The claim and the stock movements commit together: a failed restock leaves the return
    // APPROVED with no stock moved, so receiving it again cannot restock twice.
    const moves = await prisma.$transaction(async (tx) => {
      const { count } = await tx.shopReturn.updateMany(claim);
      if (!count) throw conflict();
      if (!restock) return [];
      const moved = [];
      for (const item of ret.items as ShopReturnItem[]) {
        const line = ret.order.items.find((l) => l.id === item.orderItemId);
        if (!line?.variantId) continue;
        moved.push(
          await adjustStock(tx, line.variantId, item.quantity, "RETURN", {
            orderId: ret.orderId,
            userId: opts.actorUserId,
          }),
        );
      }
      return moved;
    });
    for (const m of moves) await afterStockChange(m.before, m.after).catch(() => {});
    await setFulfillmentStatus(ret.orderId, "RETURNED", opts.actorUserId).catch(() => {});
  } else {
    // Claimed before refunding, so two clicks (or two staff) can't refund twice.
    const { count } = await prisma.shopReturn.updateMany(claim);
    if (!count) throw conflict();
    if (action === "refund") {
      try {
        await refundOrder(ret.orderId, opts.refundAmount ?? owed, opts.actorUserId);
      } catch (err) {
        await prisma.shopReturn.update({
          where: { id: returnId },
          data: {
            status: ret.status,
            note: ret.note,
            refundAmount: ret.refundAmount,
            resolvedAt: null,
          },
        });
        throw err;
      }
    }
  }
  const updated = await prisma.shopReturn.findUniqueOrThrow({ where: { id: returnId } });
  await addOrderEvent(
    ret.orderId,
    `return_${step.to.toLowerCase()}`,
    `Return ${step.to.toLowerCase()}`,
    undefined,
    opts.actorUserId,
  );
  return updated;
}
