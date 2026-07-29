import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => {
  const tx = {
    rule: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    ruleMessageBodyLock: { createMany: vi.fn(), deleteMany: vi.fn() },
  };
  return {
    default: {
      __tx: tx,
      rule: { findMany: vi.fn(), findUnique: vi.fn() },
      ruleMessageBodyLock: { findFirst: vi.fn() },
      ruleAction: { findMany: vi.fn() },
      $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
    },
    excludeFields: vi.fn(),
  };
});

vi.mock("../../../../generated/prisma/client.js", () => ({ Prisma: {} }));

import prisma from "../../../utils/prisma.js";
import {
  createRule,
  deleteRule,
  getAllRules,
  getRuleById,
  getRulesByAutomationId,
  updateRule,
} from "./wa_rule.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  __tx: {
    rule: { create: Mock; findUnique: Mock; update: Mock; delete: Mock };
    ruleMessageBodyLock: { createMany: Mock; deleteMany: Mock };
  };
  rule: { findMany: Mock; findUnique: Mock };
  ruleMessageBodyLock: { findFirst: Mock };
  ruleAction: { findMany: Mock };
  $transaction: Mock;
};
const tx = db.__tx;

const CREATED_RULE = { id: "rule-1", name: "Greeting", groups: [], actions: [] };

/** A rule payload with one MESSAGE_BODY keyword condition. */
function ruleInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Greeting",
    platform: "WHATSAPP",
    triggerEvent: "MESSAGE_RECEIVED",
    whatsappSettingsPhoneIds: [],
    groups: [
      {
        operator: "AND",
        conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "hello" }],
      },
    ],
    actions: [{ type: "SEND_TEXT", value: "hi there" }],
    orgId: "org-1",
    ...overrides,
  } as any;
}

/** An existing lock row pointing back at the rule that reserved the keyword. */
function existingLock({ ruleId = "rule-other", isActive = true, name = "Other rule" } = {}) {
  return { ruleCondition: { group: { ruleId, rule: { isActive, name } } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(tx));
  db.ruleMessageBodyLock.findFirst.mockResolvedValue(null);
  db.rule.findMany.mockResolvedValue([]);
  db.rule.findUnique.mockResolvedValue(null);
  db.ruleAction.findMany.mockResolvedValue([]);
  tx.rule.create.mockResolvedValue(CREATED_RULE);
  tx.rule.update.mockResolvedValue(CREATED_RULE);
  tx.rule.delete.mockResolvedValue(CREATED_RULE);
  tx.rule.findUnique.mockResolvedValue({
    platform: "WHATSAPP",
    options: null,
    groups: [{ conditions: [{ id: "cond-1", field: "MESSAGE_BODY", value: "hello" }] }],
  });
  tx.ruleMessageBodyLock.createMany.mockResolvedValue({ count: 1 });
  tx.ruleMessageBodyLock.deleteMany.mockResolvedValue({ count: 0 });
});

describe("createRule - what gets stored", () => {
  test("creates the rule with its groups, conditions and actions", async () => {
    const result = await createRule(ruleInput());

    const data = tx.rule.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Greeting",
      platform: "WHATSAPP",
      triggerEvent: "MESSAGE_RECEIVED",
      org: { connect: { id: "org-1" } },
    });
    expect(data.groups.create[0].conditions.createMany.data).toEqual([
      { field: "MESSAGE_BODY", operator: "CONTAINS", value: "hello" },
    ]);
    expect(data.actions.createMany.data).toEqual([{ type: "SEND_TEXT", value: "hi there" }]);
    expect(result).toBe(CREATED_RULE);
  });

  test("defaults an unspecified rule to an active WhatsApp AND rule", async () => {
    await createRule(ruleInput({ platform: undefined, isActive: undefined, operator: undefined }));

    expect(tx.rule.create.mock.calls[0][0].data).toMatchObject({
      platform: "WHATSAPP",
      isActive: true,
      operator: "AND",
      options: null,
    });
  });

  test("stores an empty group and action list when none are given", async () => {
    await createRule(ruleInput({ groups: undefined, actions: undefined }));

    const data = tx.rule.create.mock.calls[0][0].data;
    expect(data.groups.create).toEqual([]);
    expect(data.actions.createMany.data).toEqual([]);
  });

  test("reserves the keyword once the rule exists", async () => {
    await createRule(ruleInput());

    expect(tx.ruleMessageBodyLock.createMany).toHaveBeenCalledWith({
      data: [
        {
          orgId: "org-1",
          messageBody: "hello",
          platform: "WHATSAPP",
          ruleConditionId: "cond-1",
          businessHourId: null,
        },
      ],
    });
  });

  test("writes the rule and its keyword reservation in one transaction", async () => {
    await createRule(ruleInput());

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("createRule - keyword uniqueness", () => {
  test("refuses a keyword another active rule already owns", async () => {
    db.ruleMessageBodyLock.findFirst.mockResolvedValue(existingLock({ name: "Welcome" }));

    await expect(createRule(ruleInput())).rejects.toThrow(
      /Keyword 'hello' is already used by another active automation \('Welcome'\)/,
    );
  });

  test("allows a keyword whose owning rule is switched off", async () => {
    db.ruleMessageBodyLock.findFirst.mockResolvedValue(existingLock({ isActive: false }));

    await expect(createRule(ruleInput())).resolves.toBe(CREATED_RULE);
  });

  test("mentions the business hours when the clash is time-scoped", async () => {
    db.ruleMessageBodyLock.findFirst.mockResolvedValue(existingLock());

    await expect(
      createRule(
        ruleInput({ options: { businessHours: { enabled: true, businessHoursId: "bh-1" } } }),
      ),
    ).rejects.toThrow(/during the configured business hours/);
  });

  test("refuses the same keyword used twice inside one rule", async () => {
    const groups = [
      {
        operator: "AND",
        conditions: [
          { field: "MESSAGE_BODY", operator: "CONTAINS", value: "hello" },
          { field: "MESSAGE_BODY", operator: "EQUALS", value: "hello" },
        ],
      },
    ];

    await expect(createRule(ruleInput({ groups }))).rejects.toThrow(
      /Duplicate message body and business hour combination/,
    );
  });

  test("allows the same keyword twice when the rule never reaches the check", async () => {
    // Two different keywords are not a duplicate.
    const groups = [
      {
        operator: "AND",
        conditions: [
          { field: "MESSAGE_BODY", operator: "CONTAINS", value: "hello" },
          { field: "MESSAGE_BODY", operator: "CONTAINS", value: "hi" },
        ],
      },
    ];

    await expect(createRule(ruleInput({ groups }))).resolves.toBe(CREATED_RULE);
  });

  test("checks the keyword against this org only", async () => {
    await createRule(ruleInput());

    expect(db.ruleMessageBodyLock.findFirst.mock.calls[0][0].where).toMatchObject({
      orgId: "org-1",
      messageBody: "hello",
      platform: "WHATSAPP",
      businessHourId: null,
    });
  });

  test("trims a keyword before reserving it", async () => {
    const groups = [
      {
        operator: "AND",
        conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "  hello  " }],
      },
    ];

    await createRule(ruleInput({ groups }));

    expect(db.ruleMessageBodyLock.findFirst.mock.calls[0][0].where.messageBody).toBe("hello");
  });

  test("ignores a blank keyword entirely", async () => {
    const groups = [
      {
        operator: "AND",
        conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "   " }],
      },
    ];

    await createRule(ruleInput({ groups }));

    expect(db.ruleMessageBodyLock.findFirst).not.toHaveBeenCalled();
  });

  test("ignores conditions that are not about the message body", async () => {
    const groups = [
      {
        operator: "AND",
        conditions: [{ field: "CONTACT_EMAIL", operator: "CONTAINS", value: "acme.com" }],
      },
    ];

    await createRule(ruleInput({ groups }));

    expect(db.ruleMessageBodyLock.findFirst).not.toHaveBeenCalled();
  });

  test.each([["INSTAGRAM_COMMENT"], ["INSTAGRAM_STORY_MENTION"]])(
    "skips keyword locking entirely for a %s rule",
    async (triggerEvent) => {
      await createRule(ruleInput({ triggerEvent }));

      expect(db.ruleMessageBodyLock.findFirst).not.toHaveBeenCalled();
      expect(tx.ruleMessageBodyLock.createMany).not.toHaveBeenCalled();
    },
  );
});

describe("updateRule", () => {
  const existing = {
    orgId: "org-1",
    platform: "WHATSAPP",
    triggerEvent: "MESSAGE_RECEIVED",
    isActive: true,
    groups: [{ conditions: [{ field: "MESSAGE_BODY", value: "hello" }] }],
    options: null,
  };

  beforeEach(() => {
    db.rule.findUnique.mockResolvedValue(existing);
  });

  test("refuses to update a rule that does not exist", async () => {
    db.rule.findUnique.mockResolvedValue(null);

    await expect(updateRule("missing", { name: "New" } as any)).rejects.toThrow("Rule not found");
  });

  test("applies a plain field change", async () => {
    await updateRule("rule-1", { name: "Renamed" } as any);

    expect(tx.rule.update.mock.calls[0][0].data).toMatchObject({ name: "Renamed" });
  });

  test("replaces the groups when new ones are supplied", async () => {
    const groups = [
      {
        operator: "OR",
        conditions: [{ field: "MESSAGE_BODY", operator: "EQUALS", value: "hi" }],
      },
    ];

    await updateRule("rule-1", { groups } as any);

    const data = tx.rule.update.mock.calls[0][0].data;
    expect(data.groups.deleteMany).toEqual({});
    expect(data.groups.create[0].operator).toBe("OR");
  });

  test("clears the old keyword reservations before writing new groups", async () => {
    const groups = [
      {
        operator: "AND",
        conditions: [{ field: "MESSAGE_BODY", operator: "EQUALS", value: "hi" }],
      },
    ];

    await updateRule("rule-1", { groups } as any);

    expect(tx.ruleMessageBodyLock.deleteMany).toHaveBeenCalled();
    expect(tx.ruleMessageBodyLock.createMany).toHaveBeenCalled();
  });

  test("leaves groups and their reservations alone when none are supplied", async () => {
    await updateRule("rule-1", { name: "Renamed" } as any);

    expect(tx.rule.update.mock.calls[0][0].data.groups).toBeUndefined();
    expect(tx.ruleMessageBodyLock.deleteMany).not.toHaveBeenCalled();
  });

  test("replaces the actions only when new ones are supplied", async () => {
    await updateRule("rule-1", { actions: [{ type: "SEND_TEXT", value: "hi" }] } as any);

    expect(tx.rule.update.mock.calls[0][0].data.actions.deleteMany).toEqual({});
  });

  test("only touches options when they are explicitly given", async () => {
    await updateRule("rule-1", { name: "Renamed" } as any);
    expect(tx.rule.update.mock.calls[0][0].data.options).toBeUndefined();

    vi.clearAllMocks();
    db.rule.findUnique.mockResolvedValue(existing);
    tx.rule.update.mockResolvedValue(CREATED_RULE);
    await updateRule("rule-1", { options: null } as any);
    expect(tx.rule.update.mock.calls[0][0].data).toHaveProperty("options", null);
  });

  test("skips the keyword check entirely when the rule is being switched off", async () => {
    db.ruleMessageBodyLock.findFirst.mockResolvedValue(existingLock());
    const groups = [
      {
        operator: "AND",
        conditions: [{ field: "MESSAGE_BODY", operator: "EQUALS", value: "hello" }],
      },
    ];

    await expect(updateRule("rule-1", { isActive: false, groups } as any)).resolves.toBeDefined();
  });

  test("re-checks the existing keywords when switching a rule back on", async () => {
    db.rule.findUnique.mockResolvedValue({ ...existing, isActive: false });
    db.ruleMessageBodyLock.findFirst.mockResolvedValue(existingLock({ name: "Welcome" }));

    await expect(updateRule("rule-1", { isActive: true } as any)).rejects.toThrow(
      /already used by another active automation/,
    );
  });

  test("does not clash with the keyword this same rule already owns", async () => {
    db.ruleMessageBodyLock.findFirst.mockResolvedValue(existingLock({ ruleId: "rule-1" }));
    const groups = [
      {
        operator: "AND",
        conditions: [{ field: "MESSAGE_BODY", operator: "EQUALS", value: "hello" }],
      },
    ];

    await expect(updateRule("rule-1", { groups } as any)).resolves.toBeDefined();
  });

  test.each([["INSTAGRAM_COMMENT"], ["INSTAGRAM_STORY_MENTION"]])(
    "skips keyword locking when the rule becomes a %s rule",
    async (triggerEvent) => {
      const groups = [
        {
          operator: "AND",
          conditions: [{ field: "MESSAGE_BODY", operator: "EQUALS", value: "hello" }],
        },
      ];

      await updateRule("rule-1", { triggerEvent, groups } as any);

      expect(db.ruleMessageBodyLock.findFirst).not.toHaveBeenCalled();
      expect(tx.ruleMessageBodyLock.deleteMany).not.toHaveBeenCalled();
    },
  );
});

describe("deleteRule", () => {
  test("releases the rule's keywords before deleting it", async () => {
    await deleteRule("rule-1");

    expect(tx.ruleMessageBodyLock.deleteMany).toHaveBeenCalledWith({
      where: { ruleCondition: { group: { ruleId: "rule-1" } } },
    });
    expect(tx.rule.delete).toHaveBeenCalledWith({ where: { id: "rule-1" } });
  });

  test("does both in one transaction so a keyword is never orphaned", async () => {
    await deleteRule("rule-1");

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("reading rules", () => {
  test("lists an org's rules with their groups, conditions and actions", async () => {
    db.rule.findMany.mockResolvedValue([CREATED_RULE]);

    const result = await getAllRules("org-1");

    expect(db.rule.findMany.mock.calls[0][0]).toMatchObject({
      where: { orgId: "org-1" },
      include: { groups: { include: { conditions: true } }, actions: true },
    });
    expect(result).toEqual([CREATED_RULE]);
  });

  // NOTE: called with no orgId the filter is dropped and every org's rules come back.
  test("lists rules across all orgs when no org is named", async () => {
    await getAllRules();

    expect(db.rule.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  test("fetches one rule with everything attached", async () => {
    db.rule.findUnique.mockResolvedValue(CREATED_RULE);

    await expect(getRuleById("rule-1")).resolves.toBe(CREATED_RULE);
    expect(db.rule.findUnique.mock.calls[0][0].where).toEqual({ id: "rule-1" });
  });

  test("returns null for a rule that does not exist", async () => {
    await expect(getRuleById("missing")).resolves.toBeNull();
  });
});

describe("getRulesByAutomationId", () => {
  test("finds the rules whose action points at that automation", async () => {
    db.ruleAction.findMany.mockResolvedValue([
      { rule: { id: "rule-1" } },
      { rule: { id: "rule-2" } },
    ]);

    const result = await getRulesByAutomationId("auto-1", "org-1");

    expect(db.ruleAction.findMany.mock.calls[0][0].where).toEqual({
      value: { equals: "auto-1" },
      rule: { orgId: "org-1" },
    });
    expect(result).toEqual([{ id: "rule-1" }, { id: "rule-2" }]);
  });

  test("returns an empty list when no rule uses that automation", async () => {
    await expect(getRulesByAutomationId("auto-1", "org-1")).resolves.toEqual([]);
  });
});
