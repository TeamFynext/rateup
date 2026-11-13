import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({ shopOrderEvent: { create: vi.fn() } }));
const notify = vi.hoisted(() => ({
  notificationSetting: vi.fn(() => ({ enabled: true, waTemplateId: "t1", body: "Order {{2}}" })),
  sendShopMessage: vi.fn(async () => ({ sent: true, channel: "WHATSAPP" })),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({
  disarmShopReminders: vi.fn(),
  enqueueAdConversion: vi.fn(),
  enqueueInvoice: vi.fn(),
}));
vi.mock("./notify.js", () => notify);

const { notifyCustomer } = await import("./events.js");

const order = (over: Record<string, unknown>) =>
  ({
    id: "o1",
    orgId: "org",
    number: 1001,
    currency: "USD",
    total: "20",
    customerName: "Ana",
    customerPhone: "15550100",
    channel: "STOREFRONT",
    phoneVerifiedAt: null,
    paidAt: null,
    paymentStatus: "COD_PENDING",
    paymentMethod: "cod",
    shipments: [],
    items: [],
    store: { notifications: null, codConfirm: true, codPrepaidDiscountPct: null },
    ...over,
  }) as never;

beforeEach(() => vi.clearAllMocks());

describe("messages about a storefront order", () => {
  test("never go to a number nobody proved", async () => {
    await notifyCustomer(order({}), "placed");
    expect(notify.sendShopMessage).not.toHaveBeenCalled();
    expect(db.shopOrderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "message_not_sent" }),
    });
  });

  test("go once the customer confirmed it on WhatsApp", async () => {
    await notifyCustomer(order({ phoneVerifiedAt: new Date() }), "placed");
    expect(notify.sendShopMessage).toHaveBeenCalled();
  });
});
