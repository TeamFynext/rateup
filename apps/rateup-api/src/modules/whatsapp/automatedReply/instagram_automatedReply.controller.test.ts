import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./instagram_automatedReply.service.js", () => ({
  createInstagramAutomatedReply: vi.fn(),
  deleteInstagramAutomatedReply: vi.fn(),
  getInstagramAutomatedRepliesByOrgId: vi.fn(),
  getInstagramAutomatedReplyById: vi.fn(),
  updateInstagramAutomatedReply: vi.fn(),
}));

vi.mock("./instagram_automation.service.js", () => ({
  startInstagramAutomationFlow: vi.fn(),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  createInstagramAutomatedReply,
  deleteInstagramAutomatedReply,
  getInstagramAutomatedRepliesByOrgId,
  getInstagramAutomatedReplyById,
  updateInstagramAutomatedReply,
} from "./instagram_automatedReply.service.js";
import { startInstagramAutomationFlow } from "./instagram_automation.service.js";
import { log } from "../../../utils/logger.js";
import {
  createInstagramAutomationHandler,
  deleteInstagramAutomationHandler,
  getInstagramAutomationByIdHandler,
  getInstagramAutomationsHandler,
  initiateInstagramAutomationHandler,
  updateInstagramAutomationHandler,
} from "./instagram_automatedReply.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  list: getInstagramAutomatedRepliesByOrgId as unknown as Mock,
  getById: getInstagramAutomatedReplyById as unknown as Mock,
  create: createInstagramAutomatedReply as unknown as Mock,
  update: updateInstagramAutomatedReply as unknown as Mock,
  remove: deleteInstagramAutomatedReply as unknown as Mock,
  startFlow: startInstagramAutomationFlow as unknown as Mock,
};

const AUTOMATION = { id: "ig-auto-1", orgId: "org-1", name: "Comment reply" };
/** The same automation, but owned by somebody else. */
const OTHER_ORGS_AUTOMATION = { id: "ig-auto-9", orgId: "org-victim", name: "Theirs" };

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
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.list.mockResolvedValue([AUTOMATION]);
  m.getById.mockResolvedValue(AUTOMATION);
  m.create.mockResolvedValue(AUTOMATION);
  m.update.mockResolvedValue(AUTOMATION);
  m.remove.mockResolvedValue({ success: true });
  m.startFlow.mockResolvedValue(undefined);
});

describe("getInstagramAutomationsHandler", () => {
  test("lists the caller's org's automations", async () => {
    const reply = makeReply();

    await getInstagramAutomationsHandler(makeRequest(), reply);

    expect(m.list).toHaveBeenCalledWith("org-1");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ success: true, data: [AUTOMATION] });
  });

  test("returns 500 when listing fails", async () => {
    m.list.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getInstagramAutomationsHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      success: false,
      error: "Failed to fetch Instagram automations",
    });
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getInstagramAutomationByIdHandler", () => {
  test("returns the automation when the caller owns it", async () => {
    const reply = makeReply();

    await getInstagramAutomationByIdHandler(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ success: true, data: AUTOMATION });
  });

  test("returns 404 when there is no such automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await getInstagramAutomationByIdHandler(makeRequest({ params: { id: "missing" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toMatchObject({ error: "Instagram automation not found" });
  });

  test("refuses an automation belonging to another org", async () => {
    m.getById.mockResolvedValue(OTHER_ORGS_AUTOMATION);
    const reply = makeReply();

    await getInstagramAutomationByIdHandler(makeRequest({ params: { id: "ig-auto-9" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({
      success: false,
      error: "Unauthorized access to this automation",
    });
  });

  test("returns 500 when the lookup throws", async () => {
    m.getById.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getInstagramAutomationByIdHandler(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("createInstagramAutomationHandler", () => {
  test("creates the automation for the caller's org", async () => {
    const reply = makeReply();
    const body = {
      name: "Comment reply",
      matchData: { keywords: ["price"] },
      whatsappSettingsPhoneId: "phone-1",
    };

    await createInstagramAutomationHandler(makeRequest({ body }), reply);

    expect(m.create).toHaveBeenCalledWith({ orgId: "org-1", ...body });
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.payload).toEqual({ success: true, data: AUTOMATION });
  });

  test("ignores an orgId smuggled into the body", async () => {
    await createInstagramAutomationHandler(
      makeRequest({ body: { name: "A", matchData: {}, orgId: "org-victim" } }),
      makeReply(),
    );

    expect(m.create.mock.calls[0][0].orgId).toBe("org-1");
  });

  test("returns 500 when creation fails", async () => {
    m.create.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await createInstagramAutomationHandler(makeRequest({ body: { name: "A" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ error: "Failed to create Instagram automation" });
  });
});

describe("updateInstagramAutomationHandler", () => {
  test("checks ownership before applying the change", async () => {
    const reply = makeReply();

    await updateInstagramAutomationHandler(
      makeRequest({ params: { id: "ig-auto-1" }, body: { name: "Renamed" } }),
      reply,
    );

    expect(m.getById).toHaveBeenCalledWith("ig-auto-1");
    expect(m.update).toHaveBeenCalledWith("ig-auto-1", { name: "Renamed" });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 404 without updating when there is no such automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await updateInstagramAutomationHandler(
      makeRequest({ params: { id: "missing" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.update).not.toHaveBeenCalled();
  });

  test("refuses to update another org's automation", async () => {
    m.getById.mockResolvedValue(OTHER_ORGS_AUTOMATION);
    const reply = makeReply();

    await updateInstagramAutomationHandler(
      makeRequest({ params: { id: "ig-auto-9" }, body: { name: "hijacked" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(m.update).not.toHaveBeenCalled();
  });

  test("returns 500 when the update throws", async () => {
    m.update.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await updateInstagramAutomationHandler(
      makeRequest({ params: { id: "ig-auto-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteInstagramAutomationHandler", () => {
  test("checks ownership before deleting", async () => {
    const reply = makeReply();

    await deleteInstagramAutomationHandler(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(m.remove).toHaveBeenCalledWith("ig-auto-1");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({
      success: true,
      message: "Instagram automation deleted successfully",
    });
  });

  test("returns 404 without deleting when there is no such automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await deleteInstagramAutomationHandler(makeRequest({ params: { id: "missing" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.remove).not.toHaveBeenCalled();
  });

  test("refuses to delete another org's automation", async () => {
    m.getById.mockResolvedValue(OTHER_ORGS_AUTOMATION);
    const reply = makeReply();

    await deleteInstagramAutomationHandler(makeRequest({ params: { id: "ig-auto-9" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(m.remove).not.toHaveBeenCalled();
  });

  test("returns 500 when the delete throws", async () => {
    m.remove.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await deleteInstagramAutomationHandler(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("initiateInstagramAutomationHandler", () => {
  const body = { igsId: "igs-1", ibaId: "iba-1" };

  test("starts the flow for the named Instagram user", async () => {
    const reply = makeReply();

    await initiateInstagramAutomationHandler(
      makeRequest({ params: { id: "ig-auto-1" }, body }),
      reply,
    );

    expect(m.startFlow).toHaveBeenCalledWith("igs-1", AUTOMATION, "org-1", "iba-1");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toMatchObject({ success: true });
  });

  test("returns 404 without starting anything for an unknown automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await initiateInstagramAutomationHandler(
      makeRequest({ params: { id: "missing" }, body }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.startFlow).not.toHaveBeenCalled();
  });

  test("refuses to fire another org's automation", async () => {
    m.getById.mockResolvedValue(OTHER_ORGS_AUTOMATION);
    const reply = makeReply();

    await initiateInstagramAutomationHandler(
      makeRequest({ params: { id: "ig-auto-9" }, body }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(m.startFlow).not.toHaveBeenCalled();
  });

  test("returns 500 when starting the flow fails", async () => {
    m.startFlow.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await initiateInstagramAutomationHandler(
      makeRequest({ params: { id: "ig-auto-1" }, body }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ error: "Failed to initiate Instagram automation" });
  });
});
