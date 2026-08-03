import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waAutomatedReply: { count: vi.fn() },
    businessHour: { findUnique: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { exists: vi.fn(async () => 0) },
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

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { findRecentAutomation } from "../whatsappSurvey/automation-logger.utils.js";
import { getContactByPhoneNumberAndOrgId } from "../../contact/contact.service.js";
import { TriggerEvent } from "../../../../generated/prisma/enums.js";
import {
  type automationProps,
  generateInternalMessageId,
  generateOrderReferenceId,
  selectAutomationByBusinessHours,
  validateRuleConditions,
  validateTimeWindow,
  verifyAutomationLimit,
} from "./wa_automatedReply.utils.js";

// No dayjs.extend here on purpose: the module under test registers customParseFormat
// itself now. This file used to have to do it, which meant the tests passed while the
// module in isolation did not.
type Mock = ReturnType<typeof vi.fn>;

// dayjs is a singleton and this module imports wasurvey.utils.js (which also extends
// customParseFormat), so passing time-window tests do not prove the module registers the
// plugin itself. Assert the registration directly: without it, dropping the wasurvey
// import would make every time-slot comparison silently return false and automations
// would stop firing during business hours with no error anywhere.
describe("dayjs plugin registration", () => {
  test("registers customParseFormat itself rather than relying on wasurvey.utils", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/modules/whatsapp/automatedReply/wa_automatedReply.utils.ts", "utf8"),
    );

    expect(source).toContain('import customParseFormat from "dayjs/plugin/customParseFormat.js"');
    expect(source).toContain("dayjs.extend(customParseFormat)");
  });
});

const db = prisma as unknown as {
  waAutomatedReply: { count: Mock };
  businessHour: { findUnique: Mock };
};
const redisExists = (redisConnection as unknown as { exists: Mock }).exists;
const findRecentAutomationMock = findRecentAutomation as unknown as Mock;
const getContactMock = getContactByPhoneNumberAndOrgId as unknown as Mock;

/** Noon UTC on Monday 27 July 2026 — the instant the clock tests freeze at. */
const MONDAY_NOON = "2026-07-27T12:00:00Z";

function openAllDay(day: string, slots = [{ openTime: "09:00", closeTime: "17:00" }]) {
  return {
    id: "bh-1",
    timezone: "UTC",
    schedule: { [day]: { isOpen: true, timeSlots: slots } },
  } as any;
}

function rule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    name: "Rule",
    platform: "WHATSAPP",
    operator: "AND",
    isActive: true,
    triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
    whatsappSettingsPhoneIds: [],
    options: null,
    groups: [],
    actions: [],
    ...overrides,
  } as any;
}

function group(conditions: any[], operator: "AND" | "OR" = "AND") {
  return { id: "group-1", operator, conditions };
}

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

beforeEach(() => {
  vi.clearAllMocks();
  redisExists.mockResolvedValue(0);
  findRecentAutomationMock.mockResolvedValue(null);
  getContactMock.mockResolvedValue(null);
  db.waAutomatedReply.count.mockResolvedValue(0);
  db.businessHour.findUnique.mockResolvedValue(null);
});

describe("validateTimeWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(MONDAY_NOON));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("treats an automation with no business hours as always open", () => {
    expect(validateTimeWindow(null)).toBe(true);
  });

  test("treats business hours with no schedule as always open", () => {
    expect(validateTimeWindow({ timezone: "UTC", schedule: null } as any)).toBe(true);
  });

  test("is open inside the day's slot", () => {
    expect(validateTimeWindow(openAllDay("monday"))).toBe(true);
  });

  test("is closed on a day marked shut", () => {
    const closed = {
      timezone: "UTC",
      schedule: { monday: { isOpen: false, timeSlots: [] } },
    } as any;

    expect(validateTimeWindow(closed)).toBe(false);
  });

  test("is closed on a day the schedule does not mention", () => {
    expect(validateTimeWindow(openAllDay("tuesday"))).toBe(false);
  });

  test("is closed outside the day's slot", () => {
    expect(
      validateTimeWindow(openAllDay("monday", [{ openTime: "13:00", closeTime: "17:00" }])),
    ).toBe(false);
  });

  test("opens exactly on the opening minute", () => {
    expect(
      validateTimeWindow(openAllDay("monday", [{ openTime: "12:00", closeTime: "17:00" }])),
    ).toBe(true);
  });

  test("closes exactly on the closing minute", () => {
    expect(
      validateTimeWindow(openAllDay("monday", [{ openTime: "09:00", closeTime: "12:00" }])),
    ).toBe(false);
  });

  test("is open when any one of several slots covers the time", () => {
    expect(
      validateTimeWindow(
        openAllDay("monday", [
          { openTime: "06:00", closeTime: "09:00" },
          { openTime: "11:00", closeTime: "15:00" },
        ]),
      ),
    ).toBe(true);
  });

  test("reads the clock in the business's own timezone", () => {
    // Noon UTC is 5:30pm in Kolkata, outside a 09:00-17:00 window there.
    const kolkata = {
      timezone: "Asia/Kolkata",
      schedule: {
        monday: { isOpen: true, timeSlots: [{ openTime: "09:00", closeTime: "17:00" }] },
      },
    } as any;

    expect(validateTimeWindow(kolkata)).toBe(false);
  });

  describe("overnight slots", () => {
    test("is closed at midday for a 22:00 to 06:00 window", () => {
      expect(
        validateTimeWindow(openAllDay("monday", [{ openTime: "22:00", closeTime: "06:00" }])),
      ).toBe(false);
    });

    test("is open late in the evening", () => {
      vi.setSystemTime(new Date("2026-07-27T23:00:00Z"));

      expect(
        validateTimeWindow(openAllDay("monday", [{ openTime: "22:00", closeTime: "06:00" }])),
      ).toBe(true);
    });

    test("is open in the small hours", () => {
      // 03:00 UTC on Monday 27 July.
      vi.setSystemTime(new Date("2026-07-27T03:00:00Z"));

      expect(
        validateTimeWindow(openAllDay("monday", [{ openTime: "22:00", closeTime: "06:00" }])),
      ).toBe(true);
    });
  });
});

describe("selectAutomationByBusinessHours", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(MONDAY_NOON));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("prefers an automation whose business hours are open right now", () => {
    const open = { id: "open", businessHour: openAllDay("monday") };
    const fallback: { id: string; businessHour: automationProps["businessHour"] } = {
      id: "fallback",
      businessHour: null,
    };

    expect(selectAutomationByBusinessHours([fallback, open])).toBe(open);
  });

  test("falls back to the always-on automation when none are open", () => {
    const closed = { id: "closed", businessHour: openAllDay("tuesday") };
    const fallback: { id: string; businessHour: automationProps["businessHour"] } = {
      id: "fallback",
      businessHour: null,
    };

    expect(selectAutomationByBusinessHours([closed, fallback])).toBe(fallback);
  });

  test("takes the first open automation when several are open", () => {
    const first = { id: "first", businessHour: openAllDay("monday") };
    const second = { id: "second", businessHour: openAllDay("monday") };

    expect(selectAutomationByBusinessHours([first, second])).toBe(first);
  });

  test("selects nothing when all are closed and there is no fallback", () => {
    expect(
      selectAutomationByBusinessHours([{ id: "closed", businessHour: openAllDay("tuesday") }]),
    ).toBeUndefined();
  });

  test("selects nothing from an empty list", () => {
    expect(selectAutomationByBusinessHours([])).toBeUndefined();
  });
});

describe("validateRuleConditions - gates before the conditions", () => {
  test("ignores an inactive rule", async () => {
    await expect(
      validateRuleConditions(rule({ isActive: false }), "hello", "org-1", "15550001"),
    ).resolves.toBe(false);
  });

  test("stays silent when a once-a-day rule already fired for this contact", async () => {
    redisExists.mockResolvedValue(1);

    const result = await validateRuleConditions(
      rule({ options: { sendOncePerDay: true } }),
      "hello",
      "org-1",
      "15550001",
    );

    expect(result).toBe(false);
    expect(redisExists).toHaveBeenCalledWith("rule:rule-1:sendOncePerDay:15550001");
  });

  test("stays silent outside the rule's business hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(MONDAY_NOON));
    db.businessHour.findUnique.mockResolvedValue(openAllDay("tuesday"));

    const result = await validateRuleConditions(
      rule({ options: { businessHours: { enabled: true, businessHoursId: "bh-1" } } }),
      "hello",
      "org-1",
      "15550001",
    );

    expect(result).toBe(false);
    vi.useRealTimers();
  });

  test("carries on when the configured business hours no longer exist", async () => {
    db.businessHour.findUnique.mockResolvedValue(null);

    const result = await validateRuleConditions(
      rule({
        options: { businessHours: { enabled: true, businessHoursId: "gone" } },
        triggerEvent: TriggerEvent.CHAT_CLOSED,
      }),
      "hello",
      "org-1",
      "15550001",
    );

    expect(result).toBe(true);
  });

  test("fires a non-message rule that carries no conditions", async () => {
    await expect(
      validateRuleConditions(
        rule({ triggerEvent: TriggerEvent.CHAT_CLOSED }),
        "",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(true);
  });

  test("never fires a message rule that carries no conditions", async () => {
    await expect(validateRuleConditions(rule(), "hello", "org-1", "15550001")).resolves.toBe(false);
  });
});

describe("validateRuleConditions - matching on the message", () => {
  const withCondition = (condition: Record<string, unknown>) =>
    rule({ groups: [group([{ id: "c1", ...condition }])] });

  test.each([
    ["CONTAINS", "price", "what is the price?", true],
    ["CONTAINS", "price", "priceless", false],
    ["EQUALS", "hello", "Hello", true],
    ["EQUALS", "hello", "hello there", false],
    ["STARTS_WITH", "hi", "Hi there", true],
    ["STARTS_WITH", "hi", "oh hi", false],
    ["ENDS_WITH", "please", "send it PLEASE", true],
    ["ENDS_WITH", "please", "please send", false],
  ])("%s '%s' against '%s'", async (operator, value, message, expected) => {
    const result = await validateRuleConditions(
      withCondition({ field: "MESSAGE_BODY", operator, value }),
      message,
      "org-1",
      "15550001",
    );

    expect(result).toBe(expected);
  });

  test("matches any message when the value is a wildcard", async () => {
    const result = await validateRuleConditions(
      withCondition({ field: "MESSAGE_BODY", operator: "EQUALS", value: "*" }),
      "anything at all",
      "org-1",
      "15550001",
    );

    expect(result).toBe(true);
  });

  test("never matches a message condition with no value", async () => {
    await expect(
      validateRuleConditions(
        withCondition({ field: "MESSAGE_BODY", operator: "CONTAINS", value: null }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(false);
  });

  test("never matches an operator it does not know", async () => {
    await expect(
      validateRuleConditions(
        withCondition({ field: "MESSAGE_BODY", operator: "REGEX", value: "h.*" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(false);
  });

  test("never matches a field it does not know", async () => {
    await expect(
      validateRuleConditions(
        withCondition({ field: "MOON_PHASE", operator: "EQUALS", value: "full" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(false);
  });

  test("applies the condition's own business-hours lock", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(MONDAY_NOON));

    const result = await validateRuleConditions(
      withCondition({
        field: "MESSAGE_BODY",
        operator: "CONTAINS",
        value: "price",
        messageBodyLock: { businessHour: openAllDay("tuesday") },
      }),
      "what is the price?",
      "org-1",
      "15550001",
    );

    expect(result).toBe(false);
    vi.useRealTimers();
  });
});

describe("validateRuleConditions - matching on the contact", () => {
  const withCondition = (condition: Record<string, unknown>) =>
    rule({ groups: [group([{ id: "c1", ...condition }])] });

  test("matches the contact's email", async () => {
    getContactMock.mockResolvedValue({ email: "Ada@Acme.com" });

    await expect(
      validateRuleConditions(
        withCondition({ field: "CONTACT_EMAIL", operator: "ENDS_WITH", value: "@acme.com" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(true);
  });

  test("rejects when the contact has no email", async () => {
    getContactMock.mockResolvedValue({ email: null });

    await expect(
      validateRuleConditions(
        withCondition({ field: "CONTACT_EMAIL", operator: "CONTAINS", value: "acme" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(false);
  });

  test("matches membership of a contact group", async () => {
    getContactMock.mockResolvedValue({ contactGroups: [{ contactGroupId: "group-a" }] });

    await expect(
      validateRuleConditions(
        withCondition({ field: "CONTACT_GROUP", operator: "EQUALS", value: "group-a" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(true);
  });

  test("matches a contact label", async () => {
    getContactMock.mockResolvedValue({ ContactLabelMap: [{ labelId: "label-a" }] });

    await expect(
      validateRuleConditions(
        withCondition({ field: "CONTACT_LABEL", operator: "EQUALS", value: "label-a" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(true);
  });

  test("matches the contact's lifecycle stage", async () => {
    getContactMock.mockResolvedValue({ lifecycleId: "life-1" });

    await expect(
      validateRuleConditions(
        withCondition({ field: "CONTACT_LIFECYCLE", operator: "EQUALS", value: "life-1" }),
        "hello",
        "org-1",
        "15550001",
      ),
    ).resolves.toBe(true);
  });

  test("rejects every contact condition when the contact is unknown", async () => {
    getContactMock.mockResolvedValue(null);

    for (const field of ["CONTACT_GROUP", "CONTACT_LABEL", "CONTACT_LIFECYCLE"]) {
      await expect(
        validateRuleConditions(
          withCondition({ field, operator: "EQUALS", value: "x" }),
          "hello",
          "org-1",
          "15550001",
        ),
      ).resolves.toBe(false);
    }
  });
});

describe("validateRuleConditions - combining conditions", () => {
  const contains = (value: string) => ({
    id: `c-${value}`,
    field: "MESSAGE_BODY",
    operator: "CONTAINS",
    value,
  });

  test("an AND group needs every condition", async () => {
    const r = rule({ groups: [group([contains("price"), contains("shipping")], "AND")] });

    await expect(
      validateRuleConditions(r, "price and shipping", "org-1", "15550001"),
    ).resolves.toBe(true);
    await expect(validateRuleConditions(r, "price only", "org-1", "15550001")).resolves.toBe(false);
  });

  test("an OR group needs only one condition", async () => {
    const r = rule({ groups: [group([contains("price"), contains("shipping")], "OR")] });

    await expect(validateRuleConditions(r, "shipping only", "org-1", "15550001")).resolves.toBe(
      true,
    );
    await expect(validateRuleConditions(r, "nothing here", "org-1", "15550001")).resolves.toBe(
      false,
    );
  });

  test("an AND rule needs every group", async () => {
    const r = rule({
      operator: "AND",
      groups: [group([contains("price")]), group([contains("shipping")])],
    });

    await expect(
      validateRuleConditions(r, "price and shipping", "org-1", "15550001"),
    ).resolves.toBe(true);
    await expect(validateRuleConditions(r, "price only", "org-1", "15550001")).resolves.toBe(false);
  });

  test("an OR rule needs only one group", async () => {
    const r = rule({
      operator: "OR",
      groups: [group([contains("price")]), group([contains("shipping")])],
    });

    await expect(validateRuleConditions(r, "shipping only", "org-1", "15550001")).resolves.toBe(
      true,
    );
  });
});

describe("verifyAutomationLimit", () => {
  const subscription = (max: number) => ({ features: { whatsapp: { count: { max } } } });

  function request(overrides: Record<string, unknown> = {}) {
    return {
      user: { orgId: "org-1" },
      subscription: subscription(10),
      ...overrides,
    } as any;
  }

  test("lets the request through when the org is under its limit", async () => {
    db.waAutomatedReply.count.mockResolvedValue(3);
    const reply = makeReply();

    await verifyAutomationLimit(request(), reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  test("refuses once the org has reached its limit", async () => {
    db.waAutomatedReply.count.mockResolvedValue(10);
    const reply = makeReply();

    await verifyAutomationLimit(request(), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({
      message: "You have reached the maximum limit of 10 automated replies.",
      displayMessageInClient: true,
    });
  });

  test("counts only this org's automations", async () => {
    await verifyAutomationLimit(request(), makeReply());

    expect(db.waAutomatedReply.count).toHaveBeenCalledWith({ where: { orgId: "org-1" } });
  });

  test("refuses when the request carries no subscription", async () => {
    const reply = makeReply();

    await verifyAutomationLimit(request({ subscription: undefined }), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toMatchObject({ message: "Subscription not found" });
  });

  // Automated replies are unlimited by design — no plan in subscription.data.ts states a
  // whatsapp count. That outcome is unchanged, but it is now a deliberate early return
  // rather than an accident of comparing against undefined.
  test("allows unlimited replies when the plan does not state a count", async () => {
    db.waAutomatedReply.count.mockResolvedValue(9999);
    const reply = makeReply();

    await verifyAutomationLimit(request({ subscription: { features: {} } }), reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  test("does not bother counting when the plan states no limit", async () => {
    await verifyAutomationLimit(request({ subscription: { features: {} } }), makeReply());

    expect(db.waAutomatedReply.count).not.toHaveBeenCalled();
  });

  test("still enforces a limit the plan does state", async () => {
    db.waAutomatedReply.count.mockResolvedValue(5);
    const reply = makeReply();

    await verifyAutomationLimit(request({ subscription: subscription(5) }), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toMatchObject({
      message: "You have reached the maximum limit of 5 automated replies.",
    });
  });
});

describe("generateOrderReferenceId", () => {
  test("is prefixed so an order reference is recognisable", () => {
    expect(generateOrderReferenceId()).toMatch(/^ord-/);
  });

  test("stays within the 32 character limit", () => {
    expect(generateOrderReferenceId().length).toBeLessThanOrEqual(32);
  });

  test("uses only the characters the payment API permits", () => {
    const sample = Array.from({ length: 100 }, () => generateOrderReferenceId()).join("");

    expect(sample).toMatch(/^[a-zA-Z0-9_.-]+$/);
  });

  test("does not repeat itself", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateOrderReferenceId()));

    expect(ids.size).toBe(100);
  });
});

describe("generateInternalMessageId", () => {
  test("looks like a WhatsApp message id", () => {
    expect(generateInternalMessageId()).toMatch(/^wamid\./);
  });

  test("does not repeat itself", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateInternalMessageId()));

    expect(ids.size).toBe(100);
  });
});
