import type { ShopStore } from "../../../../generated/prisma/client.js";
import { inStoreCheckout, storeLabel } from "./checkoutVia.js";
import { storeConnected } from "./externalCheckout.service.js";
import prisma from "../../../utils/prisma.js";
import { listPaymentMethods } from "./payments/payments.service.js";
import { nextStep } from "./orders.service.js";
import { round2, toNumber } from "./pricing.js";

const PLACED = { in: ["OPEN", "COMPLETED"] as ("OPEN" | "COMPLETED")[] };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * The Commerce overview: what sold, where it came from, what needs a person, and how far the
 * shop is from being set up. Revenue is what was paid, by the day it was paid.
 */
export async function getOverview(store: ShopStore, from: Date, to: Date) {
  const span = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);
  const range = { gte: from, lte: to };

  const [paid, prevPaid, placedCount, prevPlacedCount, drafts, prevDrafts, recent] =
    await Promise.all([
      prisma.shopOrder.findMany({
        where: {
          storeId: store.id,
          paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
          paidAt: range,
        },
        select: { total: true, paidAt: true, channel: true, reminderCount: true, contactId: true },
      }),
      prisma.shopOrder.aggregate({
        where: {
          storeId: store.id,
          paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
          paidAt: { gte: prevFrom, lt: from },
        },
        _sum: { total: true },
      }),
      prisma.shopOrder.count({ where: { storeId: store.id, status: PLACED, placedAt: range } }),
      prisma.shopOrder.count({
        where: { storeId: store.id, status: PLACED, placedAt: { gte: prevFrom, lt: from } },
      }),
      prisma.shopOrder.count({ where: { storeId: store.id, createdAt: range } }),
      prisma.shopOrder.count({
        where: { storeId: store.id, createdAt: { gte: prevFrom, lt: from } },
      }),
      prisma.shopOrder.findMany({
        where: { storeId: store.id, status: { not: "DRAFT" } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          number: true,
          customerName: true,
          channel: true,
          total: true,
          currency: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          confirmedAt: true,
          checkoutStage: true,
          checkoutVia: true,
          externalProvider: true,
          externalId: true,
          createdAt: true,
        },
      }),
    ]);

  const revenue = round2(paid.reduce((s, o) => s + toNumber(o.total), 0));
  const prevRevenue = toNumber(prevPaid._sum.total);
  const recovered = round2(
    paid.filter((o) => o.reminderCount > 0).reduce((s, o) => s + toNumber(o.total), 0),
  );
  const conversion = drafts ? paid.length / drafts : 0;
  const prevConversion = prevDrafts
    ? (await prisma.shopOrder.count({
        where: {
          storeId: store.id,
          paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
          paidAt: { gte: prevFrom, lt: from },
        },
      })) / prevDrafts
    : 0;
  const pct = (now: number, before: number) =>
    before ? round2(((now - before) / before) * 100) : null;

  // Daily paid revenue, split into recovered (after a reminder) and the rest.
  const days = new Map<
    string,
    { date: string; revenue: number; recovered: number; orders: number }
  >();
  for (let t = from.getTime(); t <= to.getTime(); t += 86_400_000) {
    const k = dayKey(new Date(t));
    days.set(k, { date: k, revenue: 0, recovered: 0, orders: 0 });
  }
  const byChannel = new Map<string, { channel: string; revenue: number; orders: number }>();
  for (const o of paid) {
    const d = days.get(dayKey(o.paidAt!));
    const amount = toNumber(o.total);
    if (d) {
      d.orders++;
      if (o.reminderCount > 0) d.recovered = round2(d.recovered + amount);
      else d.revenue = round2(d.revenue + amount);
    }
    const c = byChannel.get(o.channel) ?? { channel: o.channel, revenue: 0, orders: 0 };
    c.revenue = round2(c.revenue + amount);
    c.orders++;
    byChannel.set(o.channel, c);
  }

  // Messages Meta marked billable to customers who bought, as a count per category.
  const buyers = [...new Set(paid.map((o) => o.contactId).filter((id): id is string => !!id))];
  const billable = buyers.length
    ? await prisma.waMessage.groupBy({
        by: ["pricingCategory"],
        where: { contactId: { in: buyers }, pricingBillable: true, createdAt: range },
        _count: { _all: true },
      })
    : [];

  const attention = await needsAttention(store);
  const setup = await setupChecklist(store);

  return {
    currency: store.currency,
    range: { from, to },
    kpis: {
      revenue: { value: revenue, change: pct(revenue, prevRevenue) },
      orders: { value: placedCount, change: pct(placedCount, prevPlacedCount) },
      conversion: {
        value: round2(conversion * 100),
        change: prevConversion ? round2((conversion - prevConversion) * 100) : null,
      },
      recovered: { value: recovered },
    },
    series: [...days.values()],
    channels: [...byChannel.values()].sort((a, b) => b.revenue - a.revenue),
    billableMessages: Object.fromEntries(
      billable.map((b) => [b.pricingCategory ?? "UNKNOWN", b._count._all]),
    ),
    recentOrders: recent.map((o) => ({ ...o, total: toNumber(o.total), nextStep: nextStep(o) })),
    attention,
    setup,
  };
}

async function needsAttention(store: ShopStore) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [variants, codPending, openCarts, returns, failed, syncErrors] = await Promise.all([
    prisma.shopVariant.findMany({
      where: { storeId: store.id, trackInventory: true, product: { status: "ACTIVE" } },
      select: {
        id: true,
        stock: true,
        lowStockAt: true,
        title: true,
        product: { select: { id: true, title: true } },
        _count: { select: { stockAlerts: { where: { notifiedAt: null } } } },
      },
    }),
    prisma.shopOrder.count({
      where: { storeId: store.id, status: "OPEN", paymentStatus: "COD_PENDING", confirmedAt: null },
    }),
    prisma.shopOrder.aggregate({
      where: { storeId: store.id, status: "DRAFT", createdAt: { gte: startOfDay } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.shopReturn.findMany({
      where: { status: "REQUESTED", order: { storeId: store.id } },
      select: { id: true, reason: true, order: { select: { id: true, number: true } } },
      take: 3,
    }),
    prisma.shopOrder.count({ where: { storeId: store.id, fulfillmentStatus: "FAILED_DELIVERY" } }),
    prisma.shopProduct.count({
      where: { storeId: store.id, metaSyncStatus: "REJECTED", status: "ACTIVE" },
    }),
  ]);
  const low = variants
    .filter((v) => v.stock <= (v.lowStockAt ?? store.lowStockThreshold))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3)
    .map((v) => ({
      productId: v.product.id,
      title: v.product.title + (v.title !== "Default" ? ` (${v.title})` : ""),
      stock: v.stock,
      waiting: v._count.stockAlerts,
    }));
  return {
    lowStock: low,
    codUnconfirmed: codPending,
    openCartsToday: { count: openCarts._count._all, value: toNumber(openCarts._sum.total) },
    returnsRequested: returns.map((r) => ({
      id: r.id,
      reason: r.reason,
      orderId: r.order.id,
      number: r.order.number,
    })),
    failedDeliveries: failed,
    syncErrors,
  };
}

export async function setupChecklist(store: ShopStore) {
  const inStore = inStoreCheckout(store.checkoutVia);
  const [products, rates, payments, connected] = await Promise.all([
    prisma.shopProduct.count({ where: { storeId: store.id, status: "ACTIVE" } }),
    prisma.shopShippingRate.count({ where: { storeId: store.id, active: true } }),
    listPaymentMethods(store),
    inStore ? storeConnected(store.orgId, store.checkoutVia) : false,
  ]);
  const [wa, tested] = await Promise.all([
    prisma.whatsappSettings.count({ where: { orgId: store.orgId, phoneId: { not: null } } }),
    prisma.shopOrder.count({
      where: {
        storeId: store.id,
        OR: [{ source: "test" }, { status: { in: ["OPEN", "COMPLETED"] } }],
      },
    }),
  ]);
  // In the order a merchant can do them; each one is something they set, never a default.
  const steps = [
    { id: "whatsapp", label: "Connect WhatsApp", done: wa > 0 },
    { id: "catalog", label: "Connect your Meta catalog", done: !!store.metaCatalogId },
    {
      id: "products",
      label: products ? `${products} products added` : "Add a product",
      done: products > 0,
    },
    // Paid in Shopify or WooCommerce: the store takes the money (and, for Shopify, the
    // delivery), so RateUp's own payment methods and rates aren't asked for.
    inStore
      ? {
          id: "checkout",
          label: `Customers pay on your ${storeLabel(store.checkoutVia)} checkout`,
          done: connected,
        }
      : {
          id: "payments",
          label: "Choose how you get paid",
          done:
            payments.providers.some((p) => p.connected) ||
            store.codEnabled ||
            store.bankTransferEnabled,
        },
    // WooCommerce's payment page has no delivery step, so its delivery comes from RateUp's rates.
    ...(store.checkoutVia === "SHOPIFY"
      ? []
      : [{ id: "shipping", label: "Set a delivery rate", done: rates > 0 }]),
    { id: "test_order", label: "Try a test order", done: tested > 0 },
  ];
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
}
