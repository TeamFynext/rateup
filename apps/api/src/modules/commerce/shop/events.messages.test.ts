import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({
  disarmShopReminders: vi.fn(),
  enqueueAdConversion: vi.fn(),
  enqueueInvoice: vi.fn(),
  enqueueStoreWriteBack: vi.fn(),
}));
vi.mock("../../meta/shared/metaMessage.service.js", () => ({ sendMetaMessage: vi.fn() }));
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => ({
  findOpenSession: vi.fn(),
}));
vi.mock("../../meta/whatsapp/templates/templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));

const { customerMessage } = await import("./events.js");

const order = (over: Record<string, unknown> = {}, store: Record<string, unknown> = {}) =>
  ({
    id: "o1",
    number: 1001,
    currency: "USD",
    total: "20",
    customerName: "Ana Silva",
    paymentStatus: "PAID",
    paymentMethod: "card",
    checkoutToken: null,
    cancelReason: null,
    shipments: [],
    items: [],
    shippingAddress: null,
    store: {
      name: "Shop",
      notifications: null,
      codConfirm: false,
      codPrepaidDiscountPct: null,
      bankDetails: null,
      ...store,
    },
    ...over,
  }) as never;

describe("which message an order event becomes", () => {
  test("a placed order depends on how it is paid", () => {
    expect(customerMessage(order({ paymentStatus: "COD_PENDING" }), "placed")?.key).toBe("placed");
    expect(
      customerMessage(order({ paymentStatus: "COD_PENDING" }, { codConfirm: true }), "placed")?.key,
    ).toBe("cod_confirm");
    expect(
      customerMessage(order({ paymentStatus: "PENDING", paymentMethod: "bank" }), "placed")?.key,
    ).toBe("bank_transfer");
    expect(customerMessage(order(), "placed")).toBeNull();
  });

  test("a confirmed cash order has its own message", () => {
    expect(customerMessage(order(), "cod_confirmed")?.key).toBe("cod_confirmed");
  });
});

describe("what the customer reads", () => {
  test("the default words, unchanged from before the catalog", () => {
    const shipped = order({ shipments: [{ carrier: "DHL", trackingUrl: "https://t.test/1" }] });
    expect(customerMessage(shipped, "shipped")?.message).toMatchObject({
      text: "Your order #1001 is on its way. Carrier: DHL.",
      cta: { label: "Track parcel", url: "https://t.test/1" },
      templateParams: ["Ana", "#1001", "$20.00", "https://t.test/1", "DHL", "", ""],
    });
    expect(customerMessage(order({ cancelReason: null }), "cancelled")?.message.text).toBe(
      "Order #1001 has been cancelled.",
    );
  });

  test("the store's own words", () => {
    const o = order({}, { notifications: { delivered: { body: "Enjoy it, {{1}}! ({{2}})" } } });
    expect(customerMessage(o, "delivered")?.message.text).toBe("Enjoy it, Ana! (#1001)");
  });

  test("a cash confirmation keeps its buttons with custom words", () => {
    const o = order(
      { paymentStatus: "COD_PENDING" },
      { codConfirm: true, notifications: { cod_confirm: { body: "Confirm {{2}}?" } } },
    );
    const message = customerMessage(o, "placed")?.message;
    expect(message?.text).toBe("Confirm #1001?");
    expect(message?.buttons?.map((b) => b.id)).toEqual([
      "shop_cod_confirm:o1",
      "shop_cod_cancel:o1",
    ]);
  });

  test("bank details, with instructions only when there are some", () => {
    const o = order(
      { paymentStatus: "PENDING", paymentMethod: "bank" },
      { bankDetails: { accountName: "Shop Ltd", accountNumber: "123" } },
    );
    expect(customerMessage(o, "placed")?.message.text).toBe(
      "Order #1001 is reserved. Please transfer $20.00 to:\nAccount name: Shop Ltd\nAccount number: 123\n\nUse #1001 as the reference.",
    );
  });
});
