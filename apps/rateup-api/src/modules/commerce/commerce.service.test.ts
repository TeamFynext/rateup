import dayjs from "dayjs";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    waCatalogOrder: { findMany: vi.fn(), count: vi.fn() },
    waCatalogProduct: { count: vi.fn() },
    whatsappCatalog: { findMany: vi.fn(), findFirst: vi.fn() },
    catalogPhoneIdMap: { findUnique: vi.fn() },
  },
}));

// commerce.service.ts imports Prisma only for its where/select types, so this
// factory exists purely to keep the generated client out of the test's graph.
vi.mock("../../../generated/prisma/client.js", () => ({ Prisma: {} }));

import prisma from "../../utils/prisma.js";
import {
  getAllCommerceOrders,
  getCommerceChannels,
  getCommerceOrders,
  getCommerceOverview,
  getCommerceTimeseries,
  getCommerceTopProducts,
  orderCurrency,
  orderItemCount,
  orderTotal,
  resolveChannelCatalogId,
} from "./commerce.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waCatalogOrder: Record<string, Mock>;
  waCatalogProduct: Record<string, Mock>;
  whatsappCatalog: Record<string, Mock>;
  catalogPhoneIdMap: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const CATALOG = "cat-1";

/// `WaCatalogOrder.deliveryOption` is a nullable JSON column holding `{ charge }`;
/// orders without a delivery charge store null.
const NO_DELIVERY_OPTION: { charge: number } | null = null;

/// A line item in the shape catalog.service.ts writes onto WaCatalogOrder.products.
function item(over: Record<string, unknown> = {}) {
  return { retailerId: "sku-1", quantity: 1, price: 100, currency: "INR", title: "Mug", ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.waCatalogOrder.findMany.mockResolvedValue([]);
  db.waCatalogOrder.count.mockResolvedValue(0);
  db.waCatalogProduct.count.mockResolvedValue(0);
  db.whatsappCatalog.findMany.mockResolvedValue([]);
  db.whatsappCatalog.findFirst.mockResolvedValue({ catalogId: CATALOG });
  db.catalogPhoneIdMap.findUnique.mockResolvedValue(null);
});

// ===========================================================================
// The money helpers
// ===========================================================================

describe("orderTotal", () => {
  test("multiplies each line's price by its quantity", () => {
    expect(orderTotal([item({ price: 100, quantity: 2 }), item({ price: 50, quantity: 3 })])).toBe(
      350,
    );
  });

  test("adds the delivery charge on top of the items", () => {
    expect(orderTotal([item({ price: 100, quantity: 1 })], { charge: 40 })).toBe(140);
  });

  test("treats a missing delivery option as free", () => {
    expect(orderTotal([item({ price: 100, quantity: 1 })])).toBe(100);
    expect(orderTotal([item({ price: 100, quantity: 1 })], null)).toBe(100);
    expect(orderTotal([item({ price: 100, quantity: 1 })], {})).toBe(100);
  });

  test("treats a missing price or quantity as zero", () => {
    expect(orderTotal([item({ price: undefined }), item({ quantity: undefined })])).toBe(0);
  });

  test("is zero for an order with no line items", () => {
    expect(orderTotal([])).toBe(0);
  });

  test("tolerates a products column that is not an array", () => {
    expect(orderTotal(null)).toBe(0);
    expect(orderTotal(undefined)).toBe(0);
    expect(orderTotal({ retailerId: "sku-1" })).toBe(0);
  });

  test("still adds delivery to an order whose items are unreadable", () => {
    expect(orderTotal(null, { charge: 40 })).toBe(40);
  });

  // NOTE: pins current behaviour. `products` is a Json[] column with no schema,
  // so a non-numeric price coerces to NaN and poisons every total it is summed
  // into — including the period totals in getCommerceOverview.
  // See issues.txt 19.1.
  test("yields NaN for a line item whose price is not a number", () => {
    expect(orderTotal([item({ price: "1,200" })])).toBeNaN();
  });

  test("accepts a numeric string price, because Number() coerces it", () => {
    expect(orderTotal([item({ price: "100", quantity: "2" })])).toBe(200);
  });
});

describe("orderItemCount", () => {
  test("sums the quantities across the lines", () => {
    expect(orderItemCount([item({ quantity: 2 }), item({ quantity: 3 })])).toBe(5);
  });

  test("counts a line with no quantity as zero", () => {
    expect(orderItemCount([item({ quantity: undefined })])).toBe(0);
  });

  test("is zero for a products column that is not an array", () => {
    expect(orderItemCount(null)).toBe(0);
  });
});

describe("orderCurrency", () => {
  test("reports the first currency it finds", () => {
    expect(orderCurrency([item({ currency: "INR" })])).toBe("INR");
  });

  test("skips lines that carry no currency", () => {
    expect(orderCurrency([item({ currency: undefined }), item({ currency: "USD" })])).toBe("USD");
  });

  test("is undefined when no line carries one", () => {
    expect(orderCurrency([item({ currency: undefined })])).toBeUndefined();
    expect(orderCurrency(null)).toBeUndefined();
  });

  // NOTE: a mixed-currency order silently reports only the first currency, and
  // the totals above it add the amounts together with no conversion.
  // See issues.txt 19.2.
  test("reports one currency for an order that mixes two", () => {
    const products = [item({ currency: "INR", price: 100 }), item({ currency: "USD", price: 100 })];

    expect(orderCurrency(products)).toBe("INR");
    expect(orderTotal(products)).toBe(200);
  });
});

// ===========================================================================
// resolveChannelCatalogId
// ===========================================================================

describe("resolveChannelCatalogId", () => {
  test("means all channels when neither id is given", async () => {
    expect(await resolveChannelCatalogId(ORG, {})).toBeUndefined();
    expect(db.whatsappCatalog.findFirst).not.toHaveBeenCalled();
  });

  test("verifies a caller-supplied catalogId against the org", async () => {
    expect(await resolveChannelCatalogId(ORG, { catalogId: CATALOG })).toBe(CATALOG);
    expect(db.whatsappCatalog.findFirst.mock.calls[0][0].where).toEqual({
      catalogId: CATALOG,
      orgId: ORG,
    });
  });

  test("refuses a catalog that belongs to another org", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue(null);

    await expect(resolveChannelCatalogId(ORG, { catalogId: "cat-other-org" })).rejects.toThrow(
      "Channel not found for this organization",
    );
  });

  test("resolves a phoneId to its catalog and then verifies that", async () => {
    db.catalogPhoneIdMap.findUnique.mockResolvedValue({ catalogId: CATALOG });

    expect(await resolveChannelCatalogId(ORG, { phoneId: "phone-1" })).toBe(CATALOG);
    expect(db.catalogPhoneIdMap.findUnique.mock.calls[0][0].where).toEqual({
      whatsappSettingsPhoneId: "phone-1",
    });
    expect(db.whatsappCatalog.findFirst.mock.calls[0][0].where.orgId).toBe(ORG);
  });

  test("refuses a phoneId whose catalog belongs to another org", async () => {
    db.catalogPhoneIdMap.findUnique.mockResolvedValue({ catalogId: "cat-other-org" });
    db.whatsappCatalog.findFirst.mockResolvedValue(null);

    await expect(resolveChannelCatalogId(ORG, { phoneId: "phone-other-org" })).rejects.toThrow(
      "Channel not found for this organization",
    );
  });

  test("a caller-supplied catalogId wins over the phoneId, skipping the map lookup", async () => {
    await resolveChannelCatalogId(ORG, { catalogId: CATALOG, phoneId: "phone-1" });

    expect(db.catalogPhoneIdMap.findUnique).not.toHaveBeenCalled();
  });

  // NOTE: the two refusals carry different messages, and the controller sends
  // both verbatim with a 400. "No catalog is connected to that channel" means the
  // phoneId is not mapped; "Channel not found for this organization" means it IS
  // mapped, just to someone else's catalog. The pair distinguishes the two.
  // See issues.txt 19.3.
  test("distinguishes an unmapped channel from one owned by another org", async () => {
    db.catalogPhoneIdMap.findUnique.mockResolvedValue(null);
    await expect(resolveChannelCatalogId(ORG, { phoneId: "phone-unmapped" })).rejects.toThrow(
      "No catalog is connected to that channel",
    );

    db.catalogPhoneIdMap.findUnique.mockResolvedValue({ catalogId: "cat-other-org" });
    db.whatsappCatalog.findFirst.mockResolvedValue(null);
    await expect(resolveChannelCatalogId(ORG, { phoneId: "phone-other-org" })).rejects.toThrow(
      "Channel not found for this organization",
    );
  });
});

// ===========================================================================
// getCommerceChannels
// ===========================================================================

describe("getCommerceChannels", () => {
  test("lists only the caller's own catalogs", async () => {
    await getCommerceChannels(ORG);

    expect(db.whatsappCatalog.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  test("returns one entry per connected number", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([
      {
        catalogId: CATALOG,
        name: "Main store",
        storeType: "shopify",
        connectedWaPhoneIds: [
          {
            whatsappSettingsPhoneId: "phone-1",
            WhatsappSettings: { phoneId: "phone-1", displayPhoneNumber: "+91 90000 00001" },
          },
          {
            whatsappSettingsPhoneId: "phone-2",
            WhatsappSettings: { phoneId: "phone-2", displayPhoneNumber: "+91 90000 00002" },
          },
        ],
      },
    ]);

    expect(await getCommerceChannels(ORG)).toEqual([
      {
        catalogId: CATALOG,
        phoneId: "phone-1",
        name: "Main store",
        phoneNumber: "+91 90000 00001",
        storeType: "shopify",
      },
      {
        catalogId: CATALOG,
        phoneId: "phone-2",
        name: "Main store",
        phoneNumber: "+91 90000 00002",
        storeType: "shopify",
      },
    ]);
  });

  test("still lists a catalog that has no number connected", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: CATALOG, name: "Main store", storeType: null, connectedWaPhoneIds: [] },
    ]);

    expect(await getCommerceChannels(ORG)).toEqual([
      {
        catalogId: CATALOG,
        phoneId: null,
        name: "Main store",
        phoneNumber: null,
        storeType: "standard",
      },
    ]);
  });

  test("falls back to the catalog id when the catalog has no name", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: CATALOG, name: null, storeType: null, connectedWaPhoneIds: [] },
    ]);

    expect((await getCommerceChannels(ORG))[0].name).toBe(CATALOG);
  });

  test("tolerates a link whose whatsapp settings row is missing", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([
      {
        catalogId: CATALOG,
        name: "Main store",
        storeType: "standard",
        connectedWaPhoneIds: [{ whatsappSettingsPhoneId: "phone-1", WhatsappSettings: null }],
      },
    ]);

    expect((await getCommerceChannels(ORG))[0].phoneNumber).toBeNull();
  });
});

// ===========================================================================
// The shared where-clause
// ===========================================================================

describe("the order filter", () => {
  /// The where clause the last findMany was issued with.
  function where() {
    return db.waCatalogOrder.findMany.mock.calls.at(-1)![0].where;
  }

  test("always scopes through the catalog's org, never a bare catalogId", async () => {
    await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(where()).toEqual({ catalog: { orgId: ORG } });
  });

  test("adds the resolved catalogId alongside the org scope", async () => {
    await getCommerceTopProducts(ORG, { limit: 5, catalogId: CATALOG } as any);

    expect(where()).toEqual({ catalog: { orgId: ORG }, catalogId: CATALOG });
  });

  test("builds a closed date range from both bounds", async () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-01-31T00:00:00.000Z");

    await getCommerceTopProducts(ORG, { limit: 5, from, to } as any);

    expect(where().createdAt).toEqual({ gte: from, lte: to });
  });

  test("builds a half-open range from one bound", async () => {
    const from = new Date("2026-01-01T00:00:00.000Z");

    await getCommerceTopProducts(ORG, { limit: 5, from } as any);

    expect(where().createdAt).toEqual({ gte: from });
  });

  test("omits createdAt entirely when neither bound is given", async () => {
    await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(where()).not.toHaveProperty("createdAt");
  });

  test.each(["status", "orderStage", "paymentStatus", "storeType"])(
    "passes %s straight through as an equality filter",
    async (key) => {
      await getCommerceOrders(ORG, { page: 0, limit: 20, [key]: "PAID" } as any);

      expect(where()[key]).toBe("PAID");
    },
  );

  test("a search matches the customer's name or phone", async () => {
    await getCommerceOrders(ORG, { page: 0, limit: 20, search: "ann" } as any);

    expect(where().contact).toEqual({
      OR: [
        { name: { contains: "ann", mode: "insensitive" } },
        { phone: { contains: "ann", mode: "insensitive" } },
      ],
    });
  });

  test("filters combine as AND, so each one narrows the result", async () => {
    await getCommerceOrders(ORG, {
      page: 0,
      limit: 20,
      status: "PAID",
      storeType: "shopify",
    } as any);

    expect(where()).toMatchObject({
      catalog: { orgId: ORG },
      status: "PAID",
      storeType: "shopify",
    });
    expect(where()).not.toHaveProperty("OR");
  });
});

// ===========================================================================
// getCommerceOverview
// ===========================================================================

describe("getCommerceOverview", () => {
  const order = (over: Record<string, unknown> = {}) => ({
    products: [item({ price: 100, quantity: 1 })],
    deliveryOption: NO_DELIVERY_OPTION,
    paymentStatus: "PAID",
    ...over,
  });

  test("sums sales, orders and the average across the window", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      order({ products: [item({ price: 100, quantity: 2 })] }),
      order({ products: [item({ price: 50, quantity: 1 })] }),
    ]);

    const res = await getCommerceOverview(ORG, {});

    expect(res.totalSales).toBe(250);
    expect(res.orderCount).toBe(2);
    expect(res.avgOrderValue).toBe(125);
  });

  test("counts only paid orders into paidSales", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      order({ paymentStatus: "PAID" }),
      order({ paymentStatus: "PENDING" }),
    ]);

    const res = await getCommerceOverview(ORG, {});

    expect(res.totalSales).toBe(200);
    expect(res.paidSales).toBe(100);
  });

  test("recognises a paid status regardless of its casing", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([order({ paymentStatus: "paid" })]);

    expect((await getCommerceOverview(ORG, {})).paidSales).toBe(100);
  });

  test("tolerates an order with no payment status at all", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([order({ paymentStatus: null })]);

    expect((await getCommerceOverview(ORG, {})).paidSales).toBe(0);
  });

  test("includes the delivery charge in the sales figure", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([order({ deliveryOption: { charge: 40 } })]);

    expect((await getCommerceOverview(ORG, {})).totalSales).toBe(140);
  });

  test("an average of zero orders is zero, not a division by zero", async () => {
    const res = await getCommerceOverview(ORG, {});

    expect(res.avgOrderValue).toBe(0);
    expect(res.orderCount).toBe(0);
  });

  test("counts the live products in the same scope as the orders", async () => {
    db.waCatalogProduct.count.mockResolvedValue(12);

    const res = await getCommerceOverview(ORG, { catalogId: CATALOG });

    expect(db.waCatalogProduct.count.mock.calls[0][0].where).toEqual({
      catalog: { orgId: ORG },
      catalogId: CATALOG,
    });
    expect(res.productsLive).toBe(12);
  });

  test("has no deltas without a date range, and issues only one order query", async () => {
    const res = await getCommerceOverview(ORG, {});

    expect(res.delta).toEqual({ totalSales: null, orderCount: null, avgOrderValue: null });
    expect(db.waCatalogOrder.findMany).toHaveBeenCalledTimes(1);
  });

  test("has no deltas when only one bound is given", async () => {
    const res = await getCommerceOverview(ORG, { from: new Date("2026-01-01") });

    expect(res.delta.totalSales).toBeNull();
    expect(db.waCatalogOrder.findMany).toHaveBeenCalledTimes(1);
  });

  test("compares against the window of equal length immediately before", async () => {
    const from = new Date("2026-01-11T00:00:00.000Z");
    const to = new Date("2026-01-21T00:00:00.000Z");

    await getCommerceOverview(ORG, { from, to });

    expect(db.waCatalogOrder.findMany.mock.calls[1][0].where.createdAt).toEqual({
      gte: new Date("2026-01-01T00:00:00.000Z"),
      lt: from,
    });
  });

  // NOTE: the current window is inclusive at both ends (gte/lte) while the
  // previous one is half-open (gte/lt), so the comparison window is one instant
  // shorter than the window it is compared against. See issues.txt 19.4.
  test("the two windows are not bounded the same way", async () => {
    const from = new Date("2026-01-11T00:00:00.000Z");
    const to = new Date("2026-01-21T00:00:00.000Z");

    await getCommerceOverview(ORG, { from, to });

    expect(db.waCatalogOrder.findMany.mock.calls[0][0].where.createdAt).toEqual({
      gte: from,
      lte: to,
    });
    expect(db.waCatalogOrder.findMany.mock.calls[1][0].where.createdAt).toHaveProperty("lt");
  });

  test("reports the period-over-period change to one decimal place", async () => {
    db.waCatalogOrder.findMany
      .mockResolvedValueOnce([order({ products: [item({ price: 150, quantity: 1 })] })])
      .mockResolvedValueOnce([order({ products: [item({ price: 100, quantity: 1 })] })]);

    const res = await getCommerceOverview(ORG, {
      from: new Date("2026-01-11"),
      to: new Date("2026-01-21"),
    });

    expect(res.delta.totalSales).toBe(50);
    expect(res.delta.orderCount).toBe(0);
  });

  test("reports a fall as a negative change", async () => {
    db.waCatalogOrder.findMany
      .mockResolvedValueOnce([order({ products: [item({ price: 75, quantity: 1 })] })])
      .mockResolvedValueOnce([order({ products: [item({ price: 100, quantity: 1 })] })]);

    const res = await getCommerceOverview(ORG, {
      from: new Date("2026-01-11"),
      to: new Date("2026-01-21"),
    });

    expect(res.delta.totalSales).toBe(-25);
  });

  // NOTE: pins current behaviour. Growth from an empty previous period is
  // reported as exactly +100%, which reads as "sales doubled" — the same number
  // an actual doubling produces. See issues.txt 19.5.
  test("reports growth from nothing as +100%", async () => {
    db.waCatalogOrder.findMany
      .mockResolvedValueOnce([order({ products: [item({ price: 50000, quantity: 1 })] })])
      .mockResolvedValueOnce([]);

    const res = await getCommerceOverview(ORG, {
      from: new Date("2026-01-11"),
      to: new Date("2026-01-21"),
    });

    expect(res.delta.totalSales).toBe(100);
    expect(res.delta.orderCount).toBe(100);
  });

  test("reports no change at all when both periods are empty", async () => {
    const res = await getCommerceOverview(ORG, {
      from: new Date("2026-01-11"),
      to: new Date("2026-01-21"),
    });

    expect(res.delta).toEqual({ totalSales: null, orderCount: null, avgOrderValue: null });
  });

  // NOTE: every order in the window is materialised in Node and reduced there —
  // twice, once per window — with no take and no database-side aggregation.
  // See issues.txt 19.6.
  test("loads whole orders into memory rather than aggregating in the database", async () => {
    await getCommerceOverview(ORG, {});

    const call = db.waCatalogOrder.findMany.mock.calls[0][0];
    expect(call).not.toHaveProperty("take");
    expect(call.select).toEqual({ products: true, deliveryOption: true, paymentStatus: true });
  });

  test("a single unreadable price poisons the whole period total", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      order({ products: [item({ price: 100 })] }),
      order({ products: [item({ price: "1,200" })] }),
    ]);

    const res = await getCommerceOverview(ORG, {});

    expect(res.totalSales).toBeNaN();
    expect(res.avgOrderValue).toBeNaN();
  });
});

// ===========================================================================
// getCommerceTimeseries
// ===========================================================================

describe("getCommerceTimeseries", () => {
  // Bucketing goes through dayjs's LOCAL startOf/format (see the timezone test at
  // the end of this block), so the fixtures below are built from local-time
  // components. That keeps these assertions true whatever TZ the suite runs in.
  const localDay = (day: number, hour = 12) => new Date(2026, 0, day, hour);
  const at = (day: number, price = 100, hour = 12) => ({
    createdAt: localDay(day, hour),
    products: [item({ price, quantity: 1 })],
    deliveryOption: NO_DELIVERY_OPTION,
  });

  test("returns nothing when there are no orders and no window", async () => {
    expect(await getCommerceTimeseries(ORG, { interval: "day" } as any)).toEqual([]);
  });

  test("fills every day of the requested window, including the empty ones", async () => {
    const res = await getCommerceTimeseries(ORG, {
      interval: "day",
      from: localDay(1),
      to: localDay(4),
    } as any);

    expect(res.map((b) => b.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(res.every((b) => b.sales === 0 && b.orders === 0)).toBe(true);
  });

  test("puts each order into its own day bucket", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([at(1, 100, 8), at(1, 50, 20), at(3, 25, 8)]);

    const res = await getCommerceTimeseries(ORG, {
      interval: "day",
      from: localDay(1),
      to: localDay(3),
    } as any);

    expect(res).toEqual([
      { date: "2026-01-01", sales: 150, orders: 2 },
      { date: "2026-01-02", sales: 0, orders: 0 },
      { date: "2026-01-03", sales: 25, orders: 1 },
    ]);
  });

  test("collapses a month of orders into one bucket at the month interval", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([at(5, 100), at(25, 100)]);

    const res = await getCommerceTimeseries(ORG, {
      interval: "month",
      from: localDay(1),
      to: localDay(31),
    } as any);

    expect(res).toEqual([{ date: "2026-01-01", sales: 200, orders: 2 }]);
  });

  test("labels a week bucket with the day the week starts on", async () => {
    const res = await getCommerceTimeseries(ORG, {
      interval: "week",
      from: localDay(5),
      to: localDay(18),
    } as any);

    expect(res).toHaveLength(3);
    expect(new Set(res.map((b) => b.date)).size).toBe(3);
  });

  test("starts the range at the earliest order when no from is given", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([at(1)]);

    const res = await getCommerceTimeseries(ORG, { interval: "day", to: localDay(2) } as any);

    expect(res.map((b) => b.date)).toEqual(["2026-01-01", "2026-01-02"]);
  });

  // NOTE: pins current behaviour. Both the bucket boundary (`startOf(unit)`) and
  // the label (`format("YYYY-MM-DD")`) are computed in the SERVER's timezone,
  // while the from/to bounds are compared by postgres against a UTC timestamp
  // column. An order placed at 23:30 UTC therefore lands in the NEXT day's bucket
  // on any server east of UTC+00:30 — the same rows chart differently depending
  // on where the process runs, and neither the org's timezone nor UTC is used.
  // See issues.txt 19.9.
  test("buckets by the server's local day rather than by UTC", async () => {
    const createdAt = new Date("2026-01-23T23:30:00.000Z");
    db.waCatalogOrder.findMany.mockResolvedValue([
      { createdAt, products: [item({ price: 100, quantity: 1 })], deliveryOption: null },
    ]);

    const res = await getCommerceTimeseries(ORG, { interval: "day" } as any);

    // The label follows the local clock, not createdAt's UTC date ("2026-01-23").
    expect(res[0].date).toBe(dayjs(createdAt).startOf("day").format("YYYY-MM-DD"));
    expect(res[0].date).toBe(dayjs(createdAt).format("YYYY-MM-DD"));
  });

  test("reads the orders oldest-first so the earliest one anchors the range", async () => {
    await getCommerceTimeseries(ORG, { interval: "day" } as any);

    expect(db.waCatalogOrder.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "asc" });
  });

  test("returns the buckets in date order", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([at(3), at(1)]);

    const res = await getCommerceTimeseries(ORG, { interval: "day" } as any);

    const dates = res.map((b) => b.date);
    expect(dates).toEqual(dates.slice().sort());
  });

  test("includes the delivery charge in each bucket's sales", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      { ...at(1, 100), deliveryOption: { charge: 40 } },
    ]);

    const res = await getCommerceTimeseries(ORG, {
      interval: "day",
      from: localDay(1),
      to: localDay(1),
    } as any);

    expect(res[0].sales).toBe(140);
  });

  // NOTE: pins current behaviour. The fill loop steps one interval at a time from
  // `from` to `to`, both taken straight off the querystring with no span limit.
  // A single request can therefore ask the handler to build tens of thousands of
  // buckets. See issues.txt 19.7.
  test("builds one bucket per day across an arbitrarily long requested window", async () => {
    const res = await getCommerceTimeseries(ORG, {
      interval: "day",
      from: new Date(1990, 0, 1),
      to: new Date(2026, 0, 1),
    } as any);

    expect(res.length).toBeGreaterThan(13000);
  });

  // NOTE: the fill loop's only exit is `cursor.isAfter(dayjs(end), unit)`, and an
  // invalid dayjs never reports itself as after anything — so an unparseable
  // bound would spin forever. That is unreachable through the route today only
  // because z.coerce.date() rejects unparseable input at the boundary; the loop
  // itself has neither a validity guard nor an iteration cap. Asserted against
  // dayjs directly rather than by calling the function, which would hang.
  // See issues.txt 19.7.
  test("the fill loop's exit condition is never met by an invalid date", () => {
    const invalid = dayjs(new Date("not a date"));

    expect(invalid.isValid()).toBe(false);
    expect(invalid.isAfter(dayjs("2026-01-01"), "day")).toBe(false);
    expect(invalid.add(1, "day").isAfter(dayjs("2026-01-01"), "day")).toBe(false);
  });
});

// ===========================================================================
// getCommerceTopProducts
// ===========================================================================

describe("getCommerceTopProducts", () => {
  test("groups line items by retailer id and totals their revenue", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      { products: [item({ retailerId: "sku-1", price: 100, quantity: 2 })] },
      { products: [item({ retailerId: "sku-1", price: 100, quantity: 1 })] },
    ]);

    const res = await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(res).toEqual([
      {
        retailerId: "sku-1",
        name: "Mug",
        image: null,
        price: 100,
        units: 3,
        revenue: 300,
        share: 100,
      },
    ]);
  });

  test("orders by revenue, highest first", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      {
        products: [
          item({ retailerId: "sku-low", price: 10, quantity: 1 }),
          item({ retailerId: "sku-high", price: 500, quantity: 1 }),
        ],
      },
    ]);

    const res = await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(res.map((p) => p.retailerId)).toEqual(["sku-high", "sku-low"]);
  });

  test("keeps only as many products as the limit allows", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      {
        products: [
          item({ retailerId: "a", price: 300 }),
          item({ retailerId: "b", price: 200 }),
          item({ retailerId: "c", price: 100 }),
        ],
      },
    ]);

    expect(await getCommerceTopProducts(ORG, { limit: 2 } as any)).toHaveLength(2);
  });

  test("expresses each product's share against the top seller", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      {
        products: [
          item({ retailerId: "a", price: 400, quantity: 1 }),
          item({ retailerId: "b", price: 100, quantity: 1 }),
        ],
      },
    ]);

    expect((await getCommerceTopProducts(ORG, { limit: 5 } as any)).map((p) => p.share)).toEqual([
      100, 25,
    ]);
  });

  test("skips line items that carry no retailer id", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      { products: [item({ retailerId: undefined }), item({ retailerId: "sku-1" })] },
    ]);

    const res = await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(res).toHaveLength(1);
    expect(res[0].retailerId).toBe("sku-1");
  });

  test("falls back to the retailer id when the line carries no title", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      { products: [item({ retailerId: "sku-1", title: undefined })] },
    ]);

    expect((await getCommerceTopProducts(ORG, { limit: 5 } as any))[0].name).toBe("sku-1");
  });

  test("returns nothing for a period with no orders", async () => {
    expect(await getCommerceTopProducts(ORG, { limit: 5 } as any)).toEqual([]);
  });

  test("does not divide by zero when nothing sold for money", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      { products: [item({ retailerId: "free", price: 0, quantity: 3 })] },
    ]);

    expect((await getCommerceTopProducts(ORG, { limit: 5 } as any))[0].share).toBe(0);
  });

  // NOTE: name, image and price are captured from whichever line item is seen
  // first and never revisited, while units and revenue keep accumulating. A
  // product whose price changed reports its old unit price beside a revenue
  // figure computed from both prices. See issues.txt 19.8.
  test("reports the first price it saw even after the price changed", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      { products: [item({ retailerId: "sku-1", price: 100, quantity: 1, title: "Mug" })] },
      { products: [item({ retailerId: "sku-1", price: 250, quantity: 1, title: "Mug (new)" })] },
    ]);

    const [product] = await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(product.price).toBe(100);
    expect(product.name).toBe("Mug");
    expect(product.revenue).toBe(350);
  });

  test("only ever reads the caller's own orders", async () => {
    await getCommerceTopProducts(ORG, { limit: 5 } as any);

    expect(db.waCatalogOrder.findMany.mock.calls[0][0].where.catalog).toEqual({ orgId: ORG });
  });
});

// ===========================================================================
// getCommerceOrders / getAllCommerceOrders
// ===========================================================================

describe("getCommerceOrders", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: "o1",
    catalogId: CATALOG,
    products: [item({ price: 100, quantity: 2, currency: "INR" })],
    deliveryOption: { charge: 40 },
    contact: { id: "c1", name: "Ann", phone: "919000000001" },
    ...over,
  });

  test("counts and lists with the same where clause", async () => {
    await getCommerceOrders(ORG, { page: 0, limit: 20, status: "PAID" } as any);

    expect(db.waCatalogOrder.count.mock.calls[0][0].where).toEqual(
      db.waCatalogOrder.findMany.mock.calls[0][0].where,
    );
  });

  test("returns newest orders first", async () => {
    await getCommerceOrders(ORG, { page: 0, limit: 20 } as any);

    expect(db.waCatalogOrder.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  test("pages with a zero-based page number", async () => {
    await getCommerceOrders(ORG, { page: 2, limit: 25 } as any);

    expect(db.waCatalogOrder.findMany.mock.calls[0][0]).toMatchObject({ take: 25, skip: 50 });
  });

  test("decorates every row with its total, item count and currency", async () => {
    db.waCatalogOrder.count.mockResolvedValue(1);
    db.waCatalogOrder.findMany.mockResolvedValue([row()]);

    const res = await getCommerceOrders(ORG, { page: 0, limit: 20 } as any);

    expect(res.totalCount).toBe(1);
    expect(res.data[0]).toMatchObject({ id: "o1", total: 240, itemCount: 2, currency: "INR" });
  });

  test("reports a null currency when no line item declares one", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      row({ products: [item({ currency: undefined })] }),
    ]);

    expect(
      (await getCommerceOrders(ORG, { page: 0, limit: 20 } as any)).data[0].currency,
    ).toBeNull();
  });

  test("keeps the customer on each row", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([row()]);

    const res = await getCommerceOrders(ORG, { page: 0, limit: 20 } as any);

    expect(res.data[0].contact).toEqual({ id: "c1", name: "Ann", phone: "919000000001" });
  });

  test("answers an empty page rather than failing", async () => {
    expect(await getCommerceOrders(ORG, { page: 99, limit: 20 } as any)).toEqual({
      totalCount: 0,
      data: [],
    });
  });
});

describe("getAllCommerceOrders", () => {
  test("uses the same filter and decoration as the paginated variant", async () => {
    db.waCatalogOrder.findMany.mockResolvedValue([
      {
        id: "o1",
        catalogId: CATALOG,
        products: [item({ price: 100, quantity: 2 })],
        deliveryOption: NO_DELIVERY_OPTION,
        contact: { id: "c1", name: "Ann", phone: "919000000001" },
      },
    ]);

    const res = await getAllCommerceOrders(ORG, { status: "PAID" } as any);

    expect(db.waCatalogOrder.findMany.mock.calls[0][0].where).toMatchObject({
      catalog: { orgId: ORG },
      status: "PAID",
    });
    expect(res[0]).toMatchObject({ total: 200, itemCount: 2, currency: "INR" });
  });

  // NOTE: the export path has no take at all, so it materialises every matching
  // order — and the filters are optional, so the default is the org's entire
  // order history. See issues.txt 19.6.
  test("reads every matching order with no limit", async () => {
    await getAllCommerceOrders(ORG, {} as any);

    const call = db.waCatalogOrder.findMany.mock.calls[0][0];
    expect(call).not.toHaveProperty("take");
    expect(call).not.toHaveProperty("skip");
  });

  test("still verifies the requested channel against the org", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue(null);

    await expect(getAllCommerceOrders(ORG, { catalogId: "cat-other-org" } as any)).rejects.toThrow(
      "Channel not found for this organization",
    );
    expect(db.waCatalogOrder.findMany).not.toHaveBeenCalled();
  });
});
