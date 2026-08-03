import dayjs from "dayjs";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("hucre", () => ({ write: vi.fn() }));

vi.mock("./commerce.service.js", () => ({
  getAllCommerceOrders: vi.fn(),
  getCommerceChannels: vi.fn(),
  getCommerceOrders: vi.fn(),
  getCommerceOverview: vi.fn(),
  getCommerceTimeseries: vi.fn(),
  getCommerceTopProducts: vi.fn(),
}));

import { write } from "hucre";
import { log } from "../../utils/logger.js";
import {
  getAllCommerceOrders,
  getCommerceChannels,
  getCommerceOrders,
  getCommerceOverview,
  getCommerceTimeseries,
  getCommerceTopProducts,
} from "./commerce.service.js";
import {
  exportCommerceOrdersHandler,
  exportCommerceOverviewHandler,
  getCommerceChannelsHandler,
  getCommerceOrdersHandler,
  getCommerceOverviewHandler,
  getCommerceTimeseriesHandler,
  getCommerceTopProductsHandler,
} from "./commerce.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    send: vi.fn(() => rep),
    header: vi.fn(() => rep),
  };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, query: {}, body: {}, ...over };
}

/// The status code and body of the reply, whether it went through .code() or not.
function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

const OVERVIEW: {
  totalSales: number;
  paidSales: number;
  orderCount: number;
  avgOrderValue: number;
  productsLive: number;
  delta: { totalSales: number; orderCount: number; avgOrderValue: number | null };
} = {
  totalSales: 1000,
  paidSales: 800,
  orderCount: 4,
  avgOrderValue: 250,
  productsLive: 12,
  delta: { totalSales: 25, orderCount: 10, avgOrderValue: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  (write as Mock).mockResolvedValue(Buffer.from("sheet"));
  (getCommerceOverview as Mock).mockResolvedValue(OVERVIEW);
  (getCommerceTimeseries as Mock).mockResolvedValue([]);
  (getCommerceTopProducts as Mock).mockResolvedValue([]);
  (getAllCommerceOrders as Mock).mockResolvedValue([]);
});

// ===========================================================================
// The read handlers
// ===========================================================================

describe("the read handlers", () => {
  test("channels are listed for the caller's org", async () => {
    (getCommerceChannels as Mock).mockResolvedValue([{ catalogId: "cat-1" }]);
    const rep = reply();

    await getCommerceChannelsHandler(request(), rep);

    expect(getCommerceChannels).toHaveBeenCalledWith(ORG);
    expect(rep.send).toHaveBeenCalledWith([{ catalogId: "cat-1" }]);
  });

  test("the overview passes the querystring through untouched", async () => {
    const query = { from: new Date("2026-01-01"), catalogId: "cat-1" };

    await getCommerceOverviewHandler(request({ query }), reply());

    expect(getCommerceOverview).toHaveBeenCalledWith(ORG, query);
  });

  test("the timeseries passes the querystring through untouched", async () => {
    const query = { interval: "week" };

    await getCommerceTimeseriesHandler(request({ query }), reply());

    expect(getCommerceTimeseries).toHaveBeenCalledWith(ORG, query);
  });

  test("top products passes the querystring through untouched", async () => {
    const query = { limit: 10 };

    await getCommerceTopProductsHandler(request({ query }), reply());

    expect(getCommerceTopProducts).toHaveBeenCalledWith(ORG, query);
  });

  test("orders passes the querystring through untouched", async () => {
    const query = { page: 1, limit: 20, status: "PAID" };
    (getCommerceOrders as Mock).mockResolvedValue({ totalCount: 0, data: [] });

    await getCommerceOrdersHandler(request({ query }), reply());

    expect(getCommerceOrders).toHaveBeenCalledWith(ORG, query);
  });

  test("every read handler takes the org from the session, never the query", async () => {
    (getCommerceOrders as Mock).mockResolvedValue({ totalCount: 0, data: [] });

    await getCommerceOrdersHandler(
      request({ query: { orgId: "org-someone-else", page: 0, limit: 20 } }),
      reply(),
    );

    expect((getCommerceOrders as Mock).mock.calls[0][0]).toBe(ORG);
  });
});

// ===========================================================================
// sendError
// ===========================================================================

describe("error handling", () => {
  test("an unknown channel is a 400 carrying the reason", async () => {
    (getCommerceOverview as Mock).mockRejectedValue(
      new Error("Channel not found for this organization"),
    );
    const rep = reply();

    await getCommerceOverviewHandler(request(), rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { error: "Channel not found for this organization" },
    });
  });

  test("an unmapped channel is also a 400", async () => {
    (getCommerceTimeseries as Mock).mockRejectedValue(
      new Error("No catalog is connected to that channel"),
    );
    const rep = reply();

    await getCommerceTimeseriesHandler(request(), rep);

    expect(answer(rep).code).toBe(400);
  });

  test("anything else is a 500 with a generic message", async () => {
    (getCommerceOverview as Mock).mockRejectedValue(new Error("connection terminated"));
    const rep = reply();

    await getCommerceOverviewHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });

  test("every failure is logged with its context", async () => {
    (getCommerceTopProducts as Mock).mockRejectedValue(new Error("boom"));

    await getCommerceTopProductsHandler(request(), reply());

    expect((log.error as Mock).mock.calls[0][1]).toBe("Failed to load top products");
  });

  test("a thrown non-Error is a 500", async () => {
    (getCommerceOrders as Mock).mockRejectedValue("just a string");
    const rep = reply();

    await getCommerceOrdersHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });

  // NOTE: pins current behaviour. The 400-vs-500 decision is a substring match on
  // the error's own message, so any internal failure whose text happens to
  // contain "catalog" — which prisma validation errors naming the catalogId
  // column do — is reported to the client as a 400 with the raw message.
  // See issues.txt 19.10.
  test("a prisma error naming catalogId is answered as a 400 with the raw text", async () => {
    (getCommerceOrders as Mock).mockRejectedValue(
      new Error("Invalid `prisma.waCatalogOrder.count()` invocation: Unknown argument `catalogId`"),
    );
    const rep = reply();

    await getCommerceOrdersHandler(request(), rep);

    expect(answer(rep).code).toBe(400);
    expect(answer(rep).body.error).toContain("prisma.waCatalogOrder.count()");
  });

  test("the same misclassification applies to the export handlers", async () => {
    (getAllCommerceOrders as Mock).mockRejectedValue(
      new Error("connection to catalog database lost"),
    );
    const rep = reply();

    await exportCommerceOrdersHandler(request({ body: { format: "xlsx" } }), rep);

    expect(answer(rep).code).toBe(400);
  });
});

// ===========================================================================
// exportCommerceOrdersHandler
// ===========================================================================

describe("exportCommerceOrdersHandler", () => {
  const order = (over: Record<string, unknown> = {}) => ({
    id: "o1",
    catalogId: "cat-1",
    createdAt: new Date(2026, 0, 15, 9, 30),
    contact: { id: "c1", name: "Ann", phone: "919000000001" },
    itemCount: 3,
    total: 1240,
    currency: "INR",
    paymentMethod: "UPI",
    paymentStatus: "PAID",
    status: "CONFIRMED",
    orderStage: "SHIPPED",
    storeType: "standard",
    transactionId: "txn-1",
    ...over,
  });

  test("passes the body's filters through without the format", async () => {
    await exportCommerceOrdersHandler(
      request({ body: { format: "ods", status: "PAID", catalogId: "cat-1" } }),
      reply(),
    );

    expect(getAllCommerceOrders).toHaveBeenCalledWith(ORG, { status: "PAID", catalogId: "cat-1" });
  });

  test("writes one row per order across the declared columns", async () => {
    (getAllCommerceOrders as Mock).mockResolvedValue([order()]);

    await exportCommerceOrdersHandler(request({ body: { format: "xlsx" } }), reply());

    const sheet = (write as Mock).mock.calls[0][0].sheets[0];
    expect(sheet.name).toBe("Orders");
    expect(sheet.data).toEqual([
      {
        id: "o1",
        date: "2026-01-15 09:30",
        customer: "Ann",
        phone: "919000000001",
        items: 3,
        total: 1240,
        currency: "INR",
        paymentMethod: "UPI",
        paymentStatus: "PAID",
        status: "CONFIRMED",
        orderStage: "SHIPPED",
        storeType: "standard",
        transactionId: "txn-1",
        catalogId: "cat-1",
      },
    ]);
  });

  test("every column has a key that the row data actually carries", async () => {
    (getAllCommerceOrders as Mock).mockResolvedValue([order()]);

    await exportCommerceOrdersHandler(request({ body: { format: "xlsx" } }), reply());

    const sheet = (write as Mock).mock.calls[0][0].sheets[0];
    for (const column of sheet.columns) {
      expect(sheet.data[0]).toHaveProperty(column.key);
    }
  });

  test("blanks out every optional field rather than writing null", async () => {
    (getAllCommerceOrders as Mock).mockResolvedValue([
      order({
        contact: null,
        currency: null,
        paymentMethod: null,
        paymentStatus: null,
        status: null,
        orderStage: null,
        storeType: null,
        transactionId: null,
      }),
    ]);

    await exportCommerceOrdersHandler(request({ body: { format: "xlsx" } }), reply());

    const row = (write as Mock).mock.calls[0][0].sheets[0].data[0];
    expect(row).toMatchObject({
      customer: "",
      phone: "",
      currency: "",
      paymentMethod: "",
      status: "",
      transactionId: "",
    });
  });

  test("writes an empty sheet rather than failing when nothing matched", async () => {
    const rep = reply();

    await exportCommerceOrdersHandler(request({ body: { format: "xlsx" } }), rep);

    expect((write as Mock).mock.calls[0][0].sheets[0].data).toEqual([]);
    expect(rep.send).toHaveBeenCalled();
  });

  test("sends the workbook with the format's content type and a dated filename", async () => {
    const rep = reply();

    await exportCommerceOrdersHandler(request({ body: { format: "ods" } }), rep);

    expect((write as Mock).mock.calls[0][0].format).toBe("ods");
    expect(rep.header.mock.calls[0]).toEqual([
      "Content-Type",
      "application/vnd.oasis.opendocument.spreadsheet",
    ]);
    expect(rep.header.mock.calls[1][1]).toBe(
      `attachment; filename="commerce_orders_${dayjs().format("YYYY-MM-DD")}.ods"`,
    );
    expect(rep.send.mock.calls[0][0]).toBeInstanceOf(Buffer);
  });
});

// ===========================================================================
// exportCommerceOverviewHandler
// ===========================================================================

describe("exportCommerceOverviewHandler", () => {
  test("builds all three widgets from the same filter", async () => {
    const from = new Date("2026-01-01");

    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "week", from, catalogId: "cat-1" } }),
      reply(),
    );

    expect(getCommerceOverview).toHaveBeenCalledWith(ORG, { from, catalogId: "cat-1" });
    expect(getCommerceTimeseries).toHaveBeenCalledWith(ORG, {
      from,
      catalogId: "cat-1",
      interval: "week",
    });
  });

  // NOTE: the schema comment says exports "reuse the page's own filters so the
  // file matches what's on screen", but the top-products count is hard-coded to
  // 20 here while the widget defaults to 5 and accepts up to 50. The exported
  // sheet never matches the chart. See issues.txt 19.11.
  test("hard-codes twenty top products regardless of what the page shows", async () => {
    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day", limit: 5 } }),
      reply(),
    );

    expect((getCommerceTopProducts as Mock).mock.calls[0][1].limit).toBe(20);
  });

  test("writes one workbook with the three named sheets", async () => {
    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      reply(),
    );

    expect((write as Mock).mock.calls[0][0].sheets.map((s: any) => s.name)).toEqual([
      "Summary",
      "Sales over time",
      "Top products",
    ]);
  });

  test("lays the summary out as one row per headline metric", async () => {
    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      reply(),
    );

    const summary = (write as Mock).mock.calls[0][0].sheets[0];
    expect(summary.data.map((r: any) => r.metric)).toEqual([
      "Total sales",
      "Paid sales",
      "Orders",
      "Average order value",
      "Products live",
    ]);
    expect(summary.data[0]).toEqual({ metric: "Total sales", value: 1000, delta: 25 });
  });

  test("blanks a delta that could not be computed", async () => {
    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      reply(),
    );

    const summary = (write as Mock).mock.calls[0][0].sheets[0];
    // avgOrderValue's delta is null in the fixture; paid sales has no delta at all.
    expect(summary.data[3].delta).toBe("");
    expect(summary.data[1].delta).toBe("");
  });

  // NOTE: pins current behaviour. A delta of exactly 0 — no change at all — is
  // falsy, so `?? ""` keeps it but the sibling `|| ""` idiom elsewhere would not.
  // Recorded because the two blank-outs above rely on `??` specifically.
  test("keeps a zero delta rather than blanking it", async () => {
    (getCommerceOverview as Mock).mockResolvedValue({
      ...OVERVIEW,
      delta: { totalSales: 0, orderCount: 0, avgOrderValue: 0 },
    });

    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      reply(),
    );

    expect((write as Mock).mock.calls[0][0].sheets[0].data[0].delta).toBe(0);
  });

  test("writes the timeseries buckets straight into the second sheet", async () => {
    (getCommerceTimeseries as Mock).mockResolvedValue([
      { date: "2026-01-01", sales: 100, orders: 1 },
    ]);

    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      reply(),
    );

    expect((write as Mock).mock.calls[0][0].sheets[1].data).toEqual([
      { date: "2026-01-01", sales: 100, orders: 1 },
    ]);
  });

  test("drops the image and share columns from the top-products sheet", async () => {
    (getCommerceTopProducts as Mock).mockResolvedValue([
      {
        retailerId: "sku-1",
        name: "Mug",
        image: "https://example.test/mug.png",
        price: 100,
        units: 3,
        revenue: 300,
        share: 100,
      },
    ]);

    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      reply(),
    );

    expect((write as Mock).mock.calls[0][0].sheets[2].data).toEqual([
      { name: "Mug", retailerId: "sku-1", units: 3, revenue: 300 },
    ]);
  });

  test("sends the workbook with a dated overview filename", async () => {
    const rep = reply();

    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      rep,
    );

    expect(rep.header.mock.calls[1][1]).toBe(
      `attachment; filename="commerce_overview_${dayjs().format("YYYY-MM-DD")}.xlsx"`,
    );
  });

  test("reports a failure in any of the three widgets", async () => {
    (getCommerceTopProducts as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await exportCommerceOverviewHandler(
      request({ body: { format: "xlsx", interval: "day" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
    expect(write).not.toHaveBeenCalled();
  });
});
