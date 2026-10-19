import type { ShopReturnStatus } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { addOrderEvent, setFulfillmentStatus } from "./orders.service.js";
import { refundOrder } from "./payments/payments.service.js";
import { adjustStock, afterStockChange } from "./products.service.js";
import { round2, toNumber } from "./pricing.js";
import { notFound, ShopError } from "./shop.errors.js";
import type { ShopReturnItem } from "./shop.types.js";

/**
 * Returns move REQUESTED → APPROVED → RECEIVED → REFUNDED (or REJECTED). Stock comes back
 * when the parcel is received, not when the return is approved: an approved return may
 * never arrive.
 */

export async function requestReturn(
  orderId: string,
  input: {
    reason: string;
    items: ShopReturnItem[];
    note?: string | null;
    actorUserId?: string | null;
  },
) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw notFound("Order");
  if (order.fulfillmentStatus !== "DELIVERED" && order.fulfillmentStatus !== "SHIPPED")
    throw new ShopError("CONFLICT", "Only shipped or delivered orders can be returned");
  if (!input.reason?.trim()) throw new ShopError("INVALID", "Say why it's coming back");
  const items = input.items.filter((i) => i.quantity > 0);
  for (const i of items) {
    const line = order.items.find((l) => l.id === i.orderItemId);
    if (!line || i.quantity > line.quantity)
      throw new ShopError("INVALID", "Those items aren't on this order");
  }
  if (!items.length) throw new ShopError("INVALID", "Pick at least one item");
  const refundAmount = round2(
    items.reduce(
      (s, i) =>
        s + toNumber(order.items.find((l) => l.id === i.orderItemId)!.unitPrice) * i.quantity,
      0,
    ),
  );
  const created = await prisma.shopReturn.create({
    data: { orderId, reason: input.reason.trim(), items, note: input.note ?? null, refundAmount },
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

  // Claimed before restocking or refunding, so two clicks (or two staff) can't do either twice.
  const { count } = await prisma.shopReturn.updateMany({
    where: { id: returnId, status: { in: step.from } },
    data: {
      status: step.to,
      note: opts.note ?? ret.note,
      ...(action === "refund" && opts.refundAmount != null
        ? { refundAmount: opts.refundAmount }
        : {}),
      ...(step.to === "REFUNDED" || step.to === "REJECTED" ? { resolvedAt: new Date() } : {}),
    },
  });
  if (!count) throw new ShopError("CONFLICT", "This return was just updated. Reload to see it.");

  try {
    if (action === "receive" && (opts.restock ?? ret.restock)) {
      for (const item of ret.items as ShopReturnItem[]) {
        const line = ret.order.items.find((l) => l.id === item.orderItemId);
        if (!line?.variantId) continue;
        const moved = await prisma.$transaction((tx) =>
          adjustStock(tx, line.variantId!, item.quantity, "RETURN", {
            orderId: ret.orderId,
            userId: opts.actorUserId,
          }),
        );
        await afterStockChange(moved.before, moved.after);
      }
      await setFulfillmentStatus(ret.orderId, "RETURNED", opts.actorUserId).catch(() => {});
    }
    if (action === "refund")
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
