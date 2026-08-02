import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    waCatalogOrder: { count: vi.fn(), findMany: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

import prisma from "../../../../utils/prisma.js";
import { getWaCatalogOrders } from "./catalogOrder.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (prisma as unknown as { waCatalogOrder: { count: Mock; findMany: Mock } })
  .waCatalogOrder;

const ORDER = {
  id: "order-1",
  catalogId: "cat-1",
  contact: { name: "Ada", phone: "15550001" },
};

const CATALOG_ID = "cat-1";
const ORG_ID = "org-1";

/** The paging shape the controller hands the service. */
function filter(overrides: Record<string, unknown> = {}) {
  return { page: 0, limit: 50, ...overrides } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.count.mockResolvedValue(1);
  db.findMany.mockResolvedValue([ORDER]);
});

describe("getWaCatalogOrders - what it returns", () => {
  test("returns the page of orders alongside the total that matched", async () => {
    db.count.mockResolvedValue(137);

    const result = await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter());

    expect(result).toEqual({ data: [ORDER], totalCount: 137 });
  });

  test("attaches the ordering customer's name and number to each order", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter());

    expect(db.findMany.mock.calls[0][0].include).toEqual({
      contact: { select: { name: true, phone: true } },
    });
  });

  test("lists the newest orders first", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter());

    expect(db.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  test("reports an empty page and a zero total for a catalog with no orders", async () => {
    db.count.mockResolvedValue(0);
    db.findMany.mockResolvedValue([]);

    await expect(getWaCatalogOrders(CATALOG_ID, ORG_ID, filter())).resolves.toEqual({
      data: [],
      totalCount: 0,
    });
  });
});

describe("getWaCatalogOrders - filtering", () => {
  test("narrows to the catalog asked for", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter());

    expect(db.findMany.mock.calls[0][0].where).toEqual({
      catalogId: CATALOG_ID,
      catalog: { orgId: ORG_ID },
    });
  });

  test("narrows to a store type when one is named", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ storeType: "SHOPIFY" }));

    expect(db.findMany.mock.calls[0][0].where).toEqual({
      catalogId: CATALOG_ID,
      catalog: { orgId: ORG_ID },
      storeType: "SHOPIFY",
    });
  });

  test("counts against the same filter it lists against", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ storeType: "SHOPIFY" }));

    expect(db.count.mock.calls[0][0].where).toEqual(db.findMany.mock.calls[0][0].where);
  });

  test.each([
    ["an omitted store type", undefined],
    ["an empty store type", ""],
  ])("applies no store filter for %s", async (_name, storeType) => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ storeType }));

    expect(db.findMany.mock.calls[0][0].where).not.toHaveProperty("storeType");
  });

  // The catalog id alone no longer scopes the query — the caller's org is required and
  // applied through the owning catalog, so another org's orders (and the customer names
  // and phone numbers on them) cannot be reached by guessing a catalog id.
  test("scopes another org's catalog id to the caller's own org", async () => {
    await getWaCatalogOrders("cat-victim", "org-attacker", filter());

    expect(db.findMany.mock.calls[0][0].where).toEqual({
      catalogId: "cat-victim",
      catalog: { orgId: "org-attacker" },
    });
  });

  test("applies the same org scope to the count as to the listing", async () => {
    await getWaCatalogOrders("cat-victim", "org-attacker", filter());

    expect(db.count.mock.calls[0][0].where).toEqual(db.findMany.mock.calls[0][0].where);
  });
});

describe("getWaCatalogOrders - paging", () => {
  test("takes the requested number of orders", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ limit: 25 }));

    expect(db.findMany.mock.calls[0][0].take).toBe(25);
  });

  // Paging is zero-based here: page 0 starts at the first order.
  test("starts at the beginning for page zero", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ page: 0, limit: 50 }));

    expect(db.findMany.mock.calls[0][0].skip).toBe(0);
  });

  test.each([
    [1, 50, 50],
    [2, 50, 100],
    [3, 25, 75],
  ])("skips past page %s at %s per page", async (page, limit, expectedSkip) => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ page, limit }));

    expect(db.findMany.mock.calls[0][0].skip).toBe(expectedSkip);
  });

  test("skips nothing when the page size is zero", async () => {
    await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ page: 5, limit: 0 }));

    expect(db.findMany.mock.calls[0][0].skip).toBe(0);
    expect(db.findMany.mock.calls[0][0].take).toBe(0);
  });

  test("counts every matching order, not just the page", async () => {
    db.count.mockResolvedValue(500);

    const result = await getWaCatalogOrders(CATALOG_ID, ORG_ID, filter({ page: 0, limit: 10 }));

    expect(result.totalCount).toBe(500);
    expect(db.count.mock.calls[0][0]).not.toHaveProperty("take");
  });

  test("lets a database failure reach the caller", async () => {
    db.count.mockRejectedValue(new Error("db down"));

    await expect(getWaCatalogOrders(CATALOG_ID, ORG_ID, filter())).rejects.toThrow("db down");
  });
});
