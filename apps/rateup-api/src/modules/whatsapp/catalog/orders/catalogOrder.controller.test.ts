import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./catalogOrder.service.js", () => ({ getWaCatalogOrders: vi.fn() }));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { getWaCatalogOrders } from "./catalogOrder.service.js";
import { log } from "../../../../utils/logger.js";
import { orderPaginateSchema } from "./catalogOrder.schema.js";
import { getWaCatalogOrdersHandler } from "./catalogOrder.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const getOrdersMock = getWaCatalogOrders as unknown as Mock;

const RESULT = { data: [{ id: "order-1" }], totalCount: 1 };

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: { catalogId: "cat-1" },
    query: {},
    body: {},
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  getOrdersMock.mockResolvedValue(RESULT);
});

describe("getWaCatalogOrdersHandler", () => {
  test("returns the catalog's orders", async () => {
    const reply = makeReply();

    await getWaCatalogOrdersHandler(makeRequest({ query: { page: 0, limit: 50 } }), reply);

    expect(getOrdersMock).toHaveBeenCalledWith("cat-1", "org-1", {
      page: 0,
      limit: 50,
      storeType: undefined,
    });
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual(RESULT);
  });

  test("passes the requested page, size and store type through", async () => {
    await getWaCatalogOrdersHandler(
      makeRequest({ query: { page: 2, limit: 25, storeType: "SHOPIFY" } }),
      makeReply(),
    );

    expect(getOrdersMock).toHaveBeenCalledWith("cat-1", "org-1", {
      page: 2,
      limit: 25,
      storeType: "SHOPIFY",
    });
  });

  test("defaults the page size to fifty", async () => {
    await getWaCatalogOrdersHandler(makeRequest({ query: { page: 0 } }), makeReply());

    expect(getOrdersMock.mock.calls[0][2].limit).toBe(50);
  });

  // Paging is zero-based throughout: the service does skip = page * limit, and the
  // dashboard's pager holds pageIndex from 0 (rendering it as "Page {pageIndex + 1}").
  // The default used to be 1, which the service turned into skip: 50 — so a caller
  // meaning "the first page" was silently shown records 51-100.
  test("defaults to the first page, which is page zero", async () => {
    await getWaCatalogOrdersHandler(makeRequest({ query: {} }), makeReply());

    expect(getOrdersMock.mock.calls[0][2]).toMatchObject({ page: 0, limit: 50 });
  });

  test("honours an explicit page of zero rather than defaulting it away", async () => {
    await getWaCatalogOrdersHandler(makeRequest({ query: { page: 0 } }), makeReply());

    expect(getOrdersMock.mock.calls[0][2].page).toBe(0);
  });

  // The caller's own org is passed to the service, which filters on it, so a guessed
  // catalog id cannot reach another org's orders or the customer names and phone
  // numbers attached to them.
  test("scopes the lookup to the caller's org, not the catalog id in the path", async () => {
    await getWaCatalogOrdersHandler(
      makeRequest({
        params: { catalogId: "cat-victim" },
        query: {},
        user: { orgId: "org-attacker", userId: "user-1" },
      }),
      makeReply(),
    );

    expect(getOrdersMock.mock.calls[0][0]).toBe("cat-victim");
    expect(getOrdersMock.mock.calls[0][1]).toBe("org-attacker");
  });

  test("returns 500 and logs when the lookup fails", async () => {
    getOrdersMock.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getWaCatalogOrdersHandler(makeRequest({ query: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

// The route validates the query string with this schema before the handler runs, so
// what it coerces decides what the handler's defaults ever see.
describe("orderPaginateSchema", () => {
  test("turns the query string's numbers into real numbers", () => {
    const parsed = orderPaginateSchema.parse({ page: "2", limit: "25" });

    expect(parsed).toEqual({ page: 2, limit: 25 });
  });

  test("keeps an optional store type when given", () => {
    expect(orderPaginateSchema.parse({ page: "0", limit: "10", storeType: "NATIVE" })).toEqual({
      page: 0,
      limit: 10,
      storeType: "NATIVE",
    });
  });

  test("accepts a request with no store type", () => {
    expect(orderPaginateSchema.parse({ page: "0", limit: "10" }).storeType).toBeUndefined();
  });

  // NOTE: page and limit are required by the schema, so the handler's `page = 1` and
  // `limit = 50` defaults can only apply if the schema is bypassed — on the real
  // route a request omitting them is rejected before the handler is reached.
  test.each([
    ["page", { limit: "10" }],
    ["limit", { page: "0" }],
    ["both", {}],
  ])("rejects a query missing %s", (_name, query) => {
    expect(() => orderPaginateSchema.parse(query)).toThrow();
  });

  test("rejects a page that is not a number", () => {
    expect(() => orderPaginateSchema.parse({ page: "abc", limit: "10" })).toThrow();
  });

  // Coercion used to be permissive enough to accept values that are not sensible page
  // numbers: a negative page becomes a negative skip, which Prisma rejects at query
  // time, and a fractional one is meaningless.
  test.each([
    ["a negative page", { page: "-1", limit: "10" }],
    ["a fractional page", { page: "1.5", limit: "10" }],
    ["a zero limit", { page: "0", limit: "0" }],
    ["a negative limit", { page: "0", limit: "-10" }],
    ["a fractional limit", { page: "0", limit: "10.5" }],
  ])("rejects %s", (_name, query) => {
    expect(() => orderPaginateSchema.parse(query)).toThrow();
  });

  test("still accepts page zero, which is the first page", () => {
    expect(orderPaginateSchema.parse({ page: "0", limit: "10" }).page).toBe(0);
  });
});
