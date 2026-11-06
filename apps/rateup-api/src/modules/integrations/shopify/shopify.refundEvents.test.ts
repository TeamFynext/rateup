import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.API_URL = "https://api.test.example";
  process.env.SHOPIFY_API_KEY = "shopify-key";
  process.env.SHOPIFY_API_SECRET = "shopify-secret";
  process.env.SHOPIFY_SCOPES = "read_orders";
});

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { integration: { findFirst: vi.fn() } },
}));
vi.mock("./shopify.config.js", () => ({
  default: {
    clients: {
      Graphql: class {
        request = request;
      },
    },
  },
}));
vi.mock("./shopify.session.js", () => ({
  getActiveShopifySession: vi.fn(async () => ({ shop: "rateup.myshopify.com" })),
  saveShopifySession: vi.fn(),
  updateShopifySessionScope: vi.fn(),
}));
vi.mock("../../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));
// Leaves the service only calls at runtime, stubbed so the import graph stays cheap.
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({
  convertComponentForSenting: vi.fn(),
  updateButtonText: vi.fn(),
  wait: vi.fn(),
}));
vi.mock("../../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  createTemplateMessage: vi.fn(),
  validateSession: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  getDbTemplate: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.utils.js", () => ({
  getFlowIdFromTemplateComponents: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.auth.js", () => ({
  verifyTemplateMessageLimit: vi.fn(),
}));
vi.mock("../../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../../org/org.services.js", () => ({ pauseOrg: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { checkAndExecuteRuleByTriggerEvent } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { ShopifyEvents } from "../../../types/enums.js";
import { handleWebhook } from "./shopify.inbound.js";
import type { ShopifyWebhookJobData } from "./shopify.types.js";
import { defaultWebhookHandlers } from "./shopify.handler.js";
import { ShopifyOrderWebhookTopicEventMap } from "./shopify.util.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { integration: Record<string, Mock> };
const runRules = checkAndExecuteRuleByTriggerEvent as unknown as Mock;

const ORG = "11111111-1111-1111-1111-111111111111";
const SHOP = "rateup.myshopify.com";

function transaction(gateway: string, amount: string, overrides: Record<string, unknown> = {}) {
  return { kind: "refund", status: "success", gateway, amount, ...overrides };
}

// The shape of a real refunds/create payload (captured from a store credit refund).
function refundWebhook(transactions: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    topic: ShopifyEvents.REFUNDS_CREATE,
    webhookId: "wh-1",
    shop: SHOP,
    body: {
      id: 1111156818194,
      order_id: 18913332855058,
      note: "damaged in transit",
      created_at: "2026-09-29T10:24:13-04:00",
      transactions,
      refund_line_items: [
        { quantity: 1, line_item: { product_id: 10311944569106, title: "hotwheels" } },
      ],
      ...overrides,
    },
  } as unknown as ShopifyWebhookJobData;
}

function orderReturns(order: Record<string, unknown> | null) {
  request.mockResolvedValue({ data: { order } });
}

const ORDER = {
  name: "#1067",
  email: null,
  phone: "+919400651372",
  currencyCode: "INR",
  customer: {
    firstName: "abhinav",
    lastName: "viswam",
    defaultEmailAddress: null,
    defaultPhoneNumber: { phoneNumber: "+919400651372" },
    defaultAddress: { phone: null },
  },
  billingAddress: { phone: null, city: "kannur" },
  shippingAddress: { phone: null, city: "kannur" },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findFirst.mockResolvedValue({
    orgId: ORG,
    credential: { session: { shop: SHOP } },
  });
  orderReturns(ORDER);
});

describe("REFUNDS_CREATE registration", () => {
  test("is subscribed per shop and listed as a manageable webhook", () => {
    expect(defaultWebhookHandlers.REFUNDS_CREATE).toHaveLength(1);
    expect(ShopifyOrderWebhookTopicEventMap).toContainEqual({
      key: ShopifyEvents.REFUNDS_CREATE,
      value: "refunds/create",
    });
  });
});

describe("handleShopifyRefundEvent", () => {
  test("a store credit refund raises STORE_CREDIT_ISSUED with the order's customer", async () => {
    await handleWebhook(refundWebhook([transaction("shopify_store_credit", "1.00")]));

    expect(request.mock.calls[0][1].variables.id).toBe("gid://shopify/Order/18913332855058");
    expect(runRules).toHaveBeenCalledTimes(1);
    const [trigger, context] = runRules.mock.calls[0];
    expect(trigger).toBe("SHOPIFY_EVENT");
    expect(context).toMatchObject({
      orgId: ORG,
      phone: "919400651372",
      shopifyEvent: ShopifyEvents.STORE_CREDIT_ISSUED,
      shopifyProductIds: ["gid://shopify/Product/10311944569106"],
      platform: "WHATSAPP",
      shopifyBody: {
        name: "#1067",
        note: "damaged in transit",
        currency: "INR",
        refund_amount: "1.00",
        store_credit_amount: "1.00",
        customer: { first_name: "abhinav", last_name: "viswam" },
        line_items: [{ title: "hotwheels", quantity: 1 }],
      },
    });
  });

  test("a refund to the original payment method raises REFUNDS_CREATE only", async () => {
    await handleWebhook(refundWebhook([transaction("bogus", "250.00")]));

    expect(runRules).toHaveBeenCalledTimes(1);
    expect(runRules.mock.calls[0][1]).toMatchObject({
      shopifyEvent: ShopifyEvents.REFUNDS_CREATE,
      shopifyBody: { refund_amount: "250.00", store_credit_amount: "0.00" },
    });
  });

  test("a split refund raises both, each with only its own part", async () => {
    await handleWebhook(
      refundWebhook([
        transaction("bogus", "300.10"),
        transaction("shopify_store_credit", "199.95"),
        transaction("shopify_store_credit", "0.05"),
      ]),
    );

    const byEvent = Object.fromEntries(
      runRules.mock.calls.map(([, context]) => [
        context.shopifyEvent,
        context.shopifyBody.refund_amount,
      ]),
    );
    expect(byEvent).toEqual({
      [ShopifyEvents.REFUNDS_CREATE]: "300.10",
      [ShopifyEvents.STORE_CREDIT_ISSUED]: "200.00",
    });
  });

  test("ignores failed and non-refund transactions", async () => {
    await handleWebhook(
      refundWebhook([
        transaction("shopify_store_credit", "5.00", { status: "failure" }),
        transaction("bogus", "9.00", { kind: "sale" }),
      ]),
    );

    expect(request).not.toHaveBeenCalled();
    expect(runRules).not.toHaveBeenCalled();
  });

  test("a restock-only refund moves no money and messages nobody", async () => {
    await handleWebhook(refundWebhook([]));

    expect(request).not.toHaveBeenCalled();
    expect(runRules).not.toHaveBeenCalled();
  });

  test("falls back to the order and address phones when the customer has none", async () => {
    orderReturns({
      ...ORDER,
      phone: null,
      customer: { ...ORDER.customer, defaultPhoneNumber: null },
      shippingAddress: { phone: "+919999999999", city: "kannur" },
    });

    await handleWebhook(refundWebhook([transaction("shopify_store_credit", "1.00")]));

    expect(runRules.mock.calls[0][1].phone).toBe("919999999999");
  });

  test("adds the address country's code to a number typed without one", async () => {
    orderReturns({
      ...ORDER,
      phone: null,
      customer: { ...ORDER.customer, defaultPhoneNumber: null },
      shippingAddress: { phone: "99999 99999", city: "kannur", countryCodeV2: "IN" },
    });

    await handleWebhook(refundWebhook([transaction("shopify_store_credit", "1.00")]));

    // As Contact.phone stores it, so the existing contact is found, not a 10-digit twin.
    expect(runRules.mock.calls[0][1].phone).toBe("919999999999");
  });

  test("skips an order with no phone anywhere", async () => {
    orderReturns({
      ...ORDER,
      phone: null,
      customer: { ...ORDER.customer, defaultPhoneNumber: null },
    });

    await handleWebhook(refundWebhook([transaction("shopify_store_credit", "1.00")]));

    expect(runRules).not.toHaveBeenCalled();
  });

  test("skips a shop that is not connected", async () => {
    db.integration.findFirst.mockResolvedValue(null);

    await handleWebhook(refundWebhook([transaction("shopify_store_credit", "1.00")]));

    expect(request).not.toHaveBeenCalled();
    expect(runRules).not.toHaveBeenCalled();
  });
});
