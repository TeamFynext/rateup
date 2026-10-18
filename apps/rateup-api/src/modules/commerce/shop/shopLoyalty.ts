import type { Prisma, ShopStore } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { awardPoints } from "../../loyalty/accounts/account.service.js";
import { reversePurchasePoints } from "../../loyalty/accounts/pointsReversal.service.js";
import { round2, toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";

/**
 * The shop's side of loyalty: spending points as money at checkout, giving them back when an
 * order is cancelled, and earning on paid orders. Earning goes through the programme's own
 * `awardPoints` so its rules, tiers and messages apply exactly as they do at the till.
 */

const earnKey = (orderId: string) => `shop-earn-${orderId}`;
const spendKey = (orderId: string) => `shop-redeem-${orderId}`;
const refundKey = (orderId: string) => `shop-redeem-refund-${orderId}`;

export async function memberFor(orgId: string, contactId: string | null | undefined) {
  if (!contactId) return null;
  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    select: { id: true, status: true, currencyName: true },
  });
  if (!program || program.status !== "active") return null;
  const account = await prisma.customerLoyaltyAccount.findUnique({
    where: { programId_contactId: { programId: program.id, contactId } },
    select: {
      id: true,
      currentPoints: true,
      status: true,
      currentTier: { select: { name: true } },
    },
  });
  if (!account || account.status !== "active") return null;
  return { program, account };
}

/** What a member could spend on goods worth `goods`: whole points, capped by the store's rules. */
export function redeemablePoints(
  store: Pick<ShopStore, "pointValue" | "minPointsToRedeem" | "maxPointsPct">,
  balance: number,
  goods: number,
) {
  const value = toNumber(store.pointValue);
  if (!value || balance < store.minPointsToRedeem) return { points: 0, value: 0 };
  const capMoney = (goods * Math.min(Math.max(store.maxPointsPct, 0), 100)) / 100;
  const points = Math.min(balance, Math.floor(capMoney / value));
  if (points < store.minPointsToRedeem) return { points: 0, value: 0 };
  return { points, value: round2(points * value) };
}

export async function pointsOffer(store: ShopStore, contactId: string | null, goods: number) {
  if (!store.offerPoints || !store.pointValue) return null;
  const member = await memberFor(store.orgId, contactId);
  if (!member) return null;
  const { points, value } = redeemablePoints(store, member.account.currentPoints, goods);
  return {
    balance: member.account.currentPoints,
    tier: member.account.currentTier?.name ?? null,
    currencyName: member.program.currencyName,
    points,
    value,
  };
}

/** Debits the points an order spends. Inside the order's placing transaction. */
export async function spendPoints(
  tx: Prisma.TransactionClient,
  orgId: string,
  contactId: string,
  orderId: string,
  points: number,
) {
  if (points <= 0) return;
  const member = await memberFor(orgId, contactId);
  if (!member) throw new ShopError("INVALID", "Points can only be used by loyalty members");
  const already = await tx.loyaltyTransaction.findUnique({
    where: {
      programId_idempotencyKey: { programId: member.program.id, idempotencyKey: spendKey(orderId) },
    },
  });
  if (already) return;
  const { count } = await tx.customerLoyaltyAccount.updateMany({
    where: { id: member.account.id, currentPoints: { gte: points } },
    data: { currentPoints: { decrement: points } },
  });
  if (!count) throw new ShopError("CONFLICT", "Not enough points left for this order");
  const { currentPoints } = await tx.customerLoyaltyAccount.findUniqueOrThrow({
    where: { id: member.account.id },
    select: { currentPoints: true },
  });
  await tx.loyaltyTransaction.create({
    data: {
      accountId: member.account.id,
      programId: member.program.id,
      transactionType: "redeem",
      points: -points,
      balanceAfter: currentPoints,
      source: "shop_order",
      referenceId: orderId,
      idempotencyKey: spendKey(orderId),
      description: "Spent at checkout",
    },
  });
}

/** Gives back points an order spent, when it is cancelled before being fulfilled. */
export async function refundSpentPoints(orgId: string, orderId: string) {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    select: { id: true },
  });
  if (!program) return;
  await prisma.$transaction(async (tx) => {
    const spent = await tx.loyaltyTransaction.findUnique({
      where: {
        programId_idempotencyKey: { programId: program.id, idempotencyKey: spendKey(orderId) },
      },
    });
    if (!spent) return;
    const done = await tx.loyaltyTransaction.findUnique({
      where: {
        programId_idempotencyKey: { programId: program.id, idempotencyKey: refundKey(orderId) },
      },
    });
    if (done) return;
    const account = await tx.customerLoyaltyAccount.update({
      where: { id: spent.accountId },
      data: { currentPoints: { increment: -spent.points } },
      select: { currentPoints: true },
    });
    await tx.loyaltyTransaction.create({
      data: {
        accountId: spent.accountId,
        programId: program.id,
        transactionType: "refund",
        points: -spent.points,
        balanceAfter: account.currentPoints,
        source: "shop_order",
        referenceId: orderId,
        idempotencyKey: refundKey(orderId),
        description: "Returned: order cancelled",
      },
    });
  });
}

/** Earns on what the customer actually paid, scaled by each product's multiplier. */
export async function earnForOrder(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!order?.contactId) return;
  // Written back to Shopify: its order webhook earns the points, once.
  if (order.externalProvider === "shopify") return;
  const member = await memberFor(order.orgId, order.contactId);
  if (!member) return;

  // A 2× product earns as if twice its share of the paid amount was spent.
  const goods = order.items.reduce((s, i) => s + toNumber(i.lineTotal), 0);
  const paidGoods = Math.max(toNumber(order.total) - toNumber(order.shippingTotal), 0);
  const weighted = order.items.reduce((s, i) => {
    const share = goods ? toNumber(i.lineTotal) / goods : 0;
    const multiplier = toNumber(i.variant?.product.loyaltyMultiplier ?? 1) || 1;
    return s + share * paidGoods * multiplier;
  }, 0);
  if (weighted <= 0) return;

  try {
    await awardPoints(member.program.id, order.contactId, round2(weighted), {
      orderId: order.id,
      channel: `shop_${order.channel.toLowerCase()}`,
      productSkus: order.items.map((i) => i.sku).filter((s): s is string => !!s),
      notes: `Order #${order.number}`,
      idempotencyKey: earnKey(order.id),
    });
  } catch (err) {
    log.warn({ err, orderId }, "Could not award loyalty points for a shop order");
  }
}

export async function reverseEarnedPoints(
  orderId: string,
  reason: "order_cancelled" | "order_refunded",
) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order?.contactId) return;
  const member = await memberFor(order.orgId, order.contactId);
  if (!member) return;
  await reversePurchasePoints({
    programId: member.program.id,
    accountId: member.account.id,
    originalIdempotencyKey: earnKey(orderId),
    orderId,
    idempotencyKey: `shop-reverse-${orderId}`,
    source: reason,
    reason: `Order #${order.number} ${reason === "order_cancelled" ? "cancelled" : "refunded"}`,
    orgId: order.orgId,
  });
}
