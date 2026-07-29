import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => {
  const tx = {
    whatsappCatalog: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    default: {
      __tx: tx,
      whatsappCatalog: {
        delete: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      whatsappSettings: { findMany: vi.fn() },
      catalogPhoneIdMap: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
    },
    excludeFields: vi.fn(),
  };
});

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {
    error: any;
    constructor(message: string, error: any = {}) {
      super(message);
      this.error = error;
    }
  },
}));

vi.mock("./productSet.service.js", () => ({ syncProductSetsForCatalog: vi.fn() }));

vi.mock("../settings/wa_settings.service.js", () => ({
  getAllWaSettings: vi.fn(),
  getWaSettingsById: vi.fn(),
  getWaSettingsWithAccessTokenDecrypted: vi.fn(() => ({ accessToken: "token-abc" })),
}));

vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({
  createNativePaymentMessage: vi.fn(),
}));
vi.mock("../automatedReply/wa_automatedReply.utils.js", () => ({
  generateOrderReferenceId: vi.fn(() => "ord-1"),
}));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../integrations/shopify/shopify.service.js", () => ({
  buildShopifyCartUrl: vi.fn(),
}));
vi.mock("./catalogSettings.service.js", () => ({ sendAddressFlowToCustomer: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { syncProductSetsForCatalog } from "./productSet.service.js";
import {
  getAllWaSettings,
  getWaSettingsById,
  getWaSettingsWithAccessTokenDecrypted,
} from "../settings/wa_settings.service.js";
import { log } from "../../../utils/logger.js";
import { MetaLoginAssets, WaConfigType } from "../../../types/enums.js";
import {
  deleteWaCatalog,
  disconnectCatalogFromWaba,
  getConnectedWaCatalog,
  getWaCatalog,
  getWaCatalogsByOrg,
  syncConnectedCatalog,
  syncWaCatalogs,
  updateConnectWaCatalog,
  updateWaCatalog,
} from "./catalog.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  __tx: {
    whatsappCatalog: { createMany: Mock; findMany: Mock; deleteMany: Mock; update: Mock };
  };
  whatsappCatalog: {
    delete: Mock;
    update: Mock;
    findUnique: Mock;
    findFirst: Mock;
    findMany: Mock;
  };
  whatsappSettings: { findMany: Mock };
  catalogPhoneIdMap: { deleteMany: Mock; createMany: Mock };
  $transaction: Mock;
};
const tx = db.__tx;

const callMetaApiMock = callMetaApi as unknown as Mock;
const getAllWaSettingsMock = getAllWaSettings as unknown as Mock;
const getWaSettingsByIdMock = getWaSettingsById as unknown as Mock;
const decryptMock = getWaSettingsWithAccessTokenDecrypted as unknown as Mock;
const syncProductSetsMock = syncProductSetsForCatalog as unknown as Mock;

const ORG_ID = "org-1";

/** A settings row that is eligible for catalog syncing. */
function settings(overrides: Record<string, unknown> = {}) {
  return {
    phoneId: "phone-1",
    wabaId: "waba-1",
    accessToken: "token-abc",
    type: WaConfigType.Automated,
    assets: [MetaLoginAssets.CATALOGS],
    ...overrides,
  };
}

/**
 * Route Meta calls by URL: business info, owned catalogs, then the catalogs
 * connected to the WABA.
 */
function metaReturns({
  businessInfo = { id: "biz-1" } as any,
  ownedCatalogs = [] as any[],
  connectedCatalogs = [] as any[],
} = {}) {
  callMetaApiMock.mockImplementation(async (url: string) => {
    if (url.includes("on_behalf_of_business_info")) {
      return { data: { on_behalf_of_business_info: businessInfo } };
    }
    if (url.includes("owned_product_catalogs")) return { data: { data: ownedCatalogs } };
    if (url.includes("product_catalogs")) return { data: { data: connectedCatalogs } };
    return { data: {} };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(tx));
  db.whatsappCatalog.delete.mockResolvedValue({});
  db.whatsappCatalog.update.mockResolvedValue({});
  db.whatsappCatalog.findUnique.mockResolvedValue(null);
  db.whatsappCatalog.findFirst.mockResolvedValue(null);
  db.whatsappCatalog.findMany.mockResolvedValue([]);
  db.whatsappSettings.findMany.mockResolvedValue([settings()]);
  db.catalogPhoneIdMap.deleteMany.mockResolvedValue({ count: 0 });
  db.catalogPhoneIdMap.createMany.mockResolvedValue({ count: 0 });
  tx.whatsappCatalog.createMany.mockResolvedValue({ count: 0 });
  tx.whatsappCatalog.findMany.mockResolvedValue([]);
  tx.whatsappCatalog.deleteMany.mockResolvedValue({ count: 0 });
  tx.whatsappCatalog.update.mockResolvedValue({});
  getAllWaSettingsMock.mockResolvedValue([settings()]);
  getWaSettingsByIdMock.mockResolvedValue({ wabaId: "waba-1", accessToken: "token-abc" });
  decryptMock.mockReturnValue({ accessToken: "token-abc" });
  syncProductSetsMock.mockResolvedValue([]);
  metaReturns();
});

describe("catalog CRUD", () => {
  test("deletes the catalog by its Meta id", async () => {
    await deleteWaCatalog("cat-1");

    expect(db.whatsappCatalog.delete).toHaveBeenCalledWith({ where: { catalogId: "cat-1" } });
  });

  test("applies an update by Meta id", async () => {
    await updateWaCatalog("cat-1", { name: "Renamed" } as any);

    expect(db.whatsappCatalog.update).toHaveBeenCalledWith({
      where: { catalogId: "cat-1" },
      data: { name: "Renamed" },
    });
  });

  // NOTE: neither delete nor update takes an org, so the catalog id alone decides
  // what is affected — another org's catalog can be renamed or removed.
  test("neither delete nor update is scoped by org", async () => {
    await deleteWaCatalog("cat-victim");
    await updateWaCatalog("cat-victim", { name: "hijacked" } as any);

    expect(db.whatsappCatalog.delete.mock.calls[0][0].where).toEqual({ catalogId: "cat-victim" });
    expect(db.whatsappCatalog.update.mock.calls[0][0].where).toEqual({ catalogId: "cat-victim" });
  });

  test("fetches a catalog with the numbers connected to it", async () => {
    db.whatsappCatalog.findUnique.mockResolvedValue({ catalogId: "cat-1" });

    await getWaCatalog("cat-1");

    expect(db.whatsappCatalog.findUnique).toHaveBeenCalledWith({
      where: { catalogId: "cat-1" },
      include: { connectedWaPhoneIds: true },
    });
  });

  test("lists an org's catalogs with their connected numbers", async () => {
    await getWaCatalogsByOrg(ORG_ID);

    expect(db.whatsappCatalog.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG_ID },
      include: { connectedWaPhoneIds: true },
    });
  });

  test("finds the catalog attached to a number, with its products", async () => {
    await getConnectedWaCatalog("phone-1");

    expect(db.whatsappCatalog.findFirst).toHaveBeenCalledWith({
      where: { connectedWaPhoneIds: { some: { whatsappSettingsPhoneId: "phone-1" } } },
      include: { products: true },
    });
  });

  // NOTE: this lookup has no org filter either, so a phone id from another org
  // returns that org's catalog and its full product list.
  test("returns another org's catalog given one of its phone ids", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue({
      catalogId: "cat-victim",
      orgId: "org-victim",
    });

    await expect(getConnectedWaCatalog("phone-victim")).resolves.toMatchObject({
      orgId: "org-victim",
    });
  });
});

describe("syncWaCatalogs", () => {
  test("mirrors Meta's owned catalogs into the org", async () => {
    metaReturns({ ownedCatalogs: [{ id: "cat-1", name: "Main", vertical: "commerce" }] });

    await syncWaCatalogs(ORG_ID);

    expect(tx.whatsappCatalog.createMany).toHaveBeenCalledWith({
      data: [{ orgId: ORG_ID, catalogId: "cat-1", name: "Main", vertical: "commerce" }],
      skipDuplicates: true,
    });
  });

  test("renames a catalog whose name or vertical changed on Meta", async () => {
    metaReturns({ ownedCatalogs: [{ id: "cat-1", name: "New name", vertical: "commerce" }] });
    tx.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: "cat-1", name: "Old name", vertical: "commerce" },
    ]);

    await syncWaCatalogs(ORG_ID);

    expect(tx.whatsappCatalog.update).toHaveBeenCalledWith({
      where: { catalogId: "cat-1" },
      data: { name: "New name", vertical: "commerce" },
    });
  });

  test("leaves an unchanged catalog alone", async () => {
    metaReturns({ ownedCatalogs: [{ id: "cat-1", name: "Main", vertical: "commerce" }] });
    tx.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: "cat-1", name: "Main", vertical: "commerce" },
    ]);

    await syncWaCatalogs(ORG_ID);

    expect(tx.whatsappCatalog.update).not.toHaveBeenCalled();
  });

  test("removes a catalog that no longer exists on Meta", async () => {
    metaReturns({ ownedCatalogs: [] });
    tx.whatsappCatalog.findMany.mockResolvedValue([{ catalogId: "cat-gone", name: "Gone" }]);

    await syncWaCatalogs(ORG_ID);

    expect(tx.whatsappCatalog.deleteMany).toHaveBeenCalledWith({
      where: { catalogId: { in: ["cat-gone"] } },
    });
  });

  test("syncs the product sets of every catalog it stored", async () => {
    metaReturns({ ownedCatalogs: [{ id: "cat-1", name: "Main" }] });
    db.whatsappCatalog.findMany.mockResolvedValue([{ catalogId: "cat-1" }]);

    await syncWaCatalogs(ORG_ID);

    expect(syncProductSetsMock).toHaveBeenCalledWith("cat-1", ORG_ID, "token-abc");
  });

  test("keeps going when one catalog's product sets fail", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([{ catalogId: "cat-1" }, { catalogId: "cat-2" }]);
    syncProductSetsMock.mockRejectedValueOnce(new Error("meta limit"));

    await syncWaCatalogs(ORG_ID);

    expect(syncProductSetsMock).toHaveBeenCalledTimes(2);
    expect(log.error).toHaveBeenCalled();
  });

  test("syncs each business account only once even with several numbers on it", async () => {
    getAllWaSettingsMock.mockResolvedValue([
      settings({ phoneId: "phone-1" }),
      settings({ phoneId: "phone-2" }),
    ]);

    await syncWaCatalogs(ORG_ID);

    const businessInfoCalls = callMetaApiMock.mock.calls.filter(([url]) =>
      String(url).includes("on_behalf_of_business_info"),
    );
    expect(businessInfoCalls).toHaveLength(1);
  });

  test("skips an automated account that was not granted catalog access", async () => {
    getAllWaSettingsMock.mockResolvedValue([
      settings({ type: WaConfigType.Automated, assets: [] }),
    ]);

    await syncWaCatalogs(ORG_ID);

    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("skips an account Meta reports no business for", async () => {
    // null rather than undefined — undefined would fall back to the helper's default.
    metaReturns({ businessInfo: null });

    await syncWaCatalogs(ORG_ID);

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("maps every connected catalog onto every number on the account", async () => {
    getAllWaSettingsMock.mockResolvedValue([
      settings({ phoneId: "phone-1" }),
      settings({ phoneId: "phone-2" }),
    ]);
    metaReturns({ connectedCatalogs: [{ id: "cat-1" }] });

    await syncWaCatalogs(ORG_ID);

    expect(db.catalogPhoneIdMap.createMany).toHaveBeenCalledWith({
      data: [
        { catalogId: "cat-1", whatsappSettingsPhoneId: "phone-1" },
        { catalogId: "cat-1", whatsappSettingsPhoneId: "phone-2" },
      ],
      skipDuplicates: true,
    });
  });

  test("clears the mappings when Meta reports nothing connected", async () => {
    metaReturns({ connectedCatalogs: [] });

    await syncWaCatalogs(ORG_ID);

    expect(db.catalogPhoneIdMap.deleteMany).toHaveBeenCalledWith({
      where: { WhatsappSettings: { wabaId: "waba-1" } },
    });
    expect(db.catalogPhoneIdMap.createMany).not.toHaveBeenCalled();
  });

  // NOTE: each account is wrapped in its own try/catch, so one failing account is
  // logged and the rest still sync — but the caller is told nothing about it.
  test("logs and moves on when one account fails entirely", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta down"));

    await expect(syncWaCatalogs(ORG_ID)).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("syncConnectedCatalog", () => {
  test("reports success with the catalogs it mapped", async () => {
    metaReturns({ connectedCatalogs: [{ id: "cat-1", name: "Main" }] });
    db.whatsappCatalog.findMany.mockResolvedValue([{ catalogId: "cat-1" }]);

    const results = await syncConnectedCatalog(ORG_ID);

    expect(results).toEqual([{ wabaId: "waba-1", synced: true, catalogIds: ["cat-1"] }]);
  });

  test("warns when Meta has no catalog connected to the account", async () => {
    metaReturns({ connectedCatalogs: [] });

    const results = await syncConnectedCatalog(ORG_ID);

    expect(results[0]).toMatchObject({
      synced: false,
      warning: "No catalog is connected to this WhatsApp account on Meta.",
    });
  });

  test("warns and names the catalogs missing from the local database", async () => {
    metaReturns({ connectedCatalogs: [{ id: "cat-1" }, { id: "cat-2" }] });
    db.whatsappCatalog.findMany.mockResolvedValue([{ catalogId: "cat-1" }]);

    const results = await syncConnectedCatalog(ORG_ID);

    expect(results[0]).toMatchObject({ synced: false, catalogIds: ["cat-2"] });
    expect(results[0].warning).toContain("run a full catalog sync first");
    expect(db.catalogPhoneIdMap.createMany).not.toHaveBeenCalled();
  });

  test("checks the local catalogs within this org only", async () => {
    metaReturns({ connectedCatalogs: [{ id: "cat-1" }] });

    await syncConnectedCatalog(ORG_ID);

    expect(db.whatsappCatalog.findMany.mock.calls[0][0].where).toMatchObject({ orgId: ORG_ID });
  });

  test("replaces the existing mappings rather than adding to them", async () => {
    metaReturns({ connectedCatalogs: [{ id: "cat-1" }] });
    db.whatsappCatalog.findMany.mockResolvedValue([{ catalogId: "cat-1" }]);

    await syncConnectedCatalog(ORG_ID);

    expect(db.catalogPhoneIdMap.deleteMany).toHaveBeenCalledWith({
      where: { whatsappSettingsPhoneId: { in: ["phone-1"] } },
    });
    expect(db.catalogPhoneIdMap.createMany).toHaveBeenCalled();
  });

  test("reports one result per business account, not per number", async () => {
    getAllWaSettingsMock.mockResolvedValue([
      settings({ phoneId: "phone-1", wabaId: "waba-1" }),
      settings({ phoneId: "phone-2", wabaId: "waba-1" }),
      settings({ phoneId: "phone-3", wabaId: "waba-2" }),
    ]);

    const results = await syncConnectedCatalog(ORG_ID);

    expect(results).toHaveLength(2);
  });

  test("warns rather than throwing when Meta cannot be reached", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta down"));

    const results = await syncConnectedCatalog(ORG_ID);

    expect(results[0]).toMatchObject({
      synced: false,
      warning: "Failed to fetch connected catalog from Meta.",
    });
  });
});

describe("updateConnectWaCatalog", () => {
  test("refuses when the org has no eligible settings for that account", async () => {
    db.whatsappSettings.findMany.mockResolvedValue([]);

    await expect(updateConnectWaCatalog("waba-1", ORG_ID, "cat-1")).rejects.toThrow(
      "No whatsapp settings found",
    );
  });

  test("accepts manual settings, or automated ones granted catalog access", async () => {
    await updateConnectWaCatalog("waba-1", ORG_ID, "cat-1");

    const where = db.whatsappSettings.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ wabaId: "waba-1", orgId: ORG_ID });
    expect(where.OR).toEqual([
      { type: WaConfigType.Automated, assets: { has: MetaLoginAssets.CATALOGS } },
      { type: WaConfigType.Manual },
    ]);
  });

  test("maps the catalog locally without calling Meta when asked not to sync", async () => {
    await updateConnectWaCatalog("waba-1", ORG_ID, "cat-1", false);

    expect(callMetaApiMock).not.toHaveBeenCalled();
    expect(db.catalogPhoneIdMap.createMany).toHaveBeenCalledWith({
      data: [{ catalogId: "cat-1", whatsappSettingsPhoneId: "phone-1" }],
      skipDuplicates: true,
    });
  });

  test("asks Meta to link the catalog and then records the mapping", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    await updateConnectWaCatalog("waba-1", ORG_ID, "cat-1");

    expect(callMetaApiMock).toHaveBeenCalledWith("/waba-1/product_catalogs", "POST", "token-abc", {
      catalog_id: "cat-1",
    });
    expect(db.catalogPhoneIdMap.createMany).toHaveBeenCalled();
  });

  test("records nothing when Meta does not report success", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: false } });

    await updateConnectWaCatalog("waba-1", ORG_ID, "cat-1");

    expect(db.catalogPhoneIdMap.createMany).not.toHaveBeenCalled();
  });

  // Meta rejects a re-link with code 100 / subcode 2388099; that means it is already
  // linked, so the local mapping is brought into line rather than the call failing.
  test.each([
    ["error code 100", { code: 100 }],
    ["subcode 2388099", { error_subcode: 2388099 }],
  ])("treats %s as already linked and records the mapping", async (_name, errorBody) => {
    callMetaApiMock.mockRejectedValue(new (GraphApiError as any)("already linked", errorBody));

    await expect(updateConnectWaCatalog("waba-1", ORG_ID, "cat-1")).resolves.toBeUndefined();
    expect(db.catalogPhoneIdMap.createMany).toHaveBeenCalled();
  });

  test("rethrows any other Graph API failure", async () => {
    callMetaApiMock.mockRejectedValue(new (GraphApiError as any)("no permission", { code: 200 }));

    await expect(updateConnectWaCatalog("waba-1", ORG_ID, "cat-1")).rejects.toThrow(
      "no permission",
    );
    expect(db.catalogPhoneIdMap.createMany).not.toHaveBeenCalled();
  });

  test("rethrows an ordinary failure", async () => {
    callMetaApiMock.mockRejectedValue(new Error("network down"));

    await expect(updateConnectWaCatalog("waba-1", ORG_ID, "cat-1")).rejects.toThrow("network down");
  });

  test("uses the newest settings row's token", async () => {
    await updateConnectWaCatalog("waba-1", ORG_ID, "cat-1");

    expect(db.whatsappSettings.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
    expect(decryptMock).toHaveBeenCalledWith(settings());
  });
});

describe("disconnectCatalogFromWaba", () => {
  beforeEach(() => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });
  });

  test("asks Meta to unlink the catalog and clears the local mapping", async () => {
    await disconnectCatalogFromWaba({ whatsappSettingsId: "set-1", catalogId: "cat-1" } as any);

    expect(callMetaApiMock).toHaveBeenCalledWith(
      "/waba-1/product_catalogs",
      "DELETE",
      "token-abc",
      { catalog_id: "cat-1" },
    );
    expect(db.catalogPhoneIdMap.deleteMany).toHaveBeenCalledWith({
      where: { WhatsappSettings: { wabaId: "waba-1" }, catalogId: "cat-1" },
    });
  });

  test("refuses without clearing anything when Meta does not confirm", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: false } });

    await expect(
      disconnectCatalogFromWaba({ whatsappSettingsId: "set-1", catalogId: "cat-1" } as any),
    ).rejects.toThrow("Something went wrong");
    expect(db.catalogPhoneIdMap.deleteMany).not.toHaveBeenCalled();
  });

  test("lets a Meta failure reach the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta down"));

    await expect(
      disconnectCatalogFromWaba({ whatsappSettingsId: "set-1", catalogId: "cat-1" } as any),
    ).rejects.toThrow("meta down");
  });
});
