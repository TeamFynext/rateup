import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => {
  const tx = {
    whatsappProductSet: { upsert: vi.fn(), deleteMany: vi.fn() },
  };
  return {
    default: {
      __tx: tx,
      whatsappProductSet: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
      $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
    },
    excludeFields: vi.fn(),
  };
});

vi.mock("../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { callMetaApi } from "../wa_axios.js";
import { log } from "../../../utils/logger.js";
import {
  getProductSetById,
  getProductSetsByCatalog,
  syncProductSetsForCatalog,
} from "./productSet.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  __tx: { whatsappProductSet: { upsert: Mock; deleteMany: Mock } };
  whatsappProductSet: { findMany: Mock; findUnique: Mock; findFirst: Mock };
  $transaction: Mock;
};
const tx = db.__tx;
const callMetaApiMock = callMetaApi as unknown as Mock;

const CATALOG_ID = "cat-1";
const ORG_ID = "org-1";
const TOKEN = "token-abc";

/** Meta returns the sets first, then the products in each set. */
function metaReturns(sets: any[], productsBySet: Record<string, any[]> = {}) {
  callMetaApiMock.mockImplementation(async (url: string) => {
    if (url.includes("/product_sets")) return { data: { data: sets } };
    const setId = url.slice(1).split("/")[0];
    return { data: { data: productsBySet[setId] ?? [] } };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(tx));
  db.whatsappProductSet.findMany.mockResolvedValue([]);
  db.whatsappProductSet.findUnique.mockResolvedValue(null);
  db.whatsappProductSet.findFirst.mockResolvedValue(null);
  tx.whatsappProductSet.upsert.mockResolvedValue({});
  tx.whatsappProductSet.deleteMany.mockResolvedValue({ count: 0 });
  metaReturns([]);
});

describe("syncProductSetsForCatalog - reading from Meta", () => {
  test("asks Meta for the catalog's product sets with the org's token", async () => {
    await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    const [url, method] = callMetaApiMock.mock.calls[0];
    expect(url).toContain(`/${CATALOG_ID}/product_sets`);
    expect(url).toContain("fields=name,filter,product_count");
    expect(url).toContain(`access_token=${TOKEN}`);
    expect(method).toBe("GET");
  });

  test("fetches the products inside each set", async () => {
    metaReturns([{ id: "set-1", name: "Shoes" }], {
      "set-1": [{ retailer_id: "sku-1" }, { retailer_id: "sku-2" }],
    });

    const result = await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(result[0]).toEqual({
      productSetId: "set-1",
      catalogId: CATALOG_ID,
      orgId: ORG_ID,
      name: "Shoes",
      filter: null,
      productIds: ["sku-1", "sku-2"],
    });
  });

  test("keeps the set's filter when Meta supplies one", async () => {
    metaReturns([{ id: "set-1", name: "Shoes", filter: { category: "shoes" } }]);

    const result = await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(result[0].filter).toEqual({ category: "shoes" });
  });

  test("returns an empty list when Meta reports no sets", async () => {
    callMetaApiMock.mockResolvedValue({ data: {} });

    await expect(syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN)).resolves.toEqual([]);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("fetches every set's products at once rather than one after another", async () => {
    metaReturns([
      { id: "set-1", name: "A" },
      { id: "set-2", name: "B" },
      { id: "set-3", name: "C" },
    ]);

    const result = await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(result).toHaveLength(3);
    // One call for the sets, then one per set.
    expect(callMetaApiMock).toHaveBeenCalledTimes(4);
  });

  // A set whose products cannot be read is still worth storing — losing the whole
  // sync because one set failed would be worse.
  test("keeps a set whose product lookup failed, with no products", async () => {
    callMetaApiMock.mockImplementation(async (url: string) => {
      if (url.includes("/product_sets"))
        return { data: { data: [{ id: "set-1", name: "Shoes" }] } };
      throw new Error("meta rate limit");
    });

    const result = await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(result[0]).toMatchObject({ productSetId: "set-1", name: "Shoes", productIds: [] });
    expect(log.error).toHaveBeenCalled();
  });

  test("logs and rethrows when the set listing itself fails", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta down"));

    await expect(syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN)).rejects.toThrow("meta down");
    expect(log.error).toHaveBeenCalled();
  });
});

describe("syncProductSetsForCatalog - writing to the database", () => {
  beforeEach(() => {
    metaReturns([{ id: "set-1", name: "Shoes" }], { "set-1": [{ retailer_id: "sku-1" }] });
  });

  test("creates a set it has not seen and refreshes one it has", async () => {
    await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    const call = tx.whatsappProductSet.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ productSetId: "set-1" });
    expect(call.create).toMatchObject({ productSetId: "set-1", catalogId: CATALOG_ID });
    expect(call.update).toMatchObject({
      name: "Shoes",
      filter: null,
      productIds: ["sku-1"],
    });
  });

  test("stamps the refresh time on an update", async () => {
    await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(tx.whatsappProductSet.upsert.mock.calls[0][0].update.updatedAt).toBeInstanceOf(Date);
  });

  test("drops sets that no longer exist in Meta, within this catalog and org only", async () => {
    await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(tx.whatsappProductSet.deleteMany).toHaveBeenCalledWith({
      where: {
        catalogId: CATALOG_ID,
        orgId: ORG_ID,
        productSetId: { notIn: ["set-1"] },
      },
    });
  });

  test("writes the upserts and the cleanup in one transaction", async () => {
    await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  test("upserts every set Meta returned", async () => {
    metaReturns([
      { id: "set-1", name: "A" },
      { id: "set-2", name: "B" },
    ]);

    await syncProductSetsForCatalog(CATALOG_ID, ORG_ID, TOKEN);

    expect(tx.whatsappProductSet.upsert).toHaveBeenCalledTimes(2);
    expect(tx.whatsappProductSet.deleteMany.mock.calls[0][0].where.productSetId.notIn).toEqual([
      "set-1",
      "set-2",
    ]);
  });
});

describe("getProductSetsByCatalog", () => {
  test("lists the catalog's sets by name", async () => {
    db.whatsappProductSet.findMany.mockResolvedValue([{ productSetId: "set-1" }]);

    const result = await getProductSetsByCatalog(CATALOG_ID, ORG_ID);

    expect(db.whatsappProductSet.findMany).toHaveBeenCalledWith({
      where: { catalogId: CATALOG_ID, orgId: ORG_ID },
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([{ productSetId: "set-1" }]);
  });

  // The listing carries the caller's org, so another org's catalog id matches nothing
  // rather than handing back its sets and their product id lists.
  test("scopes the listing to the caller's org", async () => {
    await getProductSetsByCatalog("cat-other", "org-attacker");

    expect(db.whatsappProductSet.findMany.mock.calls[0][0].where).toEqual({
      catalogId: "cat-other",
      orgId: "org-attacker",
    });
  });
});

describe("getProductSetById", () => {
  // findFirst on the { orgId, productSetId } pair rather than findUnique on the id
  // alone — the pair is a unique index, so this is the same lookup, just one that
  // cannot return another org's set.
  test("fetches the set by its Meta id, within the caller's org", async () => {
    db.whatsappProductSet.findFirst.mockResolvedValue({ productSetId: "set-1" });

    await expect(getProductSetById("set-1", ORG_ID)).resolves.toEqual({ productSetId: "set-1" });
    expect(db.whatsappProductSet.findFirst).toHaveBeenCalledWith({
      where: { productSetId: "set-1", orgId: ORG_ID },
    });
  });

  test("returns null for a set that does not exist", async () => {
    await expect(getProductSetById("missing", ORG_ID)).resolves.toBeNull();
  });

  test("returns null for a set belonging to another org", async () => {
    await expect(getProductSetById("set-victim", "org-attacker")).resolves.toBeNull();
    expect(db.whatsappProductSet.findFirst.mock.calls[0][0].where.orgId).toBe("org-attacker");
  });
});
