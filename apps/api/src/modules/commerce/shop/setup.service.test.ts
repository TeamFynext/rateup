import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  whatsappSettings: { findMany: vi.fn() },
  whatsappCatalog: { findMany: vi.fn(), findFirst: vi.fn() },
  shopStore: { update: vi.fn() },
  shopProduct: { findMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
  shopVariant: { findFirst: vi.fn() },
}));
const catalog = vi.hoisted(() => ({
  syncWaCatalogs: vi.fn(async () => []),
  syncConnectedCatalog: vi.fn(async () => []),
  updateConnectWaCatalog: vi.fn(async () => undefined),
}));
const queue = vi.hoisted(() => ({ enqueueCatalogPublish: vi.fn() }));
const session = vi.hoisted(() => ({ findOpenSession: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);
vi.mock("../../whatsapp/catalog/catalog.service.js", () => catalog);
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => session);
const meta = vi.hoisted(() => ({
  sendMetaMessage: vi.fn<(input: { payload: { type: string } }) => Promise<unknown>>(async () => ({
    ok: true,
  })),
}));
vi.mock("../../whatsapp/meta/metaMessage.service.js", () => meta);
vi.mock("./orders.service.js", () => ({ createDraftOrder: vi.fn() }));
vi.mock("./events.js", () => ({
  checkoutUrl: (t: string) => `https://shop.test/c/${t}`,
  storefrontUrl: (s: string) => `https://shop.test/s/${s}`,
}));

const { createTestOrder, findCatalogs, sendProductToMe } = await import("./setup.service.js");

const STORE = { id: "s1", orgId: "org", metaCatalogId: null };
const number = { id: "w1", phone: "+1 555 0100", phoneId: "pid", wabaId: "waba" };

beforeEach(() => {
  vi.clearAllMocks();
  db.whatsappSettings.findMany.mockResolvedValue([number]);
  db.shopProduct.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
});

describe("finding the Meta catalog", () => {
  test("asks for WhatsApp first when no number is connected", async () => {
    db.whatsappSettings.findMany.mockResolvedValue([]);
    const result = await findCatalogs(STORE);
    expect(result.whatsapp.connected).toBe(false);
    expect(catalog.syncWaCatalogs).not.toHaveBeenCalled();
  });

  test("picks the catalog connected to WhatsApp and publishes every product to it", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: "c-other", name: "Old", connectedWaPhoneIds: [] },
      {
        catalogId: "c-wa",
        name: "Shop",
        connectedWaPhoneIds: [{ whatsappSettingsPhoneId: "pid" }],
      },
    ]);
    db.whatsappCatalog.findFirst.mockResolvedValue({ catalogId: "c-wa" });
    const result = await findCatalogs(STORE);
    expect(result.selected).toBe("c-wa");
    expect(db.shopStore.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { metaCatalogId: "c-wa" },
    });
    expect(catalog.updateConnectWaCatalog).toHaveBeenCalledWith("waba", "org", "c-wa");
    expect(queue.enqueueCatalogPublish).toHaveBeenCalledTimes(2);
  });

  test("leaves the choice to the merchant when there are several and none is connected", async () => {
    db.whatsappCatalog.findMany.mockResolvedValue([
      { catalogId: "a", name: "A", connectedWaPhoneIds: [] },
      { catalogId: "b", name: "B", connectedWaPhoneIds: [] },
    ]);
    const result = await findCatalogs(STORE);
    expect(result.selected).toBeNull();
    expect(db.shopStore.update).not.toHaveBeenCalled();
  });
});

describe("sending a product to yourself", () => {
  test("gives a link to open the chat when the 24-hour window is closed", async () => {
    db.shopProduct.findFirst.mockResolvedValue({
      id: "p1",
      title: "Mug",
      variants: [],
      metaSyncStatus: "LIVE",
    });
    session.findOpenSession.mockResolvedValue(null);
    const result = await sendProductToMe(
      { ...STORE, slug: "shop", currency: "USD" },
      "p1",
      "+1 555 0142",
    );
    expect(result).toEqual({
      sent: false,
      reason: "window_closed",
      openChatUrl: "https://wa.me/15550100?text=Hi",
    });
  });
});

describe("sending a live product to yourself", () => {
  const live = {
    id: "p1",
    title: "Mug",
    handle: "mug",
    variants: [{ retailerId: "r1", price: "10.00" }],
    metaSyncStatus: "LIVE",
  };
  const store = { ...STORE, metaCatalogId: "c-store", slug: "shop", currency: "USD" };

  beforeEach(() => {
    db.shopProduct.findFirst.mockResolvedValue(live);
    session.findOpenSession.mockResolvedValue({ phoneId: "pid" });
  });

  test("goes as a product card", async () => {
    const result = await sendProductToMe(store, "p1", "+1 555 0142");
    expect(result).toEqual({ sent: true, asProductCard: true });
    expect(meta.sendMetaMessage).toHaveBeenCalledTimes(1);
  });

  test("falls back to a link, and says so, when the catalog isn't the one on WhatsApp", async () => {
    meta.sendMetaMessage
      .mockResolvedValueOnce({ ok: false, error: "Invalid catalog_id", detail: { code: 131009 } })
      .mockResolvedValueOnce({ ok: true });
    const result = await sendProductToMe(store, "p1", "+1 555 0142");
    expect(result).toEqual({ sent: true, asProductCard: false, catalogNotConnected: true });
    expect(meta.sendMetaMessage.mock.calls[1][0].payload.type).toBe("text");
  });

  test("reports any other refusal", async () => {
    meta.sendMetaMessage.mockResolvedValueOnce({
      ok: false,
      error: "Rate limited",
      detail: { code: 130429 },
    });
    await expect(sendProductToMe(store, "p1", "+1 555 0142")).rejects.toMatchObject({
      message: "Rate limited",
    });
    expect(meta.sendMetaMessage).toHaveBeenCalledTimes(1);
  });
});

describe("test orders", () => {
  test("need an active product", async () => {
    db.shopVariant.findFirst.mockResolvedValue(null);
    await expect(
      createTestOrder({ id: "s1" } as never, { actorUserId: "u1" }),
    ).rejects.toMatchObject({
      code: "INVALID",
    });
  });
});
