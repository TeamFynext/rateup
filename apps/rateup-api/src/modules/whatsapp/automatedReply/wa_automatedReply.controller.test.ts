import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./wa_automatedReply.service.js", () => ({
  cloneAutomatedReply: vi.fn(),
  createAutomatedReply: vi.fn(),
  deleteAutomatedReply: vi.fn(),
  getAutomatedRepliesByOrgId: vi.fn(),
  getAutomatedRepliesMessagId: vi.fn(),
  getAutomatedReplyById: vi.fn(),
  updateAutomatedReply: vi.fn(),
  verifyAutomationTriggerLimit: vi.fn(),
}));

vi.mock("../whatsappSurvey/wasurvey.controller.js", () => ({ handleAutomatedReply: vi.fn() }));

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { keys: vi.fn(async () => []), del: vi.fn() },
  integrationTriggerQueue: { add: vi.fn() },
  notificationQueue: { add: vi.fn() },
  sendMessageQueue: { add: vi.fn() },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  cloneAutomatedReply,
  createAutomatedReply,
  deleteAutomatedReply,
  getAutomatedRepliesByOrgId,
  getAutomatedRepliesMessagId,
  getAutomatedReplyById,
  updateAutomatedReply,
  verifyAutomationTriggerLimit,
} from "./wa_automatedReply.service.js";
import { handleAutomatedReply } from "../whatsappSurvey/wasurvey.controller.js";
import connection from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import {
  cloneAutomatedReplyHandler,
  createAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAllAutomatedRepliesByOrgIdHandler,
  getAutomatedRepliesByIdHandler,
  getAutomatedRepliesMessagIdHandler,
  initiateAutomatedReplyByIdHandler,
  updateAutomatedReplyHandler,
  verifyAutomationTriggerLimitHandler,
} from "./wa_automatedReply.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  getMessages: getAutomatedRepliesMessagId as unknown as Mock,
  listByOrg: getAutomatedRepliesByOrgId as unknown as Mock,
  getById: getAutomatedReplyById as unknown as Mock,
  create: createAutomatedReply as unknown as Mock,
  clone: cloneAutomatedReply as unknown as Mock,
  update: updateAutomatedReply as unknown as Mock,
  remove: deleteAutomatedReply as unknown as Mock,
  verifyLimit: verifyAutomationTriggerLimit as unknown as Mock,
  handleAutomatedReply: handleAutomatedReply as unknown as Mock,
};

const redis = connection as unknown as { keys: Mock; del: Mock };

const AUTOMATION = { id: "auto-1", name: "Greeting" };

/** A Prisma unique-constraint failure, as the handlers recognise it. */
function uniqueConstraint() {
  const error: any = new Error("Unique constraint failed");
  error.code = "P2002";
  return error;
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
  m.getMessages.mockResolvedValue([]);
  m.listByOrg.mockResolvedValue([AUTOMATION]);
  m.getById.mockResolvedValue(AUTOMATION);
  m.create.mockResolvedValue(AUTOMATION);
  m.clone.mockResolvedValue({ ...AUTOMATION, id: "auto-2" });
  m.update.mockResolvedValue(AUTOMATION);
  m.remove.mockResolvedValue(AUTOMATION);
  m.verifyLimit.mockResolvedValue(true);
  m.handleAutomatedReply.mockResolvedValue({ sent: true });
  redis.keys.mockResolvedValue([]);
  redis.del.mockResolvedValue(1);
});

describe("reading automations", () => {
  test("lists an automation's messages within the caller's org", async () => {
    const reply = makeReply();

    await getAutomatedRepliesMessagIdHandler(makeRequest({ params: { id: "auto-1" } }), reply);

    expect(m.getMessages).toHaveBeenCalledWith("auto-1", "org-1");
    expect(reply.payload).toEqual([]);
  });

  test("lists the caller's org's automations", async () => {
    const reply = makeReply();

    await getAllAutomatedRepliesByOrgIdHandler(makeRequest(), reply);

    expect(m.listByOrg).toHaveBeenCalledWith("org-1");
    expect(reply.payload).toEqual([AUTOMATION]);
  });

  test("returns the automation named in the path", async () => {
    const reply = makeReply();

    await getAutomatedRepliesByIdHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" } }),
      reply,
    );

    expect(m.getById).toHaveBeenCalledWith("auto-1");
    expect(reply.payload).toBe(AUTOMATION);
  });

  // NOTE: none of these three handlers has a try/catch, so a service failure escapes
  // to Fastify's default error handler instead of becoming a controlled reply.
  test.each([
    ["messages", getAutomatedRepliesMessagIdHandler, "getMessages"],
    ["the org list", getAllAutomatedRepliesByOrgIdHandler, "listByOrg"],
    ["one automation", getAutomatedRepliesByIdHandler, "getById"],
  ])("lets a failure reading %s propagate", async (_name, handler, key) => {
    (m as any)[key].mockRejectedValue(new Error("db down"));

    await expect((handler as any)(makeRequest({ params: {} }), makeReply())).rejects.toThrow(
      "db down",
    );
  });

  // NOTE: the fetch is by id alone — nothing ties it to the caller's org.
  test("returns an automation belonging to another org", async () => {
    m.getById.mockResolvedValue({ id: "auto-victim", orgId: "org-victim" });
    const reply = makeReply();

    await getAutomatedRepliesByIdHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-victim" } }),
      reply,
    );

    expect(reply.payload).toMatchObject({ orgId: "org-victim" });
  });
});

describe("createAutomatedReplyHandler", () => {
  test("creates the automation for the caller's org", async () => {
    const reply = makeReply();
    const body = { name: "Greeting", matchData: { keywords: ["hi"] } };

    await createAutomatedReplyHandler(makeRequest({ body }), reply);

    expect(m.create).toHaveBeenCalledWith(body, "org-1");
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.payload).toBe(AUTOMATION);
  });

  test("explains a keyword clash as a 409", async () => {
    m.create.mockRejectedValue(uniqueConstraint());
    const reply = makeReply();

    await createAutomatedReplyHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(409);
    expect(reply.payload).toBe("Some specified keywords already exist for this organization.");
    expect(log.error).not.toHaveBeenCalled();
  });

  test("returns 500 with the failure's own message for anything else", async () => {
    m.create.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await createAutomatedReplyHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toBe("db down");
    expect(log.error).toHaveBeenCalled();
  });

  test("falls back to a generic message when the failure carries none", async () => {
    m.create.mockRejectedValue({});
    const reply = makeReply();

    await createAutomatedReplyHandler(makeRequest(), reply);

    expect(reply.payload).toBe("error in creating automatedReply");
  });
});

describe("cloneAutomatedReplyHandler", () => {
  test("clones the automation within the caller's org", async () => {
    const reply = makeReply();

    await cloneAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: { name: "Copy" } }),
      reply,
    );

    expect(m.clone).toHaveBeenCalledWith("auto-1", "org-1", "Copy");
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  test("lets the service name the copy when the request does not", async () => {
    await cloneAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: {} }),
      makeReply(),
    );

    expect(m.clone).toHaveBeenCalledWith("auto-1", "org-1", undefined);
  });

  test("returns 404 when the automation is not this org's to clone", async () => {
    m.clone.mockRejectedValue(new Error("Automated reply not found"));
    const reply = makeReply();

    await cloneAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-other" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toBe("Automated reply not found");
    expect(log.error).not.toHaveBeenCalled();
  });

  test("returns 500 for any other cloning failure", async () => {
    m.clone.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await cloneAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("updateAutomatedReplyHandler", () => {
  test("applies the change and answers with no content", async () => {
    const reply = makeReply();
    const body = { name: "Renamed" };

    await updateAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body }),
      reply,
    );

    expect(m.update).toHaveBeenCalledWith("auto-1", body, "org-1");
    expect(reply.code).toHaveBeenCalledWith(204);
    expect(reply.payload).toBeUndefined();
  });

  test("explains a keyword clash as a 409", async () => {
    m.update.mockRejectedValue(uniqueConstraint());
    const reply = makeReply();

    await updateAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(409);
  });

  test("returns 500 for any other update failure", async () => {
    m.update.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await updateAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toBe("db down");
  });
});

describe("deleteAutomatedReplyHandler", () => {
  test("deletes the automation and returns it", async () => {
    const reply = makeReply();

    await deleteAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" } }),
      reply,
    );

    expect(m.remove).toHaveBeenCalledWith("auto-1");
    expect(reply.payload).toBe(AUTOMATION);
  });

  test("clears the automation's round-robin counters from Redis", async () => {
    redis.keys.mockResolvedValue([
      "round_robin_index:org-1:auto-1:team-1",
      "round_robin_index:org-1:auto-1:team-2",
    ]);

    await deleteAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" } }),
      makeReply(),
    );

    expect(redis.keys).toHaveBeenCalledWith("round_robin_index:*:auto-1:*");
    expect(redis.del).toHaveBeenCalledWith(
      "round_robin_index:org-1:auto-1:team-1",
      "round_robin_index:org-1:auto-1:team-2",
    );
  });

  test("does not call Redis delete when there is nothing to clear", async () => {
    await deleteAutomatedReplyHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" } }),
      makeReply(),
    );

    expect(redis.del).not.toHaveBeenCalled();
  });

  // NOTE: no try/catch here either, and no org scoping on the delete.
  test("lets a delete failure propagate", async () => {
    m.remove.mockRejectedValue(new Error("db down"));

    await expect(
      deleteAutomatedReplyHandler(
        makeRequest({ params: { waAutomatedReplyId: "auto-1" } }),
        makeReply(),
      ),
    ).rejects.toThrow("db down");
  });
});

describe("initiateAutomatedReplyByIdHandler", () => {
  test("fires the automation at the requested phone number", async () => {
    const reply = makeReply();

    await initiateAutomatedReplyByIdHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: { phone: "15550001" } }),
      reply,
    );

    expect(m.handleAutomatedReply).toHaveBeenCalledWith(
      "org-1",
      null,
      null,
      "15550001",
      null,
      "auto-1",
    );
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ sent: true });
  });

  test("returns 500 when firing the automation fails", async () => {
    m.handleAutomatedReply.mockRejectedValue(new Error("send failed"));
    const reply = makeReply();

    await initiateAutomatedReplyByIdHandler(
      makeRequest({ params: { waAutomatedReplyId: "auto-1" }, body: { phone: "15550001" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("verifyAutomationTriggerLimitHandler", () => {
  test("lets the request through when automations are allowed", async () => {
    const reply = makeReply();

    await verifyAutomationTriggerLimitHandler(makeRequest(), reply);

    expect(m.verifyLimit).toHaveBeenCalledWith("org-1");
    expect(reply.code).not.toHaveBeenCalled();
  });

  test("refuses with a 403 when automations are not allowed", async () => {
    m.verifyLimit.mockResolvedValue(false);
    const reply = makeReply();

    await verifyAutomationTriggerLimitHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toBe("Automation Trigger is inactive or limit reached");
  });

  test("returns 500 when the check itself fails", async () => {
    m.verifyLimit.mockRejectedValue(new Error("no subscription"));
    const reply = makeReply();

    await verifyAutomationTriggerLimitHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});
