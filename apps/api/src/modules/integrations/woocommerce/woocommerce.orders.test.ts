import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

// A tiny Redis: enough of SET (with EX and GET) and DEL for the status claim.
const redis = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    store,
    set: vi.fn(async (key: string, value: string, ...args: unknown[]) => {
      const previous = store.get(key) ?? null;
      store.set(key, value);
      return args.includes("GET") ? previous : "OK";
    }),
    del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  };
});
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/prisma.js", () => ({ default: { integration: { update: vi.fn() } } }));
vi.mock("../../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));
const shopSync = vi.hoisted(() => ({ syncOrderFromStore: vi.fn() }));
vi.mock("../../commerce/shop/externalCheckout.service.js", () => shopSync);

import type { CommerceOrder, CommerceStore } from "../commerce/commerce.types.js";
import { wooCommerceCommerce } from "./woocommerce.commerce.js";
import {
  normaliseWooPhone,
  resolveWooPathValue,
  toCommerceOrder,
  wooTotals,
  type WooOrderPayload,
} from "./woocommerce.mapping.js";
import { claimStatusChange, handleWooOrder } from "./woocommerce.orders.js";
import type { WooCredential } from "./woocommerce.types.js";

const credential: WooCredential = {
  storeUrl: "https://shop.example.com",
  consumerKey: "ck",
  consumerSecret: "cs",
  webhookSecret: "secret",
  webhooks: [],
  store: { country: "IN:KL" },
  connectedAt: "2026-09-28T00:00:00.000Z",
};

const payload = (over: Partial<WooOrderPayload> = {}): WooOrderPayload => ({
  id: 901,
  number: "901",
  status: "processing",
  currency: "INR",
  total: "1250.50",
  date_modified_gmt: "2026-09-28T10:00:00",
  billing: {
    first_name: "Asha",
    last_name: "Nair",
    email: " asha@example.com ",
    phone: "098765 43210",
    country: "IN",
  },
  line_items: [
    { product_id: 77, name: "Tea", quantity: 2 },
    { product_id: 77, variation_id: 5, name: "Tea (large)", quantity: 1 },
    { product_id: 12, name: "Mug", quantity: 1 },
  ],
  coupon_lines: [{ code: "ru-abc123" }],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  redis.store.clear();
});

describe("a WooCommerce order, in commerce terms", () => {
  test("maps the status, the customer, the amount, the products and the coupons", () => {
    expect(toCommerceOrder(payload(), credential, "d-1")).toEqual({
      orderId: "901",
      status: "paid",
      eventKey: "processing",
      customer: { phone: "+919876543210", email: "asha@example.com" },
      amount: 1250.5,
      productIds: ["77", "12"],
      discountCodes: ["RU-ABC123"],
      deliveryId: "d-1",
      raw: payload(),
      rateupWriteBack: false,
    });
  });

  test("an order RateUp wrote back is marked, so its points are earned in RateUp only", () => {
    const meta_data = [
      { key: "rateup_order_id", value: "r-1" },
      { key: "rateup_writeback", value: "1" },
    ];
    expect(toCommerceOrder(payload({ meta_data }), credential, "d-1")?.rateupWriteBack).toBe(true);
  });

  test.each([
    ["pending", "created"],
    ["on-hold", "created"],
    ["processing", "paid"],
    ["completed", "fulfilled"],
    ["cancelled", "cancelled"],
    ["refunded", "refunded"],
    ["failed", "failed"],
  ])("%s → %s", (wooStatus, status) => {
    expect(toCommerceOrder(payload({ status: wooStatus }), credential, null)?.status).toBe(status);
  });

  test("a status no one listens for — a checkout draft, a plugin's own — is not an order event", () => {
    expect(toCommerceOrder(payload({ status: "checkout-draft" }), credential, null)).toBeNull();
    expect(toCommerceOrder(payload({ status: "awaiting-shipment" }), credential, null)).toBeNull();
  });

  test("a phone typed any way at checkout is sent as E.164, against the billing country first", () => {
    expect(normaliseWooPhone("098765 43210", ["IN"])).toBe("+919876543210");
    expect(normaliseWooPhone("(415) 555-2671", ["US", "IN"])).toBe("+14155552671");
    expect(normaliseWooPhone("98765 43210", [undefined, "IN"])).toBe("+919876543210");
    expect(normaliseWooPhone("not a phone", ["IN"])).toBe("not a phone");
    expect(normaliseWooPhone("  ", ["IN"])).toBeNull();
  });

  test("template variables read dot paths, plus the customer's name and the item list", () => {
    const raw = payload() as Record<string, unknown>;
    expect(resolveWooPathValue(raw, "billing.first_name")).toBe("Asha");
    expect(resolveWooPathValue(raw, "line_items.2.name")).toBe("Mug");
    expect(resolveWooPathValue(raw, "customer_name")).toBe("Asha Nair");
    expect(resolveWooPathValue(raw, "items")).toBe("Tea (x2), Tea (large) (x1), Mug (x1)");
    expect(resolveWooPathValue(raw, "billing")).toBe("");
    expect(resolveWooPathValue(raw, "nope.deeper")).toBe("");
  });
});

describe("acting once per status change", () => {
  test("the first delivery of a status acts; a repeat of it does not", async () => {
    expect(await claimStatusChange("int-1", "901", "processing", "2026-09-28T10:00:00")).toBeTypeOf(
      "function",
    );
    expect(await claimStatusChange("int-1", "901", "processing", "2026-09-28T10:00:05")).toBeNull();
    expect(await claimStatusChange("int-1", "901", "completed", "2026-09-29T09:00:00")).toBeTypeOf(
      "function",
    );
  });

  test("a late retry of an older update is stale, and leaves the newer status in place", async () => {
    await claimStatusChange("int-1", "901", "completed", "2026-09-29T09:00:00");

    expect(await claimStatusChange("int-1", "901", "processing", "2026-09-28T10:00:00")).toBeNull();
    expect(JSON.parse(redis.store.get("woo:order-status:int-1:901")!)).toMatchObject({
      status: "completed",
    });
  });

  test("releasing a claim lets the retry act", async () => {
    const release = await claimStatusChange("int-1", "901", "processing", undefined);
    await release!();

    expect(await claimStatusChange("int-1", "901", "processing", undefined)).toBeTypeOf("function");
  });
});

describe("an order delivery", () => {
  const integration = {
    id: "int-1",
    orgId: "org-1",
    name: "woocommerce",
    active: true,
    credential,
  } as never;

  test("goes through the commerce layer once, as WooCommerce's store", async () => {
    const onOrderEvent = vi.fn(async (_store: CommerceStore, _order: CommerceOrder) => {});
    const data = { deliveryId: "d-1", webhookId: "101", payload: payload() };

    await handleWooOrder(integration, data, { provider: wooCommerceCommerce, onOrderEvent });
    await handleWooOrder(
      integration,
      { ...data, deliveryId: "d-2" },
      {
        provider: wooCommerceCommerce,
        onOrderEvent,
      },
    );

    expect(onOrderEvent).toHaveBeenCalledTimes(1);
    const [store, order] = onOrderEvent.mock.calls[0];
    expect(store).toMatchObject({
      provider: wooCommerceCommerce,
      storeId: "https://shop.example.com",
      orgId: "org-1",
    });
    expect(order).toMatchObject({ orderId: "901", status: "paid", eventKey: "processing" });
  });

  test("a failure hands the status back, so WooCommerce's retry is not taken for a repeat", async () => {
    const onOrderEvent = vi
      .fn()
      .mockRejectedValueOnce(new Error("queue down"))
      .mockResolvedValueOnce(undefined);
    const data = { deliveryId: "d-1", webhookId: "101", payload: payload() };

    await expect(
      handleWooOrder(integration, data, { provider: wooCommerceCommerce, onOrderEvent }),
    ).rejects.toThrow("queue down");
    await handleWooOrder(integration, data, { provider: wooCommerceCommerce, onOrderEvent });

    expect(onOrderEvent).toHaveBeenCalledTimes(2);
  });
});

describe("WooCommerce as a commerce store", () => {
  test("hands its order statuses to the automation engine as WOOCOMMERCE_EVENT", async () => {
    const { checkAndExecuteRuleByTriggerEvent: spy } =
      await import("../../whatsapp/automatedReply/wa_automatedReply.utils.js");
    const order = toCommerceOrder(payload({ status: "completed" }), credential, null)!;

    await wooCommerceCommerce.runOrderAutomation!(
      { orgId: "org-1" } as never,
      order,
      "+919876543210",
    );

    expect(spy).toHaveBeenCalledWith("WOOCOMMERCE_EVENT", {
      orgId: "org-1",
      phone: "+919876543210",
      wooEvent: "completed",
      wooProductIds: ["77", "12"],
      wooBody: order.raw,
      platform: "WHATSAPP",
    });
  });

  test("earns points on completion, behind its own programme switch", () => {
    expect(wooCommerceCommerce.awardStatus).toBe("fulfilled");
    expect(wooCommerceCommerce.loyaltyEnabled({ enableShopifyOrderPoints: true })).toBe(false);
    expect(wooCommerceCommerce.loyaltyEnabled({ enableWooOrderPoints: true })).toBe(true);
  });
});

describe("an order RateUp sent to WooCommerce", () => {
  test("reads WooCommerce's breakdown, every part before tax so it adds up to the total", () => {
    expect(
      wooTotals({
        line_items: [{ subtotal: "40.00" }, { subtotal: "20.00" }],
        discount_total: "6.00",
        shipping_total: "5.00",
        total_tax: "5.90",
        total: "64.90",
      }),
    ).toEqual({ subtotal: 60, discountTotal: 6, shippingTotal: 5, taxTotal: 5.9, total: 64.9 });
  });

  const integration = { id: "int-2", orgId: "org-1", active: true, credential } as never;

  test("pays the RateUp order, then goes on as usual", async () => {
    const onOrderEvent = vi.fn(async () => {});
    const meta_data = [{ id: 1, key: "rateup_order_id", value: "rateup-order-1" }];
    await handleWooOrder(
      integration,
      { deliveryId: "d-3", webhookId: "101", payload: payload({ id: 902, meta_data }) },
      { provider: wooCommerceCommerce, onOrderEvent },
    );
    expect(shopSync.syncOrderFromStore).toHaveBeenCalledWith(
      "woocommerce",
      "org-1",
      "rateup-order-1",
      expect.objectContaining({
        status: "paid",
        externalOrderId: "902",
        totals: expect.objectContaining({ total: 1250.5 }),
        fulfillment: null,
        refund: null,
      }),
    );
    expect(onOrderEvent).toHaveBeenCalledTimes(1);
  });

  test("a cash order sitting in processing unpaid isn't taken for paid", async () => {
    const meta_data = [{ key: "rateup_order_id", value: "rateup-order-3" }];
    await handleWooOrder(
      integration,
      {
        deliveryId: "d-905",
        webhookId: "101",
        payload: payload({ id: 905, date_paid: null, meta_data }),
      },
      { provider: wooCommerceCommerce, onOrderEvent: vi.fn(async () => {}) },
    );
    expect(shopSync.syncOrderFromStore.mock.calls[0][3]).toMatchObject({ status: null });
  });

  test("completed is fulfilled; refunded is a refund", async () => {
    const meta_data = [{ key: "rateup_order_id", value: "rateup-order-4" }];
    for (const [id, status] of [
      [906, "completed"],
      [907, "refunded"],
    ] as const) {
      await handleWooOrder(
        integration,
        { deliveryId: `d-${id}`, webhookId: "101", payload: payload({ id, status, meta_data }) },
        { provider: wooCommerceCommerce, onOrderEvent: vi.fn(async () => {}) },
      );
    }
    expect(shopSync.syncOrderFromStore.mock.calls[0][3]).toMatchObject({
      fulfillment: "fulfilled",
    });
    expect(shopSync.syncOrderFromStore.mock.calls[1][3]).toMatchObject({ refund: "full" });
  });

  test("leaves the RateUp order waiting while pending or after a failed payment", async () => {
    const meta_data = [{ key: "rateup_order_id", value: "rateup-order-2" }];
    for (const [id, status] of [
      [903, "pending"],
      [904, "failed"],
    ] as const) {
      await handleWooOrder(
        integration,
        { deliveryId: `d-${id}`, webhookId: "101", payload: payload({ id, status, meta_data }) },
        { provider: wooCommerceCommerce, onOrderEvent: vi.fn(async () => {}) },
      );
    }
    for (const call of shopSync.syncOrderFromStore.mock.calls)
      expect(call[3]).toMatchObject({ status: null });
  });
});
