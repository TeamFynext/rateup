import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./catalog.service.js", () => ({
  deleteWaCatalog: vi.fn(),
  disconnectCatalogFromWaba: vi.fn(),
  getConnectedWaCatalog: vi.fn(),
  getWaCatalog: vi.fn(),
  getWaCatalogsByOrg: vi.fn(),
  syncConnectedCatalog: vi.fn(),
  syncWaCatalogs: vi.fn(),
  updateConnectWaCatalog: vi.fn(),
  updateWaCatalog: vi.fn(),
}));

vi.mock("./catalogSettings.service.js", () => ({
  createAddressFlow: vi.fn(),
  getCatalogSettings: vi.fn(),
  updateCatalogSettings: vi.fn(),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

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
import {
  createAddressFlow,
  getCatalogSettings,
  updateCatalogSettings,
} from "./catalogSettings.service.js";
import { log } from "../../../utils/logger.js";
import {
  createAddressFlowHandler,
  deleteCatalogHandler,
  disconnectCatalogFromWabaHandler,
  getCatalogSettingsHandler,
  getConnectedWaCatalogHandler,
  getWaCatalogByOrgHandler,
  getWaCatalogInfoHandler,
  syncCatalogsHandler,
  syncConnectedCatalogHandler,
  updateCatalogHandler,
  updateCatalogSettingsHandler,
} from "./catalog.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  remove: deleteWaCatalog as unknown as Mock,
  disconnect: disconnectCatalogFromWaba as unknown as Mock,
  getConnected: getConnectedWaCatalog as unknown as Mock,
  getOne: getWaCatalog as unknown as Mock,
  listByOrg: getWaCatalogsByOrg as unknown as Mock,
  syncConnected: syncConnectedCatalog as unknown as Mock,
  syncAll: syncWaCatalogs as unknown as Mock,
  connect: updateConnectWaCatalog as unknown as Mock,
  update: updateWaCatalog as unknown as Mock,
  getSettings: getCatalogSettings as unknown as Mock,
  updateSettings: updateCatalogSettings as unknown as Mock,
  createFlow: createAddressFlow as unknown as Mock,
};

const CATALOG = { id: "cat-1", orgId: "org-1", name: "Main catalog" };

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    status: vi.fn((c: number) => {
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
    params: {},
    body: {},
    query: {},
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.remove.mockResolvedValue(CATALOG);
  m.disconnect.mockResolvedValue(CATALOG);
  m.getConnected.mockResolvedValue(CATALOG);
  m.getOne.mockResolvedValue(CATALOG);
  m.listByOrg.mockResolvedValue([CATALOG]);
  m.syncConnected.mockResolvedValue([{ catalogId: "cat-1", synced: true }]);
  m.syncAll.mockResolvedValue([CATALOG]);
  m.connect.mockResolvedValue(CATALOG);
  m.update.mockResolvedValue(CATALOG);
  m.getSettings.mockResolvedValue({ catalogId: "cat-1" });
  m.updateSettings.mockResolvedValue({ catalogId: "cat-1" });
  m.createFlow.mockResolvedValue(undefined);
});

describe("deleteCatalogHandler", () => {
  test("deletes the catalog named in the path", async () => {
    const reply = makeReply();

    await deleteCatalogHandler(makeRequest({ params: { catalogId: "cat-1" } }), reply);

    expect(m.remove).toHaveBeenCalledWith("cat-1", "org-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  // The caller's org is passed to the service, which refuses a catalog it does not own
  // with "Catalog not found" — answered here as a 404, the same as an id that never
  // existed, so the endpoint cannot be used to probe for other orgs' catalog ids.
  test("scopes the delete to the caller's org", async () => {
    await deleteCatalogHandler(
      makeRequest({ params: { catalogId: "cat-victim" }, user: { orgId: "org-attacker" } }),
      makeReply(),
    );

    expect(m.remove).toHaveBeenCalledWith("cat-victim", "org-attacker");
  });

  test("answers 404 for a catalog the caller's org does not own", async () => {
    m.remove.mockRejectedValue(new Error("Catalog not found"));
    const reply = makeReply();

    await deleteCatalogHandler(makeRequest({ params: { catalogId: "cat-victim" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(log.error).not.toHaveBeenCalled();
  });

  test("returns 500 when the delete fails", async () => {
    m.remove.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await deleteCatalogHandler(makeRequest({ params: { catalogId: "cat-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("updateCatalogHandler", () => {
  test("connects the catalog to a business account when a wabaId is given", async () => {
    const reply = makeReply();

    await updateCatalogHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body: { wabaId: "waba-1" } }),
      reply,
    );

    expect(m.connect).toHaveBeenCalledWith("waba-1", "org-1", "cat-1", true);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("syncs with Meta by default and only skips when explicitly told to", async () => {
    await updateCatalogHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body: { wabaId: "waba-1" } }),
      makeReply(),
    );
    expect(m.connect.mock.calls[0][3]).toBe(true);

    vi.clearAllMocks();
    await updateCatalogHandler(
      makeRequest({
        params: { catalogId: "cat-1" },
        body: { wabaId: "waba-1", syncWithMeta: false },
      }),
      makeReply(),
    );
    expect(m.connect.mock.calls[0][3]).toBe(false);
  });

  test("does not connect anything when no wabaId is given", async () => {
    await updateCatalogHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body: { name: "Renamed" } }),
      makeReply(),
    );

    expect(m.connect).not.toHaveBeenCalled();
  });

  test("applies the remaining fields to the catalog", async () => {
    await updateCatalogHandler(
      makeRequest({
        params: { catalogId: "cat-1" },
        body: { wabaId: "waba-1", syncWithMeta: true, name: "Renamed" },
      }),
      makeReply(),
    );

    expect(m.update).toHaveBeenCalledWith("cat-1", "org-1", { name: "Renamed" });
  });

  // `rest` is an object literal and so always truthy; the guard now checks whether it
  // actually holds anything. A body carrying nothing but wabaId used to issue an empty
  // update, which is a pointless write and would 404 for a catalog id that does not
  // exist even though the caller asked for nothing.
  test("issues no update when the body held only a wabaId", async () => {
    await updateCatalogHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body: { wabaId: "waba-1" } }),
      makeReply(),
    );

    expect(m.update).not.toHaveBeenCalled();
  });

  test("answers 404 for a catalog the caller's org does not own", async () => {
    m.update.mockRejectedValue(new Error("Catalog not found"));
    const reply = makeReply();

    await updateCatalogHandler(
      makeRequest({ params: { catalogId: "cat-victim" }, body: { name: "hijacked" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test("returns 500 when the update fails", async () => {
    m.update.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    // Body carries a real field: an empty one no longer reaches the service at all.
    await updateCatalogHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body: { name: "Renamed" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("reading catalogs", () => {
  test("returns the catalog named in the path", async () => {
    const reply = makeReply();

    await getWaCatalogInfoHandler(makeRequest({ params: { catalogId: "cat-1" } }), reply);

    expect(m.getOne).toHaveBeenCalledWith("cat-1", "org-1");
    expect(reply.payload).toBe(CATALOG);
  });

  // The lookup is scoped to the caller's org, so another org's catalog comes back null
  // and is answered 404 rather than handed over.
  test("answers 404 for a catalog belonging to another org", async () => {
    m.getOne.mockResolvedValue(null);
    const reply = makeReply();

    await getWaCatalogInfoHandler(
      makeRequest({ params: { catalogId: "cat-victim" }, user: { orgId: "org-attacker" } }),
      reply,
    );

    expect(m.getOne).toHaveBeenCalledWith("cat-victim", "org-attacker");
    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test("lists the caller's org's catalogs", async () => {
    const reply = makeReply();

    await getWaCatalogByOrgHandler(makeRequest(), reply);

    expect(m.listByOrg).toHaveBeenCalledWith("org-1");
    expect(reply.payload).toEqual([CATALOG]);
  });

  test("returns the catalog connected to a given number", async () => {
    const reply = makeReply();

    await getConnectedWaCatalogHandler(
      makeRequest({ params: { whatsappSettingsPhoneId: "phone-1" } }),
      reply,
    );

    expect(m.getConnected).toHaveBeenCalledWith("phone-1", "org-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test.each([
    ["getWaCatalogInfoHandler", getWaCatalogInfoHandler, "getOne"],
    ["getWaCatalogByOrgHandler", getWaCatalogByOrgHandler, "listByOrg"],
    ["getConnectedWaCatalogHandler", getConnectedWaCatalogHandler, "getConnected"],
  ])("%s returns 500 when the lookup fails", async (_name, handler, key) => {
    (m as any)[key].mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await (handler as any)(makeRequest({ params: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("syncCatalogsHandler", () => {
  test("syncs every catalog for the caller's org", async () => {
    const reply = makeReply();

    await syncCatalogsHandler(makeRequest(), reply);

    expect(m.syncAll).toHaveBeenCalledWith("org-1");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual([CATALOG]);
  });

  test("returns 500 when the sync fails", async () => {
    m.syncAll.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await syncCatalogsHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("syncConnectedCatalogHandler", () => {
  test("answers 200 when every connected catalog synced", async () => {
    m.syncConnected.mockResolvedValue([
      { catalogId: "cat-1", synced: true },
      { catalogId: "cat-2", synced: true },
    ]);
    const reply = makeReply();

    await syncConnectedCatalogHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
  });

  // 207 Multi-Status: some catalogs synced and some did not.
  test("answers 207 when any catalog failed to sync", async () => {
    m.syncConnected.mockResolvedValue([
      { catalogId: "cat-1", synced: true },
      { catalogId: "cat-2", synced: false },
    ]);
    const reply = makeReply();

    await syncConnectedCatalogHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(207);
    expect(reply.payload).toHaveLength(2);
  });

  test("answers 200 for an org with no connected catalogs at all", async () => {
    m.syncConnected.mockResolvedValue([]);
    const reply = makeReply();

    await syncConnectedCatalogHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when the sync throws", async () => {
    m.syncConnected.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await syncConnectedCatalogHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("disconnectCatalogFromWabaHandler", () => {
  test("disconnects using the body it was given", async () => {
    const reply = makeReply();
    const body = { catalogId: "cat-1", whatsappSettingsPhoneId: "phone-1" };

    await disconnectCatalogFromWabaHandler(makeRequest({ body }), reply);

    expect(m.disconnect).toHaveBeenCalledWith(body, "org-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when disconnecting fails", async () => {
    m.disconnect.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await disconnectCatalogFromWabaHandler(makeRequest({ body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("catalog settings handlers", () => {
  test("returns the catalog's settings", async () => {
    const reply = makeReply();

    await getCatalogSettingsHandler(makeRequest({ params: { catalogId: "cat-1" } }), reply);

    expect(m.getSettings).toHaveBeenCalledWith("cat-1", "org-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("applies a settings change and returns the result", async () => {
    const reply = makeReply();
    const body = { isCodEnabled: true };

    await updateCatalogSettingsHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body }),
      reply,
    );

    expect(m.updateSettings).toHaveBeenCalledWith("cat-1", "org-1", body);
    expect(reply.payload).toEqual({ catalogId: "cat-1" });
  });

  // These two stringify the error rather than sending the raw object.
  test.each([
    ["getCatalogSettingsHandler", getCatalogSettingsHandler, "getSettings"],
    ["updateCatalogSettingsHandler", updateCatalogSettingsHandler, "updateSettings"],
  ])("%s returns 500 with a stringified error", async (_name, handler, key) => {
    (m as any)[key].mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await (handler as any)(makeRequest({ params: { catalogId: "cat-1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ error: "Error: boom" });
  });
});

describe("createAddressFlowHandler", () => {
  test("creates the address flow for the caller and catalog", async () => {
    const reply = makeReply();
    const request = makeRequest({
      params: { catalogId: "cat-1" },
      body: { json: { nodes: [] }, map: { a: 1 } },
    });

    await createAddressFlowHandler(request, reply);

    expect(m.createFlow).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "cat-1",
      request,
      { nodes: [] },
      { a: 1 },
    );
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  // Unlike its neighbours this one answers 400 with the bare message, and does not log.
  test("answers 400 with the failure's message", async () => {
    m.createFlow.mockRejectedValue(new Error("flow already exists"));
    const reply = makeReply();

    await createAddressFlowHandler(
      makeRequest({ params: { catalogId: "cat-1" }, body: {} }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.payload).toBe("flow already exists");
    expect(log.error).not.toHaveBeenCalled();
  });
});
