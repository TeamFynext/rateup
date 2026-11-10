import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopOrder: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  org: { findUnique: vi.fn() },
}));
const meta = vi.hoisted(() => ({ callMetaApi: vi.fn() }));
const settings = vi.hoisted(() => ({ getWaSettings: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("../../meta/whatsapp/wa_axios.js", () => meta);
vi.mock("../../meta/whatsapp/settings/settings.service.js", () => settings);

const { buildPurchaseEvent, reportAdPurchase } = await import("./adConversion.service.js");

const paidAt = new Date();
const order = {
  id: "order-1",
  orgId: "org",
  number: 1042,
  currency: "USD",
  total: 48.5,
  paidAt,
  channelAccountId: "phone-1",
  adConversionSentAt: null,
  attribution: { kind: "ctwa_ad", adId: "ad-1", ctwaClid: "clid-1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.shopOrder.findUnique.mockResolvedValue(order);
  db.shopOrder.updateMany.mockResolvedValue({ count: 1 });
  db.org.findUnique.mockResolvedValue({ isConversionApiActive: true });
  settings.getWaSettings.mockResolvedValue({
    accessToken: "token",
    conversionsApiDatasetId: "dataset-1",
    wabaId: "waba-1",
  });
  meta.callMetaApi.mockResolvedValue({ status: 200, data: { events_received: 1 } });
});

describe("the Purchase sent to Meta for an ad sale", () => {
  test("is a business-messaging event carrying the click id", () => {
    expect(buildPurchaseEvent(order, "clid-1", "waba-1")).toEqual({
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(paidAt.getTime() / 1000),
          event_id: "order-1",
          action_source: "business_messaging",
          messaging_channel: "whatsapp",
          user_data: { whatsapp_business_account_id: "waba-1", ctwa_clid: "clid-1" },
          custom_data: { currency: "USD", value: 48.5, order_id: "1042" },
        },
      ],
    });
  });

  test("goes to the number's dataset once the order is claimed", async () => {
    await expect(reportAdPurchase("order-1")).resolves.toBe("sent");
    expect(settings.getWaSettings).toHaveBeenCalledWith("org", "phone-1");
    expect(db.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", adConversionSentAt: null },
      data: { adConversionSentAt: expect.any(Date) },
    });
    expect(meta.callMetaApi).toHaveBeenCalledWith(
      "/dataset-1/events",
      "POST",
      "token",
      expect.objectContaining({ data: [expect.objectContaining({ event_id: "order-1" })] }),
    );
  });

  test("is sent once, however often the payment is reported", async () => {
    db.shopOrder.findUnique.mockResolvedValue({ ...order, adConversionSentAt: new Date() });
    await expect(reportAdPurchase("order-1")).resolves.toBe("already_sent");
    db.shopOrder.findUnique.mockResolvedValue(order);
    db.shopOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(reportAdPurchase("order-1")).resolves.toBe("already_sent");
    expect(meta.callMetaApi).not.toHaveBeenCalled();
  });

  test("waits for the org to set up the Conversions API", async () => {
    db.org.findUnique.mockResolvedValue({ isConversionApiActive: false });
    await expect(reportAdPurchase("order-1")).resolves.toBe("not_set_up");
    db.org.findUnique.mockResolvedValue({ isConversionApiActive: true });
    settings.getWaSettings.mockResolvedValue({ accessToken: "token", wabaId: "waba-1" });
    await expect(reportAdPurchase("order-1")).resolves.toBe("not_set_up");
    expect(meta.callMetaApi).not.toHaveBeenCalled();
  });

  test("is not sent for an order no ad click started", async () => {
    db.shopOrder.findUnique.mockResolvedValue({ ...order, attribution: { kind: "storefront" } });
    await expect(reportAdPurchase("order-1")).resolves.toBe("not_from_ad");
    db.shopOrder.findUnique.mockResolvedValue({
      ...order,
      attribution: { kind: "ctwa_ad", adId: "ad-1" },
    });
    await expect(reportAdPurchase("order-1")).resolves.toBe("not_from_ad");
  });

  test("hands the order back for a retry when Meta refuses it", async () => {
    meta.callMetaApi.mockResolvedValue({ status: 400, data: { error: { message: "bad" } } });
    await expect(reportAdPurchase("order-1")).rejects.toThrow(/400/);
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { adConversionSentAt: null },
    });
  });

  test("is dropped once the sale is older than Meta accepts", async () => {
    db.shopOrder.findUnique.mockResolvedValue({
      ...order,
      paidAt: new Date(Date.now() - 8 * 24 * 3_600_000),
    });
    await expect(reportAdPurchase("order-1")).resolves.toBe("too_old");
  });
});
