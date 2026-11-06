import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findMany: vi.fn() },
    waTemplate: { findFirst: vi.fn() },
    rule: { findUnique: vi.fn(), create: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));
vi.mock("../../integrations/shopify/shopify.config.js", () => ({
  default: { clients: { Graphql: vi.fn(function () {}) } },
}));
vi.mock("../../integrations/shopify/shopify.handler.js", () => ({
  defaultWebhookHandlers: { ORDERS_CREATE: [], CHECKOUTS_CREATE: [], CHECKOUTS_UPDATE: [] },
}));
vi.mock("../../integrations/shopify/shopify.session.js", () => ({
  getActiveShopifySession: vi.fn(async () => ({ shop: "store.myshopify.com" })),
}));
vi.mock("../../integrations/shopify/shopify.webhooks.js", () => ({
  getManagableWebhooks: vi.fn(async () => [{ id: "w1", topic: "ORDERS_CREATE" }]),
  registerShopifyWebhook: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { registerShopifyWebhook } from "../../integrations/shopify/shopify.webhooks.js";
import { runTask } from "../task.js";
import { migrateShopifyAbandonedCheckouts } from "./migrateShopifyAbandonedCheckouts.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: Record<string, Mock>;
  waTemplate: Record<string, Mock>;
  rule: Record<string, Mock>;
  $executeRaw: Mock;
};

function integration(surveys: unknown[]) {
  return {
    id: "int-1",
    orgId: "org-1",
    credential: { session: { shop: "store.myshopify.com" }, shopifySurveys: surveys },
  };
}

const legacy = {
  event: "ABANDONED_CHECKOUTS",
  active: true,
  waTemplateId: "tpl-1",
  timeDelay: 30,
  repeatInterval: { value: 1, unit: "day" },
  variableMapping: [{ templateParamIndex: 0, shopifyPath: "abandoned_checkout_url" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findMany.mockResolvedValue([integration([legacy])]);
  db.waTemplate.findFirst.mockResolvedValue({ whatsappSettingsPhoneId: "phone-1" });
  db.rule.findUnique.mockResolvedValue(null);
});

describe("migrateShopifyAbandonedCheckouts", () => {
  test("a preview reports the missing topics and rules, and writes nothing", async () => {
    const result = await runTask(migrateShopifyAbandonedCheckouts, false);

    expect(result.lines).toContain(
      "[dry-run] store.myshopify.com: would subscribe to CHECKOUTS_CREATE, CHECKOUTS_UPDATE",
    );
    expect(result.details).toMatchObject({
      shopsNeedingTopics: 1,
      rules: 2,
      settingsSwitchedOff: 1,
    });
    expect(registerShopifyWebhook).not.toHaveBeenCalled();
    expect(db.rule.create).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  test("applying subscribes the shop, creates the reminder and follow-up rules, and switches the setting off", async () => {
    await runTask(migrateShopifyAbandonedCheckouts, true);

    expect(registerShopifyWebhook).toHaveBeenCalledOnce();
    const created = db.rule.create.mock.calls.map((c) => c[0].data);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({
      orgId: "org-1",
      name: "Abandoned checkout reminder",
      triggerEvent: "SHOPIFY_EVENT",
      whatsappSettingsPhoneIds: ["phone-1"],
      options: {
        shopifyEvent: "ABANDONED_CHECKOUTS",
        abandonedCheckoutDelayMinutes: 30,
        requireMarketingConsent: false,
      },
      actions: {
        create: {
          type: "SEND_TEMPLATE",
          value: { templateId: "tpl-1", variableMapping: legacy.variableMapping },
        },
      },
    });
    // 30 minutes plus the one-day repeat.
    expect(created[1].options.abandonedCheckoutDelayMinutes).toBe(30 + 24 * 60);
    expect(db.$executeRaw).toHaveBeenCalledOnce();
  });

  test("re-running leaves existing rules alone and skips a switched-off setting", async () => {
    db.rule.findUnique.mockResolvedValue({ id: "rule-1" });
    await runTask(migrateShopifyAbandonedCheckouts, true);
    expect(db.rule.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    db.integration.findMany.mockResolvedValue([integration([{ ...legacy, active: false }])]);
    const result = await runTask(migrateShopifyAbandonedCheckouts, true);
    expect(result.details).toMatchObject({ rules: 0, settingsSwitchedOff: 0 });
  });

  test("a store whose subscription fails is reported, and the others still run", async () => {
    (registerShopifyWebhook as Mock).mockRejectedValueOnce(new Error("scope denied"));

    const result = await runTask(migrateShopifyAbandonedCheckouts, true);

    expect(result.summary).toContain("1 subscription failure(s)");
    expect(db.rule.create).toHaveBeenCalled();
  });
});
