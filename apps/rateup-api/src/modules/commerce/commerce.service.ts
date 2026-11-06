import { ChannelNotFoundError } from "./commerce.errors.js";
export { ChannelNotFoundError };
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
import prisma from "../../utils/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import type {
  CommerceFilter,
  CommerceOrdersQuery,
  CommerceTimeseriesQuery,
  CommerceTopProductsQuery,
} from "./commerce.schema.js";

/**
 * Shape written by catalog.service.ts when a WhatsApp order lands — Meta's
 * `product_retailer_id`/`item_price` are already normalized to these names.
 */
export interface OrderLineItem {
  retailerId?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  title?: string;
  image?: string | null;
}

type DeliveryOption = { charge?: number } | null;

function lineItems(products: unknown): OrderLineItem[] {
  return Array.isArray(products) ? (products as OrderLineItem[]) : [];
}

function money(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemsSubtotal(products: unknown): number {
  return lineItems(products).reduce(
    (sum, item) => sum + money(item?.price) * money(item?.quantity),
    0,
  );
}

/** There is no stored total column — totals are items + delivery, as the UI shows them. */
export function orderTotal(products: unknown, deliveryOption?: unknown): number {
  const delivery = money((deliveryOption as DeliveryOption)?.charge);
  return itemsSubtotal(products) + delivery;
}

export function orderItemCount(products: unknown): number {
  return lineItems(products).reduce((sum, item) => sum + money(item?.quantity), 0);
}

export function orderCurrency(products: unknown): string | undefined {
  return lineItems(products).find((item) => item?.currency)?.currency;
}

export function orderCurrencies(products: unknown): string[] {
  const seen = new Set<string>();
  for (const item of lineItems(products)) {
    if (item?.currency) seen.add(item.currency);
  }
  return [...seen];
}

/**
 * A "channel" is a connected WhatsApp number. Callers may pass either the
 * phoneId (what the UI switcher holds) or the catalogId directly. Both are
 * verified against the org so one tenant can't read another's orders.
 */
export async function resolveChannelCatalogId(
  orgId: string,
  filter: Pick<CommerceFilter, "catalogId" | "phoneId">,
): Promise<string | undefined> {
  let catalogId = filter.catalogId;

  if (!catalogId && filter.phoneId) {
    const map = await prisma.catalogPhoneIdMap.findUnique({
      where: { whatsappSettingsPhoneId: filter.phoneId },
      select: { catalogId: true },
    });
    if (!map) throw new ChannelNotFoundError();
    catalogId = map.catalogId;
  }

  if (!catalogId) return undefined;

  const owned = await prisma.whatsappCatalog.findFirst({
    where: { catalogId, orgId },
    select: { catalogId: true },
  });
  if (!owned) throw new ChannelNotFoundError();
  return catalogId;
}

/** Every commerce query is scoped through catalog.orgId — never a bare catalogId. */
function buildOrderWhere(
  orgId: string,
  filter: CommerceFilter & Partial<CommerceOrdersQuery>,
  catalogId: string | undefined,
): Prisma.WaCatalogOrderWhereInput {
  const where: Prisma.WaCatalogOrderWhereInput = {
    catalog: { orgId },
    ...(catalogId && { catalogId }),
  };

  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from && { gte: filter.from }),
      ...(filter.to && { lt: filter.to }),
    };
  }
  if (filter.status) where.status = filter.status;
  if (filter.orderStage) where.orderStage = filter.orderStage;
  if (filter.paymentStatus) where.paymentStatus = filter.paymentStatus;
  if (filter.storeType) where.storeType = filter.storeType;
  if (filter.search) {
    where.contact = {
      OR: [
        { name: { contains: filter.search, mode: "insensitive" } },
        { phone: { contains: filter.search, mode: "insensitive" } },
      ],
    };
  }
  return where;
}

const orderSelect = {
  id: true,
  catalogId: true,
  products: true,
  paymentMethod: true,
  paymentStatus: true,
  status: true,
  orderStage: true,
  storeType: true,
  transactionId: true,
  createdAt: true,
  deliveryOption: true,
  contact: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.WaCatalogOrderSelect;

interface CommerceChannel {
  catalogId: string;
  phoneId: string | null;
  name: string;
  phoneNumber: string | null;
  storeType: string;
}

/** Channels available to the org — powers the dashboard's channel dropdown. */
export async function getCommerceChannels(orgId: string) {
  const catalogs = await prisma.whatsappCatalog.findMany({
    where: { orgId },
    select: {
      catalogId: true,
      name: true,
      storeType: true,
      connectedWaPhoneIds: {
        select: {
          whatsappSettingsPhoneId: true,
          WhatsappSettings: { select: { phoneId: true, displayPhoneNumber: true } },
        },
      },
    },
  });

  return catalogs.flatMap((catalog): CommerceChannel[] => {
    if (catalog.connectedWaPhoneIds.length === 0) {
      return [
        {
          catalogId: catalog.catalogId,
          phoneId: null,
          name: catalog.name ?? catalog.catalogId,
          phoneNumber: null,
          storeType: catalog.storeType ?? "standard",
        },
      ];
    }
    return catalog.connectedWaPhoneIds.map((link) => ({
      catalogId: catalog.catalogId,
      phoneId: link.whatsappSettingsPhoneId,
      name: catalog.name ?? catalog.catalogId,
      phoneNumber: link.WhatsappSettings?.displayPhoneNumber ?? null,
      storeType: catalog.storeType ?? "standard",
    }));
  });
}

async function sumPeriod(where: Prisma.WaCatalogOrderWhereInput) {
  const orders = await prisma.waCatalogOrder.findMany({
    where,
    select: { products: true, deliveryOption: true, paymentStatus: true },
  });
  const totalSales = orders.reduce(
    (sum, order) => sum + orderTotal(order.products, order.deliveryOption),
    0,
  );
  const paidSales = orders
    .filter((order) => order.paymentStatus?.toUpperCase() === "PAID")
    .reduce((sum, order) => sum + orderTotal(order.products, order.deliveryOption), 0);

  const currencies = new Set<string>();
  for (const order of orders) {
    for (const currency of orderCurrencies(order.products)) currencies.add(currency);
  }

  return {
    totalSales,
    paidSales,
    orderCount: orders.length,
    currencies: [...currencies],
  };
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Headline stats plus period-over-period deltas. The comparison window is the
 * same length as the requested one, immediately preceding it; with no date
 * filter there is no previous window and deltas come back null.
 */
export async function getCommerceOverview(orgId: string, filter: CommerceFilter) {
  const catalogId = await resolveChannelCatalogId(orgId, filter);
  const where = buildOrderWhere(orgId, filter, catalogId);

  const current = await sumPeriod(where);

  let previous: Awaited<ReturnType<typeof sumPeriod>> | null = null;
  if (filter.from && filter.to) {
    const spanMs = dayjs(filter.to).diff(dayjs(filter.from));
    previous = await sumPeriod({
      ...where,
      createdAt: {
        gte: dayjs(filter.from).subtract(spanMs, "millisecond").toDate(),
        lt: filter.from,
      },
    });
  }

  const productsLive = await prisma.waCatalogProduct.count({
    where: { catalog: { orgId }, ...(catalogId && { catalogId }) },
  });

  const avgOrderValue = current.orderCount ? current.totalSales / current.orderCount : 0;
  const prevAov = previous && previous.orderCount ? previous.totalSales / previous.orderCount : 0;

  return {
    totalSales: current.totalSales,
    paidSales: current.paidSales,
    orderCount: current.orderCount,
    avgOrderValue,
    currencies: current.currencies,
    mixedCurrency: current.currencies.length > 1,
    productsLive,
    delta: {
      totalSales: previous ? pctChange(current.totalSales, previous.totalSales) : null,
      orderCount: previous ? pctChange(current.orderCount, previous.orderCount) : null,
      avgOrderValue: previous ? pctChange(avgOrderValue, prevAov) : null,
    },
  };
}

const MAX_BUCKETS = 2000;

/** Sales/orders bucketed over time, with empty buckets filled so charts don't gap. */
export async function getCommerceTimeseries(orgId: string, filter: CommerceTimeseriesQuery) {
  const catalogId = await resolveChannelCatalogId(orgId, filter);
  const orders = await prisma.waCatalogOrder.findMany({
    where: buildOrderWhere(orgId, filter, catalogId),
    select: { createdAt: true, products: true, deliveryOption: true },
    orderBy: { createdAt: "asc" },
  });

  const unit = filter.interval;
  const buckets = new Map<string, { date: string; sales: number; orders: number }>();

  const start = filter.from ?? orders[0]?.createdAt;
  const end = filter.to ?? new Date();
  if (start) {
    let cursor = dayjs.utc(start).startOf(unit);
    const last = dayjs.utc(end);
    for (
      let filled = 0;
      cursor.isValid() && last.isValid() && !cursor.isAfter(last, unit) && filled < MAX_BUCKETS;
      cursor = cursor.add(1, unit), filled++
    ) {
      const key = cursor.format("YYYY-MM-DD");
      buckets.set(key, { date: key, sales: 0, orders: 0 });
    }
  }

  for (const order of orders) {
    const key = dayjs.utc(order.createdAt).startOf(unit).format("YYYY-MM-DD");
    const bucket = buckets.get(key) ?? { date: key, sales: 0, orders: 0 };
    bucket.sales += orderTotal(order.products, order.deliveryOption);
    bucket.orders += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Top sellers by revenue. Line items are denormalized at order time (they carry
 * title and image), so this needs no product-table join.
 */
export async function getCommerceTopProducts(orgId: string, filter: CommerceTopProductsQuery) {
  const catalogId = await resolveChannelCatalogId(orgId, filter);
  const orders = await prisma.waCatalogOrder.findMany({
    where: buildOrderWhere(orgId, filter, catalogId),
    select: { products: true },
  });

  interface ProductTotal {
    retailerId: string;
    name: string;
    image: string | null;
    units: number;
    revenue: number;
  }
  const totals = new Map<string, ProductTotal>();

  for (const order of orders) {
    for (const item of lineItems(order.products)) {
      const retailerId = item?.retailerId;
      if (!retailerId) continue;
      const entry = totals.get(retailerId) ?? {
        retailerId,
        name: item.title ?? retailerId,
        image: item.image ?? null,
        units: 0,
        revenue: 0,
      };
      entry.units += money(item?.quantity);
      entry.revenue += money(item?.price) * money(item?.quantity);
      totals.set(retailerId, entry);
    }
  }

  const top = [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, filter.limit);
  const maxRevenue = top[0]?.revenue || 1;

  return top.map((entry) => ({
    ...entry,
    price: entry.units ? Number((entry.revenue / entry.units).toFixed(2)) : 0,
    // Share of the top seller's revenue — the bar width the overview renders.
    share: Math.round((entry.revenue / maxRevenue) * 100),
  }));
}

export async function getCommerceOrders(orgId: string, filter: CommerceOrdersQuery) {
  const catalogId = await resolveChannelCatalogId(orgId, filter);
  const where = buildOrderWhere(orgId, filter, catalogId);

  const [totalCount, rows] = await Promise.all([
    prisma.waCatalogOrder.count({ where }),
    prisma.waCatalogOrder.findMany({
      where,
      select: orderSelect,
      orderBy: { createdAt: "desc" },
      take: filter.limit,
      skip: filter.page * filter.limit,
    }),
  ]);

  return {
    totalCount,
    data: rows.map((order) => ({
      ...order,
      total: orderTotal(order.products, order.deliveryOption),
      itemCount: orderItemCount(order.products),
      currency: orderCurrency(order.products) ?? null,
    })),
  };
}

/** Unpaginated variant backing the orders export. */
export async function getAllCommerceOrders(
  orgId: string,
  filter: Omit<CommerceOrdersQuery, "page" | "limit">,
) {
  const catalogId = await resolveChannelCatalogId(orgId, filter);
  const rows = await prisma.waCatalogOrder.findMany({
    where: buildOrderWhere(orgId, filter, catalogId),
    select: orderSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((order) => ({
    ...order,
    total: orderTotal(order.products, order.deliveryOption),
    itemCount: orderItemCount(order.products),
    currency: orderCurrency(order.products) ?? null,
  }));
}
