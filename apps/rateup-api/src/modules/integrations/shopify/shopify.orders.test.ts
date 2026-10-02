import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The order webhook → WhatsApp survey path, end to end: which orders schedule a
 * survey, what the schedule records, what the delayed job sends, and what the
 * loyalty and automation paths are handed. Written against the Shopify-only
 * implementation before it moved onto the shared commerce layer, so these pin
 * the behaviour that move had to preserve.
 */

vi.hoisted(() => {
  process.env.API_URL = "https://api.test.example";
  process.env.SHOPIFY_API_KEY = "shopify-key";
  process.env.SHOPIFY_API_SECRET = "shopify-secret";
  process.env.SHOPIFY_SCOPES = "read_orders";
});

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    waMessage: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
  shopifySurveyQueue: { add: vi.fn() },
  shopifyLoyaltyQueue: { add: vi.fn() },
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/webhook.queue.js", () => ({
  shopifyLoyaltyQueue: { add: vi.fn() },
  shopifySurveyQueue: { add: vi.fn() },
}));
vi.mock("../integrations.service.js", () => ({
  getIntegrationByName: vi.fn(),
  updateIntegrationByName: vi.fn(),
}));
vi.mock("../../org/org.services.js", () => ({ pauseOrg: vi.fn() }));
vi.mock("./shopify.config.js", () => ({
  default: {
    config: { scopes: { equals: vi.fn(() => true) } },
    clients: { Graphql: class {}, Rest: class {} },
    webhooks: { addHandlers: vi.fn(), process: vi.fn() },
    auth: { begin: vi.fn(), callback: vi.fn() },
    utils: { sanitizeShop: vi.fn((s: string) => s) },
  },
}));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({
  convertComponentForSenting: vi.fn(),
  updateButtonText: vi.fn(),
  wait: vi.fn(),
}));
vi.mock("../../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  createTemplateMessage: vi.fn(),
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
vi.mock("../../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../../notification/notify.js", () => ({ notify: vi.fn() }));
// Loyalty's own decisions are covered in shopifyLoyalty.service.test.ts; here only
// what it is handed matters.
vi.mock("../../loyalty/accounts/account.service.js", () => ({ awardPoints: vi.fn() }));
vi.mock("../../loyalty/accounts/memberLookup.js", () => ({ resolveProgramMember: vi.fn() }));
vi.mock("../../loyalty/accounts/pointsReversal.service.js", () => ({
  reversePurchasePoints: vi.fn(),
}));
vi.mock("../../loyalty/program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
vi.mock("../../loyalty/redemptions/redemption.service.js", () => ({ applyRedemption: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { shopifySurveyQueue } from "../../../workers/bullmq/queues/index.js";
import { shopifyLoyaltyQueue } from "../../../workers/bullmq/queues/webhook.queue.js";
import { updateIntegrationByName } from "../integrations.service.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";
import { checkAndExecuteRuleByTriggerEvent } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { handleShopifyOrderEvents, processShopifySurveySchedule } from "./shopify.service.js";
import { ShopifyEvents } from "../../../types/enums.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ORG = "11111111-1111-1111-1111-111111111111";
const SHOP = "demo.myshopify.com";

function survey(over: Record<string, unknown> = {}) {
  return {
    event: ShopifyEvents.ORDERS_PAID,
    active: true,
    waTemplateId: "tpl-1",
    teamId: "team-1",
    timeDelay: 0,
    isProductSpecific: false,
    repeatInterval: { value: 0, unit: "hour" },
    variableMapping: [
      { templateParamIndex: 0, shopifyPath: "customer.first_name" },
      { templateParamIndex: 1, shopifyPath: "order_number" },
    ],
    schedules: [],
    ...over,
  };
}

function integration(surveys: unknown[] = [survey()]) {
  return {
    id: "int-1",
    orgId: ORG,
    name: "shopify",
    active: true,
    credential: { session: { shop: SHOP, accessToken: "t" }, shopifySurveys: surveys },
    org: { id: ORG },
  };
}

function webhook(over: Record<string, unknown> = {}, topic = ShopifyEvents.ORDERS_PAID) {
  return {
    webhookId: "wh-1",
    shop: SHOP,
    topic,
    body: {
      id: 5551,
      order_number: 1042,
      total_price: "4000.00",
      customer: { phone: "+919000000001", email: "ann@example.com", first_name: "Ann" },
      line_items: [{ product_id: 77, title: "Mug", quantity: 1 }],
      discount_codes: [{ code: "RU-ABC" }],
      ...over,
    },
  } as never;
}

/** The surveys as the last credential write left them. */
function writtenSurveys() {
  const call = (updateIntegrationByName as unknown as Mock).mock.calls.at(-1);
  return call?.[2]?.credential?.shopifySurveys;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findFirst.mockResolvedValue(integration());
  db.waMessage.findFirst.mockResolvedValue({ waCreatedAt: new Date("2026-09-26T10:00:00Z") });
});

describe("an order webhook", () => {
  test("hands loyalty the order's facts, keyed on the order", async () => {
    await handleShopifyOrderEvents(webhook());

    // The job id — the dedupe key — is exactly what it was before the commerce
    // layer; the payload now names the store and the order's status.
    expect(shopifyLoyaltyQueue.add).toHaveBeenCalledWith(
      "order-loyalty",
      expect.objectContaining({
        provider: "shopify",
        storeId: SHOP,
        status: "paid",
        eventKey: ShopifyEvents.ORDERS_PAID,
        orgId: ORG,
        orderId: "5551",
        phone: "+919000000001",
        email: "ann@example.com",
        amount: 4000,
        discountCodes: ["RU-ABC"],
      }),
      expect.objectContaining({ jobId: `loyalty-${SHOP}-${ShopifyEvents.ORDERS_PAID}-5551` }),
    );
  });

  test("runs the Shopify automation rules with the topic, products and body", async () => {
    await handleShopifyOrderEvents(webhook());

    expect(checkAndExecuteRuleByTriggerEvent).toHaveBeenCalledWith("SHOPIFY_EVENT", {
      orgId: ORG,
      phone: "919000000001",
      shopifyEvent: ShopifyEvents.ORDERS_PAID,
      shopifyProductIds: ["gid://shopify/Product/77"],
      shopifyBody: expect.objectContaining({ id: 5551 }),
      platform: "WHATSAPP",
    });
  });

  test("an unknown shop does nothing at all", async () => {
    db.integration.findFirst.mockResolvedValue(null);

    await handleShopifyOrderEvents(webhook());

    expect(shopifyLoyaltyQueue.add).not.toHaveBeenCalled();
    expect(updateIntegrationByName).not.toHaveBeenCalled();
    expect(checkAndExecuteRuleByTriggerEvent).not.toHaveBeenCalled();
  });
});

describe("the order.* integration event", () => {
  test("tells integrations about the order, without the raw payload", async () => {
    const { integrationTriggerQueue } = await import("../../../workers/bullmq/queues/index.js");

    await handleShopifyOrderEvents(webhook());

    expect(integrationTriggerQueue.add).toHaveBeenCalledWith("integration-event", {
      orgId: ORG,
      event: {
        type: "order.paid",
        order: {
          provider: "shopify",
          storeId: SHOP,
          orderId: "5551",
          status: "paid",
          customer: { phone: "+919000000001", email: "ann@example.com" },
          amount: 4000,
          productIds: ["gid://shopify/Product/77"],
        },
      },
    });
  });

  test("is sent for an order with no phone too", async () => {
    const { integrationTriggerQueue } = await import("../../../workers/bullmq/queues/index.js");

    await handleShopifyOrderEvents(webhook({ customer: { email: "a@b.c" } }));

    expect(integrationTriggerQueue.add).toHaveBeenCalled();
    expect(checkAndExecuteRuleByTriggerEvent).not.toHaveBeenCalled();
  });
});

describe("scheduling a survey", () => {
  test("records the schedule on the survey and queues the send", async () => {
    await handleShopifyOrderEvents(webhook());

    const [written] = writtenSurveys();
    expect(written.schedules).toHaveLength(1);
    const schedule = written.schedules[0];
    expect(schedule).toMatchObject({
      phone: "919000000001",
      webhookId: "wh-1",
      status: "SCHEDULED",
      actionStatus: null,
      apiStatus: null,
      body: expect.objectContaining({ id: 5551 }),
    });
    expect(schedule.history).toHaveLength(1);
    expect((updateIntegrationByName as unknown as Mock).mock.calls[0].slice(0, 2)).toEqual([
      ORG,
      "shopify",
    ]);
    expect(shopifySurveyQueue.add).toHaveBeenCalledWith(
      "process-survey",
      {
        orgId: ORG,
        integrationId: "int-1",
        event: ShopifyEvents.ORDERS_PAID,
        scheduleId: schedule.scheduleId,
      },
      { delay: expect.any(Number), jobId: schedule.scheduleId },
    );
  });

  test("keeps the rest of the credential — the session above all — when it writes", async () => {
    await handleShopifyOrderEvents(webhook());

    const call = (updateIntegrationByName as unknown as Mock).mock.calls[0];
    expect(call[2].credential.session).toEqual({ shop: SHOP, accessToken: "t" });
  });

  test("a survey with no template records the schedule but sends nothing", async () => {
    db.integration.findFirst.mockResolvedValue(integration([survey({ waTemplateId: undefined })]));

    await handleShopifyOrderEvents(webhook());

    expect(writtenSurveys()[0].schedules[0].status).toBe(null);
    expect(shopifySurveyQueue.add).not.toHaveBeenCalled();
  });

  test("a redelivered webhook is scheduled once", async () => {
    db.integration.findFirst.mockResolvedValue(
      integration([survey({ schedules: [{ webhookId: "wh-1", history: [] }] })]),
    );

    await handleShopifyOrderEvents(webhook());

    expect(updateIntegrationByName).not.toHaveBeenCalled();
    expect(shopifySurveyQueue.add).not.toHaveBeenCalled();
  });

  test("only the survey for this topic, and only while it is on", async () => {
    db.integration.findFirst.mockResolvedValue(
      integration([
        survey({ event: ShopifyEvents.ORDERS_CREATE }),
        survey({ event: ShopifyEvents.ORDERS_PAID, active: false }),
      ]),
    );

    await handleShopifyOrderEvents(webhook());

    expect(updateIntegrationByName).not.toHaveBeenCalled();
  });

  test("a product-specific survey fires only for an order containing that product", async () => {
    db.integration.findFirst.mockResolvedValue(
      integration([survey({ isProductSpecific: true, productId: "gid://shopify/Product/99" })]),
    );
    await handleShopifyOrderEvents(webhook());
    expect(updateIntegrationByName).not.toHaveBeenCalled();

    db.integration.findFirst.mockResolvedValue(
      integration([survey({ isProductSpecific: true, productId: "gid://shopify/Product/77" })]),
    );
    await handleShopifyOrderEvents(webhook());
    expect(updateIntegrationByName).toHaveBeenCalled();
  });

  test("an unparseable phone schedules nothing", async () => {
    await handleShopifyOrderEvents(webhook({ customer: { phone: "12", email: "a@b.c" } }));

    expect(updateIntegrationByName).not.toHaveBeenCalled();
  });

  test("the delay counts from now by the survey's timeDelay", async () => {
    db.integration.findFirst.mockResolvedValue(integration([survey({ timeDelay: 60 })]));

    await handleShopifyOrderEvents(webhook());

    const delay = (shopifySurveyQueue.add as Mock).mock.calls[0][2].delay;
    expect(delay).toBeGreaterThan(0);
  });
});

describe("sending a scheduled survey", () => {
  const scheduled = (over: Record<string, unknown> = {}) => ({
    scheduleId: "sch-1",
    scheduledAt: "2026-09-26T09:00:00.000Z",
    phone: "919000000001",
    status: "SCHEDULED",
    history: [
      { scheduleId: "sch-1", scheduledAt: "2026-09-26T09:00:00.000Z", status: "SCHEDULED" },
    ],
    body: { order_number: 1042, customer: { first_name: "Ann" } },
    ...over,
  });
  const job = {
    orgId: ORG,
    integrationId: "int-1",
    event: ShopifyEvents.ORDERS_PAID,
    scheduleId: "sch-1",
  };

  test("sends the template with the mapped variables and records it sent", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([survey({ schedules: [scheduled()] })]),
    );
    (sendTemplateToUserCore as Mock).mockResolvedValue({ status: true, message: "wamid.1" });

    await processShopifySurveySchedule(job);

    expect(sendTemplateToUserCore).toHaveBeenCalledWith(
      ORG,
      "tpl-1",
      "919000000001",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Ann" },
            { type: "text", text: "1042" },
          ],
        },
      ],
      "team-1",
    );
    const sent = writtenSurveys()[0].schedules[0];
    expect(sent.status).toBe("SENT");
    expect(sent.sentAt).toEqual(new Date("2026-09-26T10:00:00Z"));
    expect(sent.history[0].status).toBe("SENT");
  });

  test("a refused send is recorded as failed, with the reason", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([survey({ schedules: [scheduled()] })]),
    );
    (sendTemplateToUserCore as Mock).mockResolvedValue({ status: false, message: "limit" });

    await processShopifySurveySchedule(job);

    expect(writtenSurveys()[0].schedules[0].status).toBe("FAILED: limit ");
  });

  test("a send that throws is recorded as failed rather than lost", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([survey({ schedules: [scheduled()] })]),
    );
    (sendTemplateToUserCore as Mock).mockRejectedValue(new Error("meta down"));

    await processShopifySurveySchedule(job);

    expect(writtenSurveys()[0].schedules[0].status).toBe("FAILED: meta down ");
  });

  test("a schedule already handled is never sent twice", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([survey({ schedules: [scheduled({ status: "SENT" })] })]),
    );

    await processShopifySurveySchedule(job);

    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
    expect(updateIntegrationByName).not.toHaveBeenCalled();
  });

  test("a survey switched off since scheduling sends nothing", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([survey({ active: false, schedules: [scheduled()] })]),
    );

    await processShopifySurveySchedule(job);

    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
  });
});
