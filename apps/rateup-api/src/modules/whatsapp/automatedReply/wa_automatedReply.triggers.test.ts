import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    rule: { findMany: vi.fn() },
    businessHour: { findUnique: vi.fn() },
    waAutomatedReply: { count: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { exists: vi.fn(async () => 0), set: vi.fn() },
  integrationTriggerQueue: { add: vi.fn() },
  notificationQueue: { add: vi.fn() },
  sendMessageQueue: { add: vi.fn() },
}));

vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({ assignChat: vi.fn() }));
vi.mock("../whatsappSurvey/automation-logger.utils.js", () => ({
  findRecentAutomation: vi.fn(),
  logAutomationAction: vi.fn(),
}));
vi.mock("../../contact/contact.service.js", () => ({
  getContactByPhoneNumberAndOrgId: vi.fn(),
  getOrCreateContactByPhone: vi.fn(),
  updateContactById: vi.fn(),
}));
vi.mock("../messageTemplates/wa_templates.service.js", () => ({ templateData: {} }));
vi.mock("../messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../../team/team.service.js", () => ({ getTeamIdsByUserId: vi.fn() }));
vi.mock("../inbox/message/wamessage.service.js", () => ({ assignWaMessageToUser: vi.fn() }));
vi.mock("../../user/user.service.js", () => ({ getUserIdsByTeamId: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({ sendTextMessage: vi.fn() }));
vi.mock("../flows/flow.service.js", () => ({ sendFlow: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.controller.js", () => ({ processNextNode: vi.fn() }));
vi.mock("../instagram/instagram_messaging.service.js", () => ({
  sendInstagramTextMessage: vi.fn(),
}));
vi.mock("./instagram_automation.service.js", () => ({ startInstagramAutomationFlow: vi.fn() }));
vi.mock("./instagram_automatedReply.service.js", () => ({
  getInstagramAutomatedReplyById: vi.fn(),
}));
vi.mock("../../integrations/shopify/shopify.service.js", () => ({
  resolveShopifyPathValue: vi.fn(),
  getShopifyProductImage: vi.fn(),
}));
vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../../integrations/meta/conversions.service.js", () => ({
  triggerConversionsApiForContact: vi.fn(),
}));
vi.mock("../../integrations/external/zoho/zoho.service.js", () => ({
  updateZohoLeadQueue: { add: vi.fn() },
  ZohoTriggers: {},
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { TriggerEvent } from "../../../../generated/prisma/enums.js";
import { checkAndExecuteRuleByTriggerEvent } from "./wa_automatedReply.utils.js";

// No dayjs.extend here on purpose — see wa_automatedReply.utils.test.ts.
type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  rule: { findMany: Mock };
  businessHour: { findUnique: Mock };
};
const redis = redisConnection as unknown as { exists: Mock; set: Mock };

/**
 * A rule that matches on its own: a non-message trigger with no conditions is
 * treated as an unconditional match, which keeps these tests about rule *selection*
 * rather than condition evaluation.
 */
function rule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    name: "Rule one",
    platform: "WHATSAPP",
    operator: "AND",
    isActive: true,
    triggerEvent: TriggerEvent.CHAT_CLOSED,
    whatsappSettingsPhoneIds: [],
    options: null,
    groups: [],
    actions: [],
    ...overrides,
  } as any;
}

/** A rule carrying a business-hours option, which gives it evaluation priority. */
function businessHourRule(overrides: Record<string, unknown> = {}) {
  return rule({
    id: "rule-bh",
    name: "Business hours rule",
    options: { businessHours: { enabled: true, businessHoursId: "bh-1" } },
    ...overrides,
  });
}

/** A rule whose message-body condition is the catch-all wildcard. */
function wildcardRule(overrides: Record<string, unknown> = {}) {
  return rule({
    id: "rule-wild",
    name: "Wildcard rule",
    triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
    groups: [
      {
        id: "g",
        operator: "AND",
        conditions: [{ id: "c", field: "MESSAGE_BODY", operator: "EQUALS", value: "*" }],
      },
    ],
    ...overrides,
  });
}

const context = (overrides: Record<string, unknown> = {}) => ({
  orgId: "org-1",
  platform: "WHATSAPP" as const,
  phone: "15550001",
  message: "hello",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.rule.findMany.mockResolvedValue([]);
  db.businessHour.findUnique.mockResolvedValue(null);
  redis.exists.mockResolvedValue(0);
  redis.set.mockResolvedValue("OK");
});

describe("checkAndExecuteRuleByTriggerEvent - finding candidate rules", () => {
  test("asks only for the org's active rules on this trigger", async () => {
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(db.rule.findMany.mock.calls[0][0].where).toMatchObject({
      orgId: "org-1",
      isActive: true,
      triggerEvent: TriggerEvent.CHAT_CLOSED,
      platform: "WHATSAPP",
    });
  });

  test("does not narrow by platform when asked for all of them", async () => {
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context({ platform: "ALL" }));

    expect(db.rule.findMany.mock.calls[0][0].where).not.toHaveProperty("platform");
  });

  test("narrows to rules attached to the receiving number", async () => {
    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.CHAT_CLOSED,
      context({ phoneNumberId: "phone-1" }),
    );

    expect(db.rule.findMany.mock.calls[0][0].where.whatsappSettingsPhoneIds).toEqual({
      has: "phone-1",
    });
  });

  test("does not filter by number when the event carries none", async () => {
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(db.rule.findMany.mock.calls[0][0].where).not.toHaveProperty("whatsappSettingsPhoneIds");
  });

  test("reports nothing when the org has no rules for the trigger", async () => {
    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context()),
    ).resolves.toBeUndefined();
  });

  test("reports nothing when no rule's conditions match", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
        groups: [
          {
            id: "g",
            operator: "AND",
            conditions: [{ id: "c", field: "MESSAGE_BODY", operator: "CONTAINS", value: "refund" }],
          },
        ],
      }),
    ]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.MESSAGE_RECEIVED, context()),
    ).resolves.toBeUndefined();
  });

  test("returns the matched rule alongside what it executed", async () => {
    db.rule.findMany.mockResolvedValue([rule()]);

    const result = await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(result?.rule.id).toBe("rule-1");
    expect(result?.executedActions).toEqual([]);
  });

  test("stops at the first rule that matches", async () => {
    db.rule.findMany.mockResolvedValue([rule({ id: "first" }), rule({ id: "second" })]);

    const result = await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(result?.rule.id).toBe("first");
  });
});

describe("checkAndExecuteRuleByTriggerEvent - which rule wins", () => {
  test("prefers a business-hours rule over an always-on one", async () => {
    db.rule.findMany.mockResolvedValue([rule({ id: "plain" }), businessHourRule()]);

    const result = await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(result?.rule.id).toBe("rule-bh");
  });

  test("falls back to the always-on rule when the business-hours one is shut", async () => {
    db.rule.findMany.mockResolvedValue([rule({ id: "plain" }), businessHourRule()]);
    // A schedule that is closed today makes the business-hours rule fail its gate.
    db.businessHour.findUnique.mockResolvedValue({
      timezone: "UTC",
      schedule: { monday: { isOpen: false, timeSlots: [] } },
    });

    const result = await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(result?.rule.id).toBe("plain");
  });

  // A wildcard rule is the catch-all, so it must never beat a rule that names a keyword.
  test("prefers a keyword rule over a wildcard one", async () => {
    db.rule.findMany.mockResolvedValue([
      wildcardRule(),
      rule({
        id: "keyword",
        triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
        groups: [
          {
            id: "g",
            operator: "AND",
            conditions: [{ id: "c", field: "MESSAGE_BODY", operator: "CONTAINS", value: "hello" }],
          },
        ],
      }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      context(),
    );

    expect(result?.rule.id).toBe("keyword");
  });

  test("falls back to the wildcard rule when no keyword rule matches", async () => {
    db.rule.findMany.mockResolvedValue([
      wildcardRule(),
      rule({
        id: "keyword",
        triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
        groups: [
          {
            id: "g",
            operator: "AND",
            conditions: [{ id: "c", field: "MESSAGE_BODY", operator: "CONTAINS", value: "refund" }],
          },
        ],
      }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      context(),
    );

    expect(result?.rule.id).toBe("rule-wild");
  });
});

describe("checkAndExecuteRuleByTriggerEvent - the once-a-day stamp", () => {
  test("remembers for a day that the rule fired for this contact", async () => {
    db.rule.findMany.mockResolvedValue([rule({ options: { sendOncePerDay: true } })]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(redis.set).toHaveBeenCalledWith(
      "rule:rule-1:sendOncePerDay:15550001",
      "1",
      "EX",
      24 * 60 * 60,
    );
  });

  test("stamps nothing for a rule without the option", async () => {
    db.rule.findMany.mockResolvedValue([rule()]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(redis.set).not.toHaveBeenCalled();
  });

  test("stamps nothing when there is no contact to remember", async () => {
    db.rule.findMany.mockResolvedValue([rule({ options: { sendOncePerDay: true } })]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.CHAT_CLOSED,
      context({ phone: undefined }),
    );

    expect(redis.set).not.toHaveBeenCalled();
  });

  test("skips a rule that already fired for this contact today", async () => {
    redis.exists.mockResolvedValue(1);
    db.rule.findMany.mockResolvedValue([rule({ options: { sendOncePerDay: true } })]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context()),
    ).resolves.toBeUndefined();
  });
});

describe("checkAndExecuteRuleByTriggerEvent - Shopify events", () => {
  const shopifyRule = (options: Record<string, unknown>) =>
    rule({ triggerEvent: TriggerEvent.SHOPIFY_EVENT, options });

  test("only fires a rule watching the event that happened", async () => {
    db.rule.findMany.mockResolvedValue([shopifyRule({ shopifyEvent: "ORDERS_CREATE" })]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.SHOPIFY_EVENT,
      context({ shopifyEvent: "ORDERS_CREATE" }),
    );

    expect(result?.rule.id).toBe("rule-1");
  });

  test("ignores a rule watching a different Shopify event", async () => {
    db.rule.findMany.mockResolvedValue([shopifyRule({ shopifyEvent: "ORDERS_CREATE" })]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.SHOPIFY_EVENT,
        context({ shopifyEvent: "ORDERS_CANCELLED" }),
      ),
    ).resolves.toBeUndefined();
  });

  test("fires for any product when the rule names none", async () => {
    db.rule.findMany.mockResolvedValue([shopifyRule({ shopifyEvent: "ORDERS_CREATE" })]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.SHOPIFY_EVENT,
      context({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["p-1"] }),
    );

    expect(result).toBeDefined();
  });

  test("fires when the order contains one of the rule's products", async () => {
    db.rule.findMany.mockResolvedValue([
      shopifyRule({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["p-1", "p-2"] }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.SHOPIFY_EVENT,
      context({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["p-2"] }),
    );

    expect(result).toBeDefined();
  });

  // Shopify ids arrive as numbers in webhooks but are configured as strings.
  test("matches a numeric product id against a configured string one", async () => {
    db.rule.findMany.mockResolvedValue([
      shopifyRule({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: [12345] }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.SHOPIFY_EVENT,
      context({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["12345"] }),
    );

    expect(result).toBeDefined();
  });

  test("stays quiet when the order has none of the rule's products", async () => {
    db.rule.findMany.mockResolvedValue([
      shopifyRule({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["p-1"] }),
    ]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.SHOPIFY_EVENT,
        context({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["p-9"] }),
      ),
    ).resolves.toBeUndefined();
  });

  test("stays quiet when the event names no products at all", async () => {
    db.rule.findMany.mockResolvedValue([
      shopifyRule({ shopifyEvent: "ORDERS_CREATE", shopifyProductIds: ["p-1"] }),
    ]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.SHOPIFY_EVENT,
        context({ shopifyEvent: "ORDERS_CREATE" }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("checkAndExecuteRuleByTriggerEvent - Instagram events", () => {
  const commentRule = (options: Record<string, unknown> | null = null) =>
    rule({ triggerEvent: TriggerEvent.INSTAGRAM_COMMENT, platform: "INSTAGRAM", options });

  test("replies to a comment on any post by default", async () => {
    db.rule.findMany.mockResolvedValue([commentRule()]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_COMMENT,
      context({ platform: "INSTAGRAM", instagramMediaId: "media-1" }),
    );

    expect(result).toBeDefined();
  });

  test("replies only on the posts a scoped rule names", async () => {
    db.rule.findMany.mockResolvedValue([
      commentRule({ instagramScope: "SPECIFIC", instagramPostIds: ["media-1"] }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_COMMENT,
      context({ platform: "INSTAGRAM", instagramMediaId: "media-1" }),
    );

    expect(result).toBeDefined();
  });

  test("stays quiet on a post a scoped rule does not name", async () => {
    db.rule.findMany.mockResolvedValue([
      commentRule({ instagramScope: "SPECIFIC", instagramPostIds: ["media-1"] }),
    ]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.INSTAGRAM_COMMENT,
        context({ platform: "INSTAGRAM", instagramMediaId: "media-9" }),
      ),
    ).resolves.toBeUndefined();
  });

  test("stays quiet when a scoped rule names no posts at all", async () => {
    db.rule.findMany.mockResolvedValue([
      commentRule({ instagramScope: "SPECIFIC", instagramPostIds: [] }),
    ]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.INSTAGRAM_COMMENT,
        context({ platform: "INSTAGRAM", instagramMediaId: "media-1" }),
      ),
    ).resolves.toBeUndefined();
  });

  // Story mentions carry no text worth matching, so they bypass condition checks.
  test("always answers a story mention, conditions or not", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.INSTAGRAM_STORY_MENTION,
        platform: "INSTAGRAM",
        groups: [
          {
            id: "g",
            operator: "AND",
            conditions: [
              { id: "c", field: "MESSAGE_BODY", operator: "CONTAINS", value: "never matches" },
            ],
          },
        ],
      }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_STORY_MENTION,
      context({ platform: "INSTAGRAM", message: "" }),
    );

    expect(result).toBeDefined();
  });
});
