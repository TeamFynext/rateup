import { beforeEach, describe, expect, test, vi } from "vitest";

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
vi.mock("../../whatsapp/meta/metaMessage.service.js", () => ({
  sendMetaMessage: vi.fn(async () => ({ ok: true })),
}));
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
