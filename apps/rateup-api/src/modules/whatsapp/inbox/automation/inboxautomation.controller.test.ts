import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./inboxautomation.service.js", () => ({
  deleteInboxAutomation: vi.fn(),
  enableInboxAutomation: vi.fn(),
  getInboxAutomation: vi.fn(),
  runInboxAutomationCron: vi.fn(),
  updateInboxAutomation: vi.fn(),
}));

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  deleteInboxAutomation,
  enableInboxAutomation,
  getInboxAutomation,
  updateInboxAutomation,
} from "./inboxautomation.service.js";
import { log } from "../../../../utils/logger.js";
import {
  deleteInboxAutomationHandler,
  enableInboxAutomationHandler,
  getInboxAutomationHandler,
  updateInboxAutomationHandler,
} from "./inboxautomation.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  enable: enableInboxAutomation as unknown as Mock,
  get: getInboxAutomation as unknown as Mock,
  update: updateInboxAutomation as unknown as Mock,
  remove: deleteInboxAutomation as unknown as Mock,
};

const AUTOMATION = { id: "automation-1", condition: "ASSIGNED", active: true, closeAfterHours: 24 };

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

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    userId: "user-1",
    user: { orgId: "org-1", userId: "user-1", role: "ADMIN" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.enable.mockResolvedValue(AUTOMATION);
  m.get.mockResolvedValue(AUTOMATION);
  m.update.mockResolvedValue(AUTOMATION);
  m.remove.mockResolvedValue({ count: 1 });
});

describe("enableInboxAutomationHandler", () => {
  test("switches the named rule on for the caller's org", async () => {
    const reply = makeReply();

    await enableInboxAutomationHandler(makeRequest({ body: { condition: "ASSIGNED" } }), reply);

    expect(m.enable).toHaveBeenCalledWith("org-1", "ASSIGNED");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual(AUTOMATION);
  });

  test("cannot enable a rule for someone else's org", async () => {
    await enableInboxAutomationHandler(
      makeRequest({ body: { condition: "ASSIGNED", orgId: "org-victim" } }),
      makeReply(),
    );

    expect(m.enable).toHaveBeenCalledWith("org-1", "ASSIGNED");
  });

  test("returns 500 and logs when enabling fails", async () => {
    m.enable.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await enableInboxAutomationHandler(makeRequest({ body: { condition: "ASSIGNED" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getInboxAutomationHandler", () => {
  test("fetches the rule for the requested condition", async () => {
    const reply = makeReply();

    await getInboxAutomationHandler(makeRequest({ query: { condition: "UNASSIGNED" } }), reply);

    expect(m.get).toHaveBeenCalledWith("org-1", "UNASSIGNED");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("lists every rule when no condition is named", async () => {
    m.get.mockResolvedValue([AUTOMATION]);
    const reply = makeReply();

    await getInboxAutomationHandler(makeRequest({ query: {} }), reply);

    expect(m.get).toHaveBeenCalledWith("org-1", undefined);
    expect(reply.payload).toEqual([AUTOMATION]);
  });

  test("returns 500 when the lookup throws", async () => {
    m.get.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getInboxAutomationHandler(makeRequest({ query: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("updateInboxAutomationHandler", () => {
  test("splits the condition out of the body and applies the rest as changes", async () => {
    const reply = makeReply();

    await updateInboxAutomationHandler(
      makeRequest({ body: { condition: "ASSIGNED", active: false, closeAfterHours: 48 } }),
      reply,
    );

    expect(m.update).toHaveBeenCalledWith("org-1", "ASSIGNED", {
      active: false,
      closeAfterHours: 48,
    });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("sends an empty change set when only the condition is given", async () => {
    await updateInboxAutomationHandler(
      makeRequest({ body: { condition: "ASSIGNED" } }),
      makeReply(),
    );

    expect(m.update).toHaveBeenCalledWith("org-1", "ASSIGNED", {});
  });

  test("returns 500 when the update throws", async () => {
    m.update.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await updateInboxAutomationHandler(makeRequest({ body: { condition: "ASSIGNED" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteInboxAutomationHandler", () => {
  test("removes the rule for the requested condition", async () => {
    const reply = makeReply();

    await deleteInboxAutomationHandler(makeRequest({ query: { condition: "ASSIGNED" } }), reply);

    expect(m.remove).toHaveBeenCalledWith("org-1", "ASSIGNED");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ count: 1 });
  });

  test("returns 500 when the delete throws", async () => {
    m.remove.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await deleteInboxAutomationHandler(makeRequest({ query: { condition: "ASSIGNED" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});
