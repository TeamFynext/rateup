import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.API_URL = "https://api.test.example";
  process.env.SHOPIFY_API_KEY = "shopify-key";
  process.env.SHOPIFY_API_SECRET = "shopify-secret";
  process.env.SHOPIFY_SCOPES = "read_checkouts";
});

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    rule: { findMany: vi.fn() },
    integration: { findFirst: vi.fn() },
  },
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

import dayjs from "dayjs";
import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { checkAndExecuteRuleByTriggerEvent } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { triggerShopifyAbandonedCheckoutRules } from "./shopify.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { rule: Record<string, Mock>; integration: Record<string, Mock> };
const runRules = checkAndExecuteRuleByTriggerEvent as unknown as Mock;
// The real client, as the other Shopify tests load it; only the claim is stubbed.
const redisSet = vi.spyOn(redisConnection, "set") as unknown as Mock;

const ORG = "11111111-1111-1111-1111-111111111111";

function checkout(overrides: Record<string, unknown> = {}) {
  return {
    id: "gid://shopify/AbandonedCheckout/42",
    name: "#42",
    createdAt: dayjs().subtract(3, "hour").toISOString(),
    updatedAt: dayjs().subtract(2, "hour").toISOString(),
    completedAt: null,
    abandonedCheckoutUrl: "https://rateup.myshopify.com/checkouts/recover/42",
    discountCodes: [],
    totalPriceSet: { shopMoney: { amount: "499.00", currencyCode: "INR" } },
    subtotalPriceSet: { shopMoney: { amount: "499.00" } },
    customer: {
      firstName: "Asha",
      lastName: "K",
      defaultEmailAddress: { emailAddress: "asha@example.com" },
      defaultPhoneNumber: { phoneNumber: "+919400651372" },
      defaultAddress: null,
    },
    billingAddress: null,
    shippingAddress: { phone: null, city: "Kochi" },
    lineItems: {
      nodes: [{ title: "hotwheels", quantity: 1, product: { id: "gid://shopify/Product/7" } }],
    },
    ...overrides,
  };
}

function shopReturns(...nodes: unknown[]) {
  request.mockResolvedValue({
    data: { abandonedCheckouts: { nodes, pageInfo: { endCursor: null, hasNextPage: false } } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.rule.findMany.mockResolvedValue([{ orgId: ORG }]);
  db.integration.findFirst.mockResolvedValue({
    orgId: ORG,
    credential: { session: { shop: "rateup.myshopify.com" } },
  });
  redisSet.mockResolvedValue("OK");
  shopReturns(checkout());
});

describe("triggerShopifyAbandonedCheckoutRules", () => {
  test("runs the org's rules with the checkout reshaped for variable mapping", async () => {
    await triggerShopifyAbandonedCheckoutRules();

    expect(runRules).toHaveBeenCalledTimes(1);
    const [trigger, context] = runRules.mock.calls[0];
    expect(trigger).toBe("SHOPIFY_EVENT");
    expect(context).toMatchObject({
      orgId: ORG,
      phone: "+919400651372",
      shopifyEvent: "ABANDONED_CHECKOUTS",
      shopifyProductIds: ["gid://shopify/Product/7"],
      platform: "WHATSAPP",
      shopifyBody: {
        name: "#42",
        abandoned_checkout_url: "https://rateup.myshopify.com/checkouts/recover/42",
        total_price: "499.00",
        currency: "INR",
        customer: { first_name: "Asha", email: "asha@example.com" },
        shipping_address: { city: "Kochi" },
        line_items: [{ title: "hotwheels", product_id: "7" }],
      },
    });
  });

  test("asks Shopify only for checkouts touched inside the lookback window", async () => {
    await triggerShopifyAbandonedCheckoutRules();

    const { query } = request.mock.calls[0][1].variables;
    const since = dayjs(query.match(/'(.+)'/)[1]);
    expect(dayjs().diff(since, "hour")).toBe(24);
  });

  test("leaves a checkout alone while the buyer may still be on it", async () => {
    shopReturns(checkout({ updatedAt: dayjs().subtract(10, "minute").toISOString() }));

    await triggerShopifyAbandonedCheckoutRules();

    expect(runRules).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  test("skips completed checkouts and ones with no usable phone", async () => {
    shopReturns(
      checkout({ completedAt: dayjs().toISOString() }),
      checkout({
        id: "gid://shopify/AbandonedCheckout/43",
        customer: null,
        shippingAddress: null,
      }),
    );

    await triggerShopifyAbandonedCheckoutRules();

    expect(runRules).not.toHaveBeenCalled();
  });

  test("falls back to the shipping address phone", async () => {
    shopReturns(
      checkout({ customer: null, shippingAddress: { phone: "9400651372", city: "Kochi" } }),
    );

    await triggerShopifyAbandonedCheckoutRules();

    expect(runRules.mock.calls[0][1].phone).toBe("+919400651372");
  });

  test("fires once per checkout: an existing claim means it was already handled", async () => {
    redisSet.mockResolvedValue(null);

    await triggerShopifyAbandonedCheckoutRules();

    expect(redisSet).toHaveBeenCalledWith(
      `shopify:abandoned-checkout-rule:${ORG}:gid://shopify/AbandonedCheckout/42`,
      "1",
      "EX",
      expect.any(Number),
      "NX",
    );
    expect(runRules).not.toHaveBeenCalled();
  });

  test("does not call Shopify when no org has an abandoned-checkout rule", async () => {
    db.rule.findMany.mockResolvedValue([]);

    await triggerShopifyAbandonedCheckoutRules();

    expect(request).not.toHaveBeenCalled();
  });

  test("one store failing does not stop the next", async () => {
    const OTHER = "22222222-2222-2222-2222-222222222222";
    db.rule.findMany.mockResolvedValue([{ orgId: ORG }, { orgId: OTHER }]);
    request.mockRejectedValueOnce(new Error("401 Unauthorized"));

    await triggerShopifyAbandonedCheckoutRules();

    expect(runRules).toHaveBeenCalledTimes(1);
    expect(runRules.mock.calls[0][1].orgId).toBe(OTHER);
  });
});
