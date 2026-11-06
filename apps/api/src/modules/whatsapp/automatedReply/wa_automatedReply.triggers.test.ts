import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    rule: { findMany: vi.fn() },
    businessHour: { findUnique: vi.fn() },
    waAutomatedReply: { count: vi.fn() },
    waMessage: { findFirst: vi.fn() },
    contact: { findFirst: vi.fn() },
    contactLabelMap: { upsert: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { exists: vi.fn(async () => 0), set: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
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
  getOrCreateContactByPsid: vi.fn(),
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
  sendInstagramPrivateReply: vi.fn(),
  replyToInstagramComment: vi.fn(),
}));
vi.mock("./metaFlow.service.js", () => ({ startMetaFlow: vi.fn() }));
vi.mock("../../commerce/shop/commentToBuy.service.js", () => ({
  runShopProductsAction: vi.fn(async () => true),
}));
const chatProducts = vi.hoisted(() => ({ sendRuleProductsOnWhatsApp: vi.fn(async () => true) }));
vi.mock("../../commerce/shop/chatProducts.service.js", () => chatProducts);
vi.mock("../meta/sendApiMessages.js", () => ({ sendSendApiText: vi.fn() }));
vi.mock("../facebook/facebook_comments.service.js", () => ({ replyToFacebookComment: vi.fn() }));
vi.mock("./instagram_automatedReply.service.js", () => ({
  getMetaAutomationById: vi.fn(),
}));
vi.mock("../../integrations/shopify/shopify.mapping.js", () => ({
  resolveShopifyPathValue: vi.fn(),
}));
vi.mock("../../integrations/shopify/shopify.catalog.js", () => ({
  getShopifyProductImage: vi.fn(),
}));
vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../../integrations/meta/conversions.service.js", () => ({
  triggerConversionsApiForContact: vi.fn(),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { TriggerEvent } from "../../../../generated/prisma/enums.js";
import {
  checkAndExecuteRuleByTriggerEvent,
  resolveContactChannel,
  ruleRecipient,
} from "./wa_automatedReply.utils.js";
import {
  replyToInstagramComment,
  sendInstagramPrivateReply,
  sendInstagramTextMessage,
} from "../instagram/instagram_messaging.service.js";
import { log } from "../../../utils/logger.js";
import { startMetaFlow } from "./metaFlow.service.js";
import { sendSendApiText } from "../meta/sendApiMessages.js";
import { replyToFacebookComment } from "../facebook/facebook_comments.service.js";
import {
  getContactByPhoneNumberAndOrgId,
  getOrCreateContactByPhone,
  getOrCreateContactByPsid,
} from "../../contact/contact.service.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import { assignWaMessageToUser } from "../inbox/message/wamessage.service.js";
import { getMetaAutomationById } from "./instagram_automatedReply.service.js";
import { runShopProductsAction } from "../../commerce/shop/commentToBuy.service.js";

// No dayjs.extend here on purpose — see wa_automatedReply.utils.test.ts.
type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  rule: { findMany: Mock };
  businessHour: { findUnique: Mock };
  waMessage: { findFirst: Mock };
  contact: { findFirst: Mock };
  contactLabelMap: { upsert: Mock };
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
      platforms: { has: "WHATSAPP" },
    });
  });

  test("does not narrow by platform when asked for all of them", async () => {
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context({ platform: "ALL" }));

    expect(db.rule.findMany.mock.calls[0][0].where).not.toHaveProperty("platforms");
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

describe("checkAndExecuteRuleByTriggerEvent - WooCommerce events", () => {
  const wooRule = (options: Record<string, unknown>, actions: unknown[] = []) =>
    rule({ triggerEvent: TriggerEvent.WOOCOMMERCE_EVENT, options, actions });

  const order = {
    id: 901,
    number: "901",
    total: "1250.00",
    currency: "INR",
    billing: { first_name: "Asha", last_name: "Nair" },
    line_items: [
      { product_id: 77, name: "Tea", quantity: 2, image: { src: "https://shop.example/tea.jpg" } },
    ],
  };

  test("only fires a rule watching the status the order reached", async () => {
    db.rule.findMany.mockResolvedValue([wooRule({ wooEvent: "completed" })]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.WOOCOMMERCE_EVENT,
        context({ wooEvent: "processing" }),
      ),
    ).resolves.toBeUndefined();

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.WOOCOMMERCE_EVENT,
      context({ wooEvent: "completed" }),
    );
    expect(result?.rule.id).toBe("rule-1");
  });

  test("filters on the rule's products, not Shopify's", async () => {
    db.rule.findMany.mockResolvedValue([
      wooRule({ wooEvent: "completed", wooProductIds: ["77"], shopifyProductIds: ["1"] }),
    ]);

    expect(
      await checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.WOOCOMMERCE_EVENT,
        context({ wooEvent: "completed", wooProductIds: ["77"] }),
      ),
    ).toBeDefined();
    await expect(
      checkAndExecuteRuleByTriggerEvent(
        TriggerEvent.WOOCOMMERCE_EVENT,
        context({ wooEvent: "completed", wooProductIds: ["1"] }),
      ),
    ).resolves.toBeUndefined();
  });

  test("fills a template's variables from the Woo order, and its header from the line item", async () => {
    const { sendTemplateToUserCore } =
      await import("../messageTemplates/wa_templates.controller.js");
    db.rule.findMany.mockResolvedValue([
      wooRule({ wooEvent: "completed" }, [
        {
          id: "a-1",
          type: "SEND_TEMPLATE",
          value: {
            templateId: "tpl-1",
            useProductImageAsHeader: true,
            variableMapping: [
              { templateParamIndex: 0, shopifyPath: "customer_name" },
              { templateParamIndex: 1, shopifyPath: "number" },
              { templateParamIndex: 2, shopifyPath: "items" },
            ],
          },
        },
      ]),
    ]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.WOOCOMMERCE_EVENT,
      context({ wooEvent: "completed", wooBody: order, phone: "+919000000001" }),
    );

    expect(sendTemplateToUserCore).toHaveBeenCalledWith(
      "org-1",
      "tpl-1",
      "+919000000001",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Asha Nair" },
            { type: "text", text: "901" },
            { type: "text", text: "Tea (x2)" },
          ],
        },
        {
          type: "header",
          parameters: [{ type: "image", image: { link: "https://shop.example/tea.jpg" } }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
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

  const commentContext = context({
    platform: "INSTAGRAM",
    phone: "igs-1",
    phoneNumberId: "iba-1",
    instagramMediaId: "media-1",
    instagramCommentId: "comment-1",
  });

  // A commenter who never messaged the business is unreachable by plain DM, and Meta
  // allows one private reply per comment.
  test("answers a comment with a private reply first, then plain DMs", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
        platform: "INSTAGRAM",
        actions: [
          { id: "a1", type: "SEND_MESSAGE", value: "Here's your link" },
          { id: "a2", type: "SEND_MESSAGE", value: "Anything else?" },
        ],
      }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_COMMENT, commentContext);

    expect(sendInstagramPrivateReply).toHaveBeenCalledExactlyOnceWith(
      "comment-1",
      "Here's your link",
      "iba-1",
      "org-1",
      "igs-1",
    );
    expect(sendInstagramTextMessage).toHaveBeenCalledExactlyOnceWith(
      "igs-1",
      "Anything else?",
      "org-1",
      "iba-1",
    );
  });

  test("posts one of the rule's public replies under the comment", async () => {
    const replies = ["Sent you a DM 📩", "Check your inbox!"];
    db.rule.findMany.mockResolvedValue([commentRule({ instagramPublicReplies: replies })]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_COMMENT, commentContext);

    expect(replyToInstagramComment).toHaveBeenCalledOnce();
    const [commentId, text, ibaId] = (replyToInstagramComment as Mock).mock.calls[0];
    expect([commentId, ibaId]).toEqual(["comment-1", "iba-1"]);
    expect(replies).toContain(text);
  });

  // The DM spends the comment on its private reply; the public reply must still get it.
  test("posts the public reply after a DM has used the comment for its private reply", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
        platform: "INSTAGRAM",
        options: { instagramPublicReplies: ["Sent you a DM 📩"] },
        actions: [{ id: "a1", type: "SEND_MESSAGE", value: "hi" }],
      }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_COMMENT,
      context({
        platform: "INSTAGRAM",
        phone: "igs-1",
        phoneNumberId: "iba-1",
        instagramMediaId: "media-1",
        instagramCommentId: "comment-1",
      }),
    );

    expect(sendInstagramPrivateReply).toHaveBeenCalledExactlyOnceWith(
      "comment-1",
      "hi",
      "iba-1",
      "org-1",
      "igs-1",
    );
    expect(replyToInstagramComment).toHaveBeenCalledExactlyOnceWith(
      "comment-1",
      "Sent you a DM 📩",
      "iba-1",
    );
  });

  test("posts no public reply when the rule has none", async () => {
    db.rule.findMany.mockResolvedValue([commentRule()]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_COMMENT, commentContext);

    expect(replyToInstagramComment).not.toHaveBeenCalled();
  });

  test("still sends the DM when the public reply fails", async () => {
    (replyToInstagramComment as Mock).mockRejectedValue(new Error("permission missing"));
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
        platform: "INSTAGRAM",
        options: { instagramPublicReplies: ["Sent!"] },
        actions: [{ id: "a1", type: "SEND_MESSAGE", value: "Here's your link" }],
      }),
    ]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_COMMENT, commentContext),
    ).resolves.toBeDefined();
    expect(sendInstagramPrivateReply).toHaveBeenCalledOnce();
    expect(log.error).toHaveBeenCalled();
  });

  test("hands the comment to a chatbot so its first message is the private reply", async () => {
    const automation = { id: "bot-1", isActive: true };
    (getMetaAutomationById as Mock).mockResolvedValue(automation);
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
        platform: "INSTAGRAM",
        actions: [{ id: "a1", type: "TRIGGER_CHATBOT", value: "bot-1" }],
      }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_COMMENT, commentContext);

    expect(getMetaAutomationById).toHaveBeenCalledWith("bot-1", "org-1", "INSTAGRAM");
    expect(startMetaFlow).toHaveBeenCalledWith(
      "igs-1",
      automation,
      "org-1",
      { platform: "INSTAGRAM", accountId: "iba-1" },
      "comment-1",
    );
  });

  test("answers a story mention with a plain DM", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        triggerEvent: TriggerEvent.INSTAGRAM_STORY_MENTION,
        platform: "INSTAGRAM",
        actions: [{ id: "a1", type: "SEND_MESSAGE", value: "Hi" }],
      }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_STORY_MENTION,
      context({ platform: "INSTAGRAM", phone: "igs-1", phoneNumberId: "iba-1" }),
    );

    expect(sendInstagramPrivateReply).not.toHaveBeenCalled();
    expect(sendInstagramTextMessage).toHaveBeenCalledOnce();
  });

  test.each([
    ["a posts-only rule", "POSTS", false, true],
    ["a posts-only rule", "POSTS", true, false],
    ["a live-only rule", "LIVE", true, true],
    ["a live-only rule", "LIVE", false, false],
    ["a rule with no source set", undefined, true, true],
  ])("%s (%s) on a live=%s comment matches: %s", async (_name, source, live, matches) => {
    db.rule.findMany.mockResolvedValue([commentRule({ instagramCommentSource: source })]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_COMMENT,
      context({ platform: "INSTAGRAM", instagramMediaId: "media-1", instagramLiveComment: live }),
    );

    expect(Boolean(result)).toBe(matches);
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

/**
 * Contact-level triggers (assignment, close, lifecycle) know only the contact,
 * so the channel has to be recovered before a rule can be selected for it.
 */
describe("resolveContactChannel", () => {
  beforeEach(() => {
    db.waMessage.findFirst.mockResolvedValue(null);
  });

  test.each([
    ["INSTAGRAM", "iba-1"],
    ["FACEBOOK", "page-1"],
  ])("reports a %s thread with the account it arrived on", async (platform, identifier) => {
    db.waMessage.findFirst.mockResolvedValue({
      sourcePlatform: platform,
      sourceIdentifier: identifier,
    });

    await expect(resolveContactChannel({ id: "c1" })).resolves.toEqual({
      platform,
      phoneNumberId: identifier,
    });
  });

  // Rules scope WhatsApp by `phoneId`, but an inbound message carries the
  // display number — passing it would filter out every channel-scoped rule.
  test("reports a WhatsApp thread without a channel id", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      sourcePlatform: "WHATSAPP",
      sourceIdentifier: "15551323034",
    });

    await expect(resolveContactChannel({ id: "c1" })).resolves.toEqual({ platform: "WHATSAPP" });
  });

  test("reads the newest message, since the live channel is the last one used", async () => {
    await resolveContactChannel({ id: "c1" });

    expect(db.waMessage.findFirst.mock.calls[0][0].orderBy).toEqual({ waCreatedAt: "desc" });
  });

  // Closing or assigning a chat writes an INTERNAL activity note just before its rules
  // run; read as the newest message, it hid the Page id and a chatbot could not start.
  test("skips activity notes and reads only channel messages", async () => {
    await resolveContactChannel({ id: "c1" });

    expect(db.waMessage.findFirst.mock.calls[0][0].where.sourcePlatform).toEqual({
      in: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    });
  });

  test.each([
    ["igsId", { id: "c1", igsId: "igsid-1" }, "INSTAGRAM"],
    ["psid", { id: "c1", psid: "psid-1" }, "FACEBOOK"],
  ])("falls back to the contact's %s when it has no messages", async (_l, contact, platform) => {
    await expect(resolveContactChannel(contact)).resolves.toEqual({ platform });
  });

  // Narrowing a contact with no channel at all would only stop rules that
  // legitimately fire today.
  test("stays open for a contact with no channel", async () => {
    await expect(resolveContactChannel({ id: "c1" })).resolves.toEqual({ platform: "ALL" });
  });
});

// Closing, assigning or moving a Messenger chat runs rules on the psid: the contact has no
// phone, and the rule actions look Messenger contacts up by psid.
describe("ruleRecipient", () => {
  test("a Messenger contact is reached by its psid", () => {
    expect(ruleRecipient({ phone: null, psid: "psid-1" }, "FACEBOOK")).toBe("psid-1");
  });

  test("Instagram and WhatsApp contacts are reached by phone, where Instagram keeps the igsId", () => {
    expect(ruleRecipient({ phone: "igsid-1", psid: null }, "INSTAGRAM")).toBe("igsid-1");
    expect(ruleRecipient({ phone: "919800000000", psid: "psid-1" }, "WHATSAPP")).toBe(
      "919800000000",
    );
  });

  test("a Messenger contact with no psid falls back to its phone", () => {
    expect(ruleRecipient({ phone: "919800000000" }, "FACEBOOK")).toBe("919800000000");
  });
});

describe("checkAndExecuteRuleByTriggerEvent - ig.me links", () => {
  const linkRule = (id: string, instagramRef?: string) =>
    rule({
      id,
      name: id,
      triggerEvent: TriggerEvent.INSTAGRAM_REFERRAL,
      platform: "INSTAGRAM",
      options: instagramRef ? { instagramRef } : null,
    });
  const opened = (ref: string) => context({ platform: "INSTAGRAM", instagramRef: ref });

  test("answers the link whose ref the rule names, ignoring case", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("summer", "Summer_Sale")]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_REFERRAL,
      opened("summer_sale"),
    );

    expect(result?.rule.id).toBe("summer");
  });

  test("stays quiet for a link with another ref", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("summer", "summer_sale")]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_REFERRAL, opened("winter")),
    ).resolves.toBeUndefined();
  });

  test("lets a rule with no ref answer every link", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("any")]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_REFERRAL,
      opened("winter"),
    );

    expect(result?.rule.id).toBe("any");
  });

  test("prefers the rule naming the ref over one that answers every link", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("any"), linkRule("summer", "summer_sale")]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_REFERRAL,
      opened("summer_sale"),
    );

    expect(result?.rule.id).toBe("summer");
  });
});

describe("checkAndExecuteRuleByTriggerEvent - click-to-WhatsApp ads", () => {
  const adRule = (id: string, options: Record<string, unknown> | null = null, actions = []) =>
    rule({ id, name: id, triggerEvent: TriggerEvent.WHATSAPP_AD_REFERRAL, options, actions });
  const clicked = (sourceId: string, headline = "Summer Sale") =>
    context({ phoneNumberId: "phone-1", adReferral: { sourceId, headline } });

  test("answers the ad a rule names before a rule for every ad", async () => {
    db.rule.findMany.mockResolvedValue([adRule("any"), adRule("summer", { adIds: ["ad-1"] })]);
    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.WHATSAPP_AD_REFERRAL,
      clicked("ad-1"),
    );
    expect(result?.rule.id).toBe("summer");
  });

  test("stays quiet for an ad no rule names", async () => {
    db.rule.findMany.mockResolvedValue([adRule("winter", { adMatch: "winter" })]);
    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.WHATSAPP_AD_REFERRAL, clicked("ad-2")),
    ).resolves.toBeUndefined();
  });

  test("sends the rule's products into the WhatsApp chat", async () => {
    const value = { productIds: ["p1"], message: "Here's the sale" };
    db.rule.findMany.mockResolvedValue([
      adRule("sell", null, [{ id: "a1", type: "SEND_SHOP_PRODUCTS", value }] as never),
    ]);
    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.WHATSAPP_AD_REFERRAL,
      clicked("ad-1"),
    );
    expect(chatProducts.sendRuleProductsOnWhatsApp).toHaveBeenCalledWith({
      orgId: "org-1",
      ruleId: "sell",
      value,
      phone: "15550001",
      phoneId: "phone-1",
    });
    expect(result?.executedActions).toEqual([{ actionId: "a1", success: true }]);
  });
});

// Messenger contacts have no phone, only the psid the event carries, and the Messenger
// actions used to run Instagram-only code.
describe("Facebook (Messenger) rules", () => {
  const messengerContext = context({
    platform: "FACEBOOK",
    phone: "psid-1",
    phoneNumberId: "page-1",
    message: "hi",
  });
  const messengerRule = (actions: unknown[], overrides: Record<string, unknown> = {}) =>
    rule({
      platform: "FACEBOOK",
      triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
      // A message rule with no conditions never matches; "*" matches any message.
      groups: [
        {
          id: "g",
          operator: "AND",
          conditions: [{ id: "c", field: "MESSAGE_BODY", operator: "EQUALS", value: "*" }],
        },
      ],
      actions,
      ...overrides,
    });
  const emailCondition = [
    {
      id: "g",
      operator: "AND",
      conditions: [{ id: "c", field: "CONTACT_EMAIL", operator: "EQUALS", value: "a@b.com" }],
    },
  ];

  test("sends a rule's message on the Page", async () => {
    db.rule.findMany.mockResolvedValue([
      messengerRule([{ id: "a1", type: "SEND_MESSAGE", value: "Thanks!" }]),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.MESSAGE_RECEIVED, messengerContext);

    expect(sendSendApiText).toHaveBeenCalledWith(
      { platform: "FACEBOOK", accountId: "page-1" },
      "psid-1",
      "org-1",
      "Thanks!",
    );
    expect(sendInstagramTextMessage).not.toHaveBeenCalled();
  });

  test("starts the Messenger chatbot it names", async () => {
    const automation = { id: "bot-1", isActive: true };
    (getMetaAutomationById as Mock).mockResolvedValue(automation);
    db.rule.findMany.mockResolvedValue([
      messengerRule([{ id: "a1", type: "TRIGGER_CHATBOT", value: "bot-1" }]),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      messengerContext,
    );

    expect(getMetaAutomationById).toHaveBeenCalledWith("bot-1", "org-1", "FACEBOOK");
    expect(startMetaFlow).toHaveBeenCalledWith(
      "psid-1",
      automation,
      "org-1",
      { platform: "FACEBOOK", accountId: "page-1" },
      undefined,
    );
    expect(result?.executedActions[0].success).toBe(true);
  });

  test("doesn't start a chatbot that is switched off", async () => {
    (getMetaAutomationById as Mock).mockResolvedValue({ id: "bot-1", isActive: false });
    db.rule.findMany.mockResolvedValue([
      messengerRule([{ id: "a1", type: "TRIGGER_CHATBOT", value: "bot-1" }]),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      messengerContext,
    );

    expect(startMetaFlow).not.toHaveBeenCalled();
    expect(result?.executedActions[0].success).toBe(false);
  });

  // It used to report success and do nothing.
  test("reports failure when the chatbot is not a Messenger one", async () => {
    (getMetaAutomationById as Mock).mockResolvedValue(null);
    db.rule.findMany.mockResolvedValue([
      messengerRule([{ id: "a1", type: "TRIGGER_CHATBOT", value: "ig-bot" }]),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      messengerContext,
    );

    expect(startMetaFlow).not.toHaveBeenCalled();
    expect(result?.executedActions[0].success).toBe(false);
  });

  test("labels the contact found by psid", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-1" });
    db.rule.findMany.mockResolvedValue([
      messengerRule([{ id: "a1", type: "ATTACH_LABEL", value: "label-1" }]),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.MESSAGE_RECEIVED, messengerContext);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      psid: "psid-1",
      orgId: "org-1",
    });
    expect(db.contactLabelMap.upsert).toHaveBeenCalled();
  });

  // Creating by phone gave the same person a second, phone-keyed contact.
  test("assigns the psid contact rather than creating one by phone", async () => {
    (getOrCreateContactByPsid as Mock).mockResolvedValue({ contact: { id: "contact-1" } });
    (getTeamIdsByUserId as Mock).mockResolvedValue(["team-1"]);
    db.rule.findMany.mockResolvedValue([
      messengerRule([{ id: "a1", type: "ASSIGN_USER", value: "user-1" }]),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.MESSAGE_RECEIVED, messengerContext);

    expect(getOrCreateContactByPsid).toHaveBeenCalledWith("psid-1", "org-1");
    expect(getOrCreateContactByPhone).not.toHaveBeenCalled();
    expect((assignWaMessageToUser as Mock).mock.calls[0][0].contactId).toBe("contact-1");
    // The assignee's team comes from the rule's org, never another org they belong to.
    expect(getTeamIdsByUserId).toHaveBeenCalledWith("user-1", "org-1");
  });

  test("checks contact conditions against the psid contact", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-1", email: "a@b.com" });
    db.rule.findMany.mockResolvedValue([messengerRule([], { groups: emailCondition })]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      messengerContext,
    );

    expect(result).toBeDefined();
    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      psid: "psid-1",
      orgId: "org-1",
    });
    expect(getContactByPhoneNumberAndOrgId).not.toHaveBeenCalled();
  });

  test("still looks a WhatsApp contact up by phone", async () => {
    (getContactByPhoneNumberAndOrgId as Mock).mockResolvedValue({ id: "c", email: "a@b.com" });
    db.rule.findMany.mockResolvedValue([
      rule({ triggerEvent: TriggerEvent.MESSAGE_RECEIVED, groups: emailCondition }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSAGE_RECEIVED,
      context(),
    );

    expect(result).toBeDefined();
    expect(getContactByPhoneNumberAndOrgId).toHaveBeenCalledWith("15550001", "org-1");
    expect(db.contact.findFirst).not.toHaveBeenCalled();
  });
});

// An org with several WhatsApp numbers refuses a send that does not name one, so the
// reply has to go out on the number the customer wrote to.
describe("checkAndExecuteRuleByTriggerEvent - which WhatsApp number replies", () => {
  test("sends the rule's text from the number the message arrived on", async () => {
    const { sendTextMessage } = await import("../whatsappSurvey/wasurvey.service.js");
    db.rule.findMany.mockResolvedValue([
      rule({ actions: [{ id: "a1", type: "SEND_MESSAGE", value: "welcome" }] }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.CHAT_CLOSED,
      context({ phoneNumberId: "259643180556398" }),
    );

    expect(sendTextMessage).toHaveBeenCalledWith(
      { phone: "15550001", orgId: "org-1", whatsappSettingsPhoneId: "259643180556398" },
      null,
      "welcome",
    );
  });
});

// One welcome rule on WhatsApp and Messenger answers each customer where they wrote.
describe("checkAndExecuteRuleByTriggerEvent - a rule on several channels", () => {
  const welcome = () =>
    rule({
      platform: "WHATSAPP",
      platforms: ["WHATSAPP", "FACEBOOK"],
      actions: [{ id: "a1", type: "SEND_MESSAGE", value: "Welcome!" }],
    });

  test("replies on Messenger to a Messenger event", async () => {
    db.rule.findMany.mockResolvedValue([welcome()]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.CHAT_CLOSED,
      context({ platform: "FACEBOOK", phone: "psid-1", phoneNumberId: "page-1" }),
    );

    expect(sendSendApiText).toHaveBeenCalledWith(
      { platform: "FACEBOOK", accountId: "page-1" },
      "psid-1",
      "org-1",
      "Welcome!",
    );
  });

  test("sends Messenger the words without WhatsApp's formatting markers", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        platforms: ["WHATSAPP", "FACEBOOK"],
        actions: [{ id: "a1", type: "SEND_MESSAGE", value: "*Welcome!* Use code _HELLO_" }],
      }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.CHAT_CLOSED,
      context({ platform: "FACEBOOK", phone: "psid-1", phoneNumberId: "page-1" }),
    );

    expect((sendSendApiText as Mock).mock.calls[0][3]).toBe("Welcome! Use code HELLO");
  });

  test("replies on WhatsApp to a WhatsApp event", async () => {
    const { sendTextMessage } = await import("../whatsappSurvey/wasurvey.service.js");
    db.rule.findMany.mockResolvedValue([welcome()]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.CHAT_CLOSED, context());

    expect(sendTextMessage).toHaveBeenCalled();
    expect(sendSendApiText).not.toHaveBeenCalled();
  });
});

describe("checkAndExecuteRuleByTriggerEvent - comment to buy", () => {
  const sellRule = (keyword: string, actions: Array<Record<string, unknown>> = []) =>
    rule({
      id: "rule-sell",
      triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
      platform: "INSTAGRAM",
      groups: [
        {
          id: "g",
          operator: "AND",
          conditions: [{ id: "c", field: "MESSAGE_BODY", operator: "CONTAINS", value: keyword }],
        },
      ],
      actions: [
        ...actions,
        { id: "sell", type: "SEND_SHOP_PRODUCTS", value: { productIds: ["p1"] } },
      ],
    });
  const comment = (message: string) =>
    context({
      platform: "INSTAGRAM",
      phone: "igs-1",
      phoneNumberId: "iba-1",
      message,
      instagramMediaId: "media-1",
      instagramCommentId: "comment-1",
    });

  test("sends the products when the comment has the keyword", async () => {
    db.rule.findMany.mockResolvedValue([sellRule("buy")]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_COMMENT,
      comment("I want to BUY"),
    );

    expect(runShopProductsAction).toHaveBeenCalledExactlyOnceWith({
      orgId: "org-1",
      ruleId: "rule-sell",
      triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
      value: { productIds: ["p1"] },
      accountId: "iba-1",
      recipient: "igs-1",
      commentId: "comment-1",
      mediaId: "media-1",
    });
  });

  test("stays quiet on a comment without the keyword", async () => {
    db.rule.findMany.mockResolvedValue([sellRule("buy")]);

    await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.INSTAGRAM_COMMENT,
      comment("lovely photo"),
    );

    expect(runShopProductsAction).not.toHaveBeenCalled();
  });

  // Meta allows one private reply per comment: a text sent first spends it.
  test("gets no comment to reply to once an earlier action has replied", async () => {
    db.rule.findMany.mockResolvedValue([
      sellRule("buy", [{ id: "a1", type: "SEND_MESSAGE", value: "Hi!" }]),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.INSTAGRAM_COMMENT, comment("buy"));

    expect(sendInstagramPrivateReply).toHaveBeenCalledOnce();
    expect((runShopProductsAction as Mock).mock.calls[0][0].commentId).toBeUndefined();
  });
});

describe("checkAndExecuteRuleByTriggerEvent - m.me links", () => {
  const linkRule = (id: string, messengerRef?: string) =>
    rule({
      id,
      name: id,
      triggerEvent: TriggerEvent.MESSENGER_REFERRAL,
      platform: "FACEBOOK",
      options: messengerRef ? { messengerRef } : null,
    });
  const opened = (ref: string) => context({ platform: "FACEBOOK", messengerRef: ref });

  test("answers the link whose ref the rule names, ignoring case", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("summer", "Summer_Sale")]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSENGER_REFERRAL,
      opened("summer_sale"),
    );

    expect(result?.rule.id).toBe("summer");
  });

  test("stays quiet for a link with another ref", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("summer", "summer_sale")]);

    await expect(
      checkAndExecuteRuleByTriggerEvent(TriggerEvent.MESSENGER_REFERRAL, opened("winter")),
    ).resolves.toBeUndefined();
  });

  test("lets a rule with no ref answer every link", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("any")]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSENGER_REFERRAL,
      opened("winter"),
    );

    expect(result?.rule.id).toBe("any");
  });

  test("prefers the rule naming the ref over one that answers every link", async () => {
    db.rule.findMany.mockResolvedValue([linkRule("any"), linkRule("summer", "summer_sale")]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSENGER_REFERRAL,
      opened("summer_sale"),
    );

    expect(result?.rule.id).toBe("summer");
  });

  // The two link triggers keep their refs apart: an Instagram ref never narrows a Messenger rule.
  test("ignores an Instagram ref on a Messenger link rule", async () => {
    db.rule.findMany.mockResolvedValue([
      rule({
        id: "summer",
        triggerEvent: TriggerEvent.MESSENGER_REFERRAL,
        platform: "FACEBOOK",
        options: { instagramRef: "summer_sale" },
      }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.MESSENGER_REFERRAL,
      opened("winter"),
    );

    expect(result?.rule.id).toBe("summer");
  });
});

// A Page comment names nobody the Page can message: the rule starts with no contact, its
// first send is a private reply to the comment, and Meta's answer names the person.
describe("Facebook comment rules", () => {
  const commentRule = (actions: unknown[], options: Record<string, unknown> | null = null) =>
    rule({
      id: "comment-rule",
      platform: "FACEBOOK",
      triggerEvent: TriggerEvent.FACEBOOK_COMMENT,
      groups: [],
      actions,
      options,
    });
  const onComment = () => ({
    ...context({
      platform: "FACEBOOK",
      phone: undefined,
      phoneNumberId: "page-1",
      message: "price?",
    }),
    facebookComment: { commentId: "comment-1" } as { commentId: string; recipientId?: string },
  });
  /** Meta answering the private reply, as the real sender records it on the channel. */
  const replyReaches = (psid = "psid-9") =>
    (sendSendApiText as Mock).mockImplementation(async (channel) => {
      if (channel.pendingComment && !channel.pendingComment.recipientId) {
        channel.pendingComment.recipientId = psid;
      }
      return { message_id: "m" };
    });

  test("answers the comment with a private reply on the Page", async () => {
    db.rule.findMany.mockResolvedValue([
      commentRule([{ id: "a1", type: "SEND_MESSAGE", value: "Here is the price list" }]),
    ]);
    const ctx = onComment();

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.FACEBOOK_COMMENT, ctx);

    expect(sendSendApiText).toHaveBeenCalledWith(
      { platform: "FACEBOOK", accountId: "page-1", pendingComment: ctx.facebookComment },
      "fb_comment:comment-1",
      "org-1",
      "Here is the price list",
    );
  });

  test("lets the caller see who the reply reached", async () => {
    replyReaches();
    db.rule.findMany.mockResolvedValue([
      commentRule([{ id: "a1", type: "SEND_MESSAGE", value: "Hi" }]),
    ]);
    const ctx = onComment();

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.FACEBOOK_COMMENT, ctx);

    expect(ctx.facebookComment?.recipientId).toBe("psid-9");
  });

  test("sends what follows the reply to the person it reached", async () => {
    replyReaches();
    db.rule.findMany.mockResolvedValue([
      commentRule([
        { id: "a1", type: "SEND_MESSAGE", value: "First" },
        { id: "a2", type: "SEND_MESSAGE", value: "Second" },
      ]),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.FACEBOOK_COMMENT, onComment());

    expect((sendSendApiText as Mock).mock.calls[1][1]).toBe("psid-9");
  });

  test("starts a chatbot whose first message is the private reply", async () => {
    (getMetaAutomationById as Mock).mockResolvedValue({ id: "bot-1", isActive: true });
    db.rule.findMany.mockResolvedValue([
      commentRule([{ id: "a1", type: "TRIGGER_CHATBOT", value: "bot-1" }]),
    ]);
    const ctx = onComment();

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.FACEBOOK_COMMENT, ctx);

    expect(startMetaFlow).toHaveBeenCalledWith(
      "fb_comment:comment-1",
      { id: "bot-1", isActive: true },
      "org-1",
      { platform: "FACEBOOK", accountId: "page-1", pendingComment: ctx.facebookComment },
      undefined,
    );
  });

  test("posts one of the rule's public replies under the comment", async () => {
    db.rule.findMany.mockResolvedValue([
      commentRule([{ id: "a1", type: "SEND_MESSAGE", value: "Hi" }], {
        instagramPublicReplies: ["Sent you a message 👋"],
      }),
    ]);

    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.FACEBOOK_COMMENT, onComment());

    expect(replyToFacebookComment).toHaveBeenCalledWith(
      "comment-1",
      "Sent you a message 👋",
      "page-1",
      "org-1",
    );
  });

  test("still answers privately when the public reply is refused", async () => {
    (replyToFacebookComment as Mock).mockRejectedValue(new Error("needs pages_manage_engagement"));
    db.rule.findMany.mockResolvedValue([
      commentRule([{ id: "a1", type: "SEND_MESSAGE", value: "Hi" }], {
        instagramPublicReplies: ["Check your inbox"],
      }),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.FACEBOOK_COMMENT,
      onComment(),
    );

    expect(result?.executedActions[0]).toMatchObject({ success: true });
  });

  test("never sends a comment rule's message without a comment to answer", async () => {
    db.rule.findMany.mockResolvedValue([
      commentRule([{ id: "a1", type: "SEND_MESSAGE", value: "Hi" }]),
    ]);

    const result = await checkAndExecuteRuleByTriggerEvent(
      TriggerEvent.FACEBOOK_COMMENT,
      context({ platform: "FACEBOOK", phone: undefined, phoneNumberId: "page-1", message: "x" }),
    );

    expect(sendSendApiText).not.toHaveBeenCalled();
    expect(result?.executedActions[0]).toMatchObject({ success: false });
  });
});
