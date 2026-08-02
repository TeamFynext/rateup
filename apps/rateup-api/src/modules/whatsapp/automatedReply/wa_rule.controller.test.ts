import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./wa_rule.service.js", () => ({
  createRule: vi.fn(),
  deleteRule: vi.fn(),
  getAllRules: vi.fn(),
  getRuleById: vi.fn(),
  getRulesByAutomationId: vi.fn(),
  updateRule: vi.fn(),
}));

vi.mock("../../../../generated/prisma/internal/prismaNamespace.js", () => ({
  PrismaClientKnownRequestError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

import * as RuleService from "./wa_rule.service.js";
import { PrismaClientKnownRequestError } from "../../../../generated/prisma/internal/prismaNamespace.js";
import {
  createRuleHandler,
  deleteRuleHandler,
  getAllRulesHandler,
  getRuleByIdHandler,
  getRulesByAutomationIdHandler,
  updateRuleHandler,
} from "./wa_rule.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const svc = RuleService as unknown as Record<string, Mock>;

const RULE = { id: "rule-1", name: "Greeting" };

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    status: vi.fn((c: number) => {
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

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    user: { orgId: "org-1", userId: "user-1" },
    log: { error: vi.fn() },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.createRule.mockResolvedValue(RULE);
  svc.getAllRules.mockResolvedValue([RULE]);
  svc.getRuleById.mockResolvedValue(RULE);
  svc.updateRule.mockResolvedValue(RULE);
  svc.deleteRule.mockResolvedValue(RULE);
  svc.getRulesByAutomationId.mockResolvedValue([RULE]);
});

describe("createRuleHandler", () => {
  test("creates the rule against the caller's own org", async () => {
    const reply = makeReply();

    await createRuleHandler(makeRequest({ body: { name: "Greeting" } }), reply);

    expect(svc.createRule).toHaveBeenCalledWith({ name: "Greeting", orgId: "org-1" });
    expect(reply.payload).toBe(RULE);
  });

  test("overrides an orgId the caller puts in the body", async () => {
    await createRuleHandler(
      makeRequest({ body: { name: "Greeting", orgId: "org-victim" } }),
      makeReply(),
    );

    expect(svc.createRule.mock.calls[0][0].orgId).toBe("org-1");
  });

  test("explains a duplicate rule name as a 400 rather than a server error", async () => {
    svc.createRule.mockRejectedValue(
      new (PrismaClientKnownRequestError as any)("Unique constraint", "P2002"),
    );
    const reply = makeReply();

    await createRuleHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({
      error: "Failed to create rule",
      message: "Rule with the same name already exists in the organization",
    });
  });

  test("passes a keyword clash through as a 500 with its own message", async () => {
    svc.createRule.mockRejectedValue(
      new Error("Keyword 'hello' is already used by another active automation."),
    );
    const reply = makeReply();

    await createRuleHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      error: "Failed to create rule",
      message: "Keyword 'hello' is already used by another active automation.",
    });
  });

  test("falls back to a generic message when the failure is not an Error", async () => {
    svc.createRule.mockRejectedValue("something odd");
    const reply = makeReply();

    await createRuleHandler(makeRequest(), reply);

    expect(reply.payload).toMatchObject({ message: "Unknown error" });
  });

  test("logs the failure against the request", async () => {
    svc.createRule.mockRejectedValue(new Error("boom"));
    const request = makeRequest();

    await createRuleHandler(request, makeReply());

    expect(request.log.error).toHaveBeenCalled();
  });

  test("does not log a duplicate-name refusal as a server fault", async () => {
    svc.createRule.mockRejectedValue(
      new (PrismaClientKnownRequestError as any)("Unique constraint", "P2002"),
    );
    const request = makeRequest();

    await createRuleHandler(request, makeReply());

    expect(request.log.error).not.toHaveBeenCalled();
  });

  // A different Prisma error is not the name clash, so it must not claim to be one.
  test("does not mistake another Prisma error for a duplicate name", async () => {
    svc.createRule.mockRejectedValue(
      new (PrismaClientKnownRequestError as any)("FK violated", "P2003"),
    );
    const reply = makeReply();

    await createRuleHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});

describe("getAllRulesHandler", () => {
  test("lists the caller's org's rules", async () => {
    const reply = makeReply();

    await getAllRulesHandler(makeRequest(), reply);

    expect(svc.getAllRules).toHaveBeenCalledWith("org-1");
    expect(reply.payload).toEqual([RULE]);
  });

  test("returns 500 when listing fails", async () => {
    svc.getAllRules.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getAllRulesHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ error: "Failed to fetch rules", message: "db down" });
  });
});

describe("getRuleByIdHandler", () => {
  test("returns the rule named in the path", async () => {
    const reply = makeReply();

    await getRuleByIdHandler(makeRequest({ params: { id: "rule-1" } }), reply);

    expect(svc.getRuleById).toHaveBeenCalledWith("rule-1", "org-1");
    expect(reply.payload).toBe(RULE);
  });

  test("returns 404 for a rule that does not exist", async () => {
    svc.getRuleById.mockResolvedValue(null);
    const reply = makeReply();

    await getRuleByIdHandler(makeRequest({ params: { id: "missing" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.payload).toEqual({ error: "Rule not found" });
  });

  // The lookup is scoped to the caller's org, so another org's rule comes back null
  // and is answered 404 — indistinguishable from one that never existed.
  test("refuses a rule that belongs to another org", async () => {
    svc.getRuleById.mockResolvedValue(null);
    const reply = makeReply();

    await getRuleByIdHandler(
      makeRequest({ params: { id: "rule-victim" }, user: { orgId: "org-attacker" } }),
      reply,
    );

    expect(svc.getRuleById).toHaveBeenCalledWith("rule-victim", "org-attacker");
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.payload).toEqual({ error: "Rule not found" });
  });

  test("returns 500 when the lookup throws", async () => {
    svc.getRuleById.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getRuleByIdHandler(makeRequest({ params: { id: "rule-1" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});

describe("updateRuleHandler", () => {
  test("applies the change to the rule named in the path", async () => {
    const reply = makeReply();

    await updateRuleHandler(
      makeRequest({ params: { id: "rule-1" }, body: { name: "Renamed" } }),
      reply,
    );

    expect(svc.updateRule).toHaveBeenCalledWith("rule-1", { name: "Renamed" });
    expect(reply.payload).toBe(RULE);
  });

  test("surfaces a keyword clash raised by the update", async () => {
    svc.updateRule.mockRejectedValue(new Error("Keyword 'hello' is already used"));
    const reply = makeReply();

    await updateRuleHandler(makeRequest({ params: { id: "rule-1" }, body: {} }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ message: "Keyword 'hello' is already used" });
  });

  test("surfaces a missing rule as a 500 rather than a 404", async () => {
    svc.updateRule.mockRejectedValue(new Error("Rule not found"));
    const reply = makeReply();

    await updateRuleHandler(makeRequest({ params: { id: "missing" }, body: {} }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });

  // NOTE: nothing checks the rule belongs to the caller's org before updating it.
  test("does not scope the update to the caller's org", async () => {
    await updateRuleHandler(
      makeRequest({ params: { id: "rule-victim" }, body: { name: "hijacked" } }),
      makeReply(),
    );

    expect(svc.updateRule).toHaveBeenCalledWith("rule-victim", { name: "hijacked" });
  });
});

describe("deleteRuleHandler", () => {
  test("deletes the rule and reports success", async () => {
    const reply = makeReply();

    await deleteRuleHandler(makeRequest({ params: { id: "rule-1" } }), reply);

    expect(svc.deleteRule).toHaveBeenCalledWith("rule-1");
    expect(reply.payload).toEqual({ success: true });
  });

  test("returns 500 when the delete fails", async () => {
    svc.deleteRule.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await deleteRuleHandler(makeRequest({ params: { id: "rule-1" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ error: "Failed to delete rule" });
  });

  // NOTE: same gap as update — the id alone decides what gets deleted.
  test("does not scope the delete to the caller's org", async () => {
    await deleteRuleHandler(makeRequest({ params: { id: "rule-victim" } }), makeReply());

    expect(svc.deleteRule).toHaveBeenCalledWith("rule-victim");
  });
});

describe("getRulesByAutomationIdHandler", () => {
  test("lists the rules driving that automation, scoped to the caller's org", async () => {
    const reply = makeReply();

    await getRulesByAutomationIdHandler(makeRequest({ params: { automationId: "auto-1" } }), reply);

    expect(svc.getRulesByAutomationId).toHaveBeenCalledWith("auto-1", "org-1");
    expect(reply.payload).toEqual([RULE]);
  });

  test("returns 500 when the lookup throws", async () => {
    svc.getRulesByAutomationId.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getRulesByAutomationIdHandler(makeRequest({ params: { automationId: "auto-1" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});
