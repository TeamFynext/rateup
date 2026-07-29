import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { whatsappSettings: { findUnique: vi.fn() } },
  excludeFields: vi.fn(),
}));

vi.mock("./productSet.service.js", () => ({
  getProductSetById: vi.fn(),
  getProductSetsByCatalog: vi.fn(),
  syncProductSetsForCatalog: vi.fn(),
}));

vi.mock("./catalog.service.js", () => ({ getWaCatalog: vi.fn() }));

vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettingsWithAccessTokenDecrypted: vi.fn(() => ({ accessToken: "token-abc" })),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  getProductSetById,
  getProductSetsByCatalog,
  syncProductSetsForCatalog,
} from "./productSet.service.js";
import { getWaCatalog } from "./catalog.service.js";
import { getWaSettingsWithAccessTokenDecrypted } from "../settings/wa_settings.service.js";
import { log } from "../../../utils/logger.js";
import {
  getProductSetByIdHandler,
  getProductSetsByCatalogHandler,
  syncProductSetsHandler,
} from "./productSet.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const waSettingsFindUnique = (prisma as unknown as { whatsappSettings: { findUnique: Mock } })
  .whatsappSettings.findUnique;

const m = {
  sync: syncProductSetsForCatalog as unknown as Mock,
  listByCatalog: getProductSetsByCatalog as unknown as Mock,
  getById: getProductSetById as unknown as Mock,
  getCatalog: getWaCatalog as unknown as Mock,
  decryptToken: getWaSettingsWithAccessTokenDecrypted as unknown as Mock,
};

const CATALOG = {
  id: "cat-1",
  orgId: "org-1",
  connectedWaPhoneIds: [{ whatsappSettingsPhoneId: "phone-1" }],
};

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
    params: {},
    body: {},
    query: {},
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getCatalog.mockResolvedValue(CATALOG);
  m.sync.mockResolvedValue([{ productSetId: "set-1" }]);
  m.listByCatalog.mockResolvedValue([{ productSetId: "set-1" }]);
  m.getById.mockResolvedValue({ productSetId: "set-1" });
  m.decryptToken.mockReturnValue({ accessToken: "token-abc" });
  waSettingsFindUnique.mockResolvedValue({ phoneId: "phone-1", accessToken: "encrypted" });
});

describe("syncProductSetsHandler", () => {
  test("syncs the catalog's product sets using the connected number's token", async () => {
    const reply = makeReply();

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), reply);

    expect(waSettingsFindUnique).toHaveBeenCalledWith({ where: { phoneId: "phone-1" } });
    expect(m.sync).toHaveBeenCalledWith("cat-1", "org-1", "token-abc");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual([{ productSetId: "set-1" }]);
  });

  test("decrypts the stored access token before using it", async () => {
    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), makeReply());

    expect(m.decryptToken).toHaveBeenCalledWith({ phoneId: "phone-1", accessToken: "encrypted" });
  });

  test("returns 404 for a catalog that does not exist", async () => {
    m.getCatalog.mockResolvedValue(null);
    const reply = makeReply();

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "missing" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toEqual({ error: "Catalog not found" });
    expect(m.sync).not.toHaveBeenCalled();
  });

  // This handler does check ownership, unlike the two below it.
  test("refuses a catalog belonging to another org", async () => {
    m.getCatalog.mockResolvedValue({ ...CATALOG, orgId: "org-victim" });
    const reply = makeReply();

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.sync).not.toHaveBeenCalled();
  });

  test("refuses to sync a catalog with no WhatsApp number attached", async () => {
    m.getCatalog.mockResolvedValue({ ...CATALOG, connectedWaPhoneIds: [] });
    const reply = makeReply();

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({
      error: "No WhatsApp account connected to this catalog",
    });
    expect(m.sync).not.toHaveBeenCalled();
  });

  test("returns 404 when the connected number has no settings row", async () => {
    waSettingsFindUnique.mockResolvedValue(null);
    const reply = makeReply();

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toEqual({ error: "WhatsApp settings not found" });
  });

  // Only the first connected number is used, even when several are attached.
  test("uses the first connected number when the catalog has more than one", async () => {
    m.getCatalog.mockResolvedValue({
      ...CATALOG,
      connectedWaPhoneIds: [
        { whatsappSettingsPhoneId: "phone-1" },
        { whatsappSettingsPhoneId: "phone-2" },
      ],
    });

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), makeReply());

    expect(waSettingsFindUnique).toHaveBeenCalledWith({ where: { phoneId: "phone-1" } });
  });

  test("returns 500 when the sync itself fails", async () => {
    m.sync.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await syncProductSetsHandler(makeRequest({ body: { catalogId: "cat-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getProductSetsByCatalogHandler", () => {
  test("lists the catalog's product sets", async () => {
    const reply = makeReply();

    await getProductSetsByCatalogHandler(makeRequest({ params: { catalogId: "cat-1" } }), reply);

    expect(m.listByCatalog).toHaveBeenCalledWith("cat-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  // NOTE: no ownership check at all — the catalog id from the path is used directly,
  // so another org's product sets are returned.
  test("returns another org's product sets given its catalog id", async () => {
    const reply = makeReply();

    await getProductSetsByCatalogHandler(
      makeRequest({ params: { catalogId: "cat-victim" } }),
      reply,
    );

    expect(m.listByCatalog).toHaveBeenCalledWith("cat-victim");
    expect(reply.code).not.toHaveBeenCalledWith(403);
  });

  test("returns 500 when the listing fails", async () => {
    m.listByCatalog.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getProductSetsByCatalogHandler(makeRequest({ params: { catalogId: "cat-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getProductSetByIdHandler", () => {
  test("returns the product set named in the path", async () => {
    const reply = makeReply();

    await getProductSetByIdHandler(makeRequest({ params: { productSetId: "set-1" } }), reply);

    expect(m.getById).toHaveBeenCalledWith("set-1");
    expect(reply.payload).toEqual({ productSetId: "set-1" });
  });

  // NOTE: answers 200 with null rather than 404, and performs no ownership check.
  test("answers 200 with null for a set that does not exist", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await getProductSetByIdHandler(makeRequest({ params: { productSetId: "missing" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toBeNull();
  });

  test("returns 500 when the lookup fails", async () => {
    m.getById.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getProductSetByIdHandler(makeRequest({ params: { productSetId: "set-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});
