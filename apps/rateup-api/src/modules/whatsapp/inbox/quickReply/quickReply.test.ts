import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    whatsappQuickReply: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import {
  createWaQuickReply,
  deleteWaQuickReplyById,
  getWaQuickReplies,
  getWaQuickReplyById,
  updateWaQuickReplyById,
} from "./quickReply.service.js";
import {
  createWaQuickReplyHandler,
  deleteWaQuickReplyByIdHandler,
  getWaQuickRepliesHandler,
  getWaQuickReplyByIdHandler,
  updateWaQuickReplyByIdHandler,
} from "./quickReply.controller.js";

type Mock = ReturnType<typeof vi.fn>;

// The handlers run against the real service, so these assertions reach through to the
// query the module would actually issue.
const db = (prisma as unknown as { whatsappQuickReply: Record<string, Mock> }).whatsappQuickReply;

const QUICK_REPLY = {
  id: "qr-1",
  orgId: "org-1",
  text: "Thanks for reaching out!",
  category: "Greetings",
  topic: "Welcome",
  key: "/hi",
};

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

const NEW_QUICK_REPLY = {
  text: "Thanks for reaching out!",
  category: "Greetings",
  topic: "Welcome",
  key: "/hi",
};

beforeEach(() => {
  vi.clearAllMocks();
  db.create.mockResolvedValue(QUICK_REPLY);
  db.findMany.mockResolvedValue([QUICK_REPLY]);
  db.findUnique.mockResolvedValue(QUICK_REPLY);
  db.delete.mockResolvedValue(QUICK_REPLY);
  db.update.mockResolvedValue(QUICK_REPLY);
});

describe("quick reply service", () => {
  test("createWaQuickReply files the new reply under the given org", async () => {
    await createWaQuickReply(NEW_QUICK_REPLY, "org-1");

    expect(db.create).toHaveBeenCalledWith({ data: { ...NEW_QUICK_REPLY, orgId: "org-1" } });
  });

  test("getWaQuickReplies lists only that org's replies", async () => {
    const result = await getWaQuickReplies("org-1");

    expect(db.findMany).toHaveBeenCalledWith({ where: { orgId: "org-1" } });
    expect(result).toEqual([QUICK_REPLY]);
  });

  test("getWaQuickReplyById looks the reply up by its id", async () => {
    await getWaQuickReplyById("qr-1");

    expect(db.findUnique).toHaveBeenCalledWith({ where: { id: "qr-1" } });
  });

  test("deleteWaQuickReplyById removes the reply by its id", async () => {
    await deleteWaQuickReplyById("qr-1");

    expect(db.delete).toHaveBeenCalledWith({ where: { id: "qr-1" } });
  });

  test("updateWaQuickReplyById applies a partial change", async () => {
    await updateWaQuickReplyById("qr-1", { text: "Updated text" });

    expect(db.update).toHaveBeenCalledWith({
      where: { id: "qr-1" },
      data: { text: "Updated text" },
    });
  });
});

describe("createWaQuickReplyHandler", () => {
  test("creates the reply against the caller's own org", async () => {
    const reply = makeReply();

    await createWaQuickReplyHandler(makeRequest({ body: NEW_QUICK_REPLY }), reply);

    expect(db.create).toHaveBeenCalledWith({ data: { ...NEW_QUICK_REPLY, orgId: "org-1" } });
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual(QUICK_REPLY);
  });

  test("ignores an orgId the caller tries to smuggle in the body", async () => {
    await createWaQuickReplyHandler(
      makeRequest({ body: { ...NEW_QUICK_REPLY, orgId: "org-victim" } }),
      makeReply(),
    );

    expect(db.create.mock.calls[0][0].data.orgId).toBe("org-1");
  });

  test("returns 500 and logs when the write fails", async () => {
    db.create.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await createWaQuickReplyHandler(makeRequest({ body: NEW_QUICK_REPLY }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getWaQuickRepliesHandler", () => {
  test("lists the caller's org's replies", async () => {
    const reply = makeReply();

    await getWaQuickRepliesHandler(makeRequest(), reply);

    expect(db.findMany).toHaveBeenCalledWith({ where: { orgId: "org-1" } });
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual([QUICK_REPLY]);
  });

  test("sends an empty list when the org has no replies", async () => {
    db.findMany.mockResolvedValue([]);
    const reply = makeReply();

    await getWaQuickRepliesHandler(makeRequest(), reply);

    expect(reply.payload).toEqual([]);
  });

  test("returns 500 when the listing fails", async () => {
    db.findMany.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getWaQuickRepliesHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getWaQuickReplyByIdHandler", () => {
  test("fetches the reply named in the path", async () => {
    const reply = makeReply();

    await getWaQuickReplyByIdHandler(makeRequest({ params: { quickReplyId: "qr-1" } }), reply);

    expect(db.findUnique).toHaveBeenCalledWith({ where: { id: "qr-1" } });
    expect(reply.payload).toEqual(QUICK_REPLY);
  });

  // NOTE: a missing reply is answered 200 with a null body rather than 404, so the
  // client cannot tell "no such reply" from "a reply with no content".
  test("answers 200 with null for a reply that does not exist", async () => {
    db.findUnique.mockResolvedValue(null);
    const reply = makeReply();

    await getWaQuickReplyByIdHandler(makeRequest({ params: { quickReplyId: "missing" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toBeNull();
  });

  test("returns 500 when the lookup throws", async () => {
    db.findUnique.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getWaQuickReplyByIdHandler(makeRequest({ params: { quickReplyId: "qr-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteWaQuickReplyByIdHandler", () => {
  test("deletes the reply named in the path", async () => {
    const reply = makeReply();

    await deleteWaQuickReplyByIdHandler(makeRequest({ params: { quickReplyId: "qr-1" } }), reply);

    expect(db.delete).toHaveBeenCalledWith({ where: { id: "qr-1" } });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when the reply cannot be deleted", async () => {
    db.delete.mockRejectedValue(new Error("record not found"));
    const reply = makeReply();

    await deleteWaQuickReplyByIdHandler(makeRequest({ params: { quickReplyId: "qr-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("updateWaQuickReplyByIdHandler", () => {
  test("applies the change to the reply named in the path", async () => {
    const reply = makeReply();

    await updateWaQuickReplyByIdHandler(
      makeRequest({ params: { quickReplyId: "qr-1" }, body: { text: "Updated text" } }),
      reply,
    );

    expect(db.update).toHaveBeenCalledWith({
      where: { id: "qr-1" },
      data: { text: "Updated text" },
    });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("passes a multi-field change straight through", async () => {
    await updateWaQuickReplyByIdHandler(
      makeRequest({
        params: { quickReplyId: "qr-1" },
        body: { text: "New", category: "Closing", topic: "Bye", key: "/bye" },
      }),
      makeReply(),
    );

    expect(db.update.mock.calls[0][0].data).toEqual({
      text: "New",
      category: "Closing",
      topic: "Bye",
      key: "/bye",
    });
  });

  test("returns 500 when the update fails", async () => {
    db.update.mockRejectedValue(new Error("record not found"));
    const reply = makeReply();

    await updateWaQuickReplyByIdHandler(
      makeRequest({ params: { quickReplyId: "qr-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

// NOTE: create and list are scoped to the caller's org, but the by-id routes are not.
// Nothing in the query or the handler ties the row to request.user.orgId, so an
// authenticated user of one org can read, change or delete another org's quick reply
// by its id alone. These tests pin the missing scoping, not endorse it.
describe("cross-org access to a reply by id", () => {
  test("reads another org's reply without checking who owns it", async () => {
    db.findUnique.mockResolvedValue({ ...QUICK_REPLY, orgId: "org-victim" });
    const reply = makeReply();

    await getWaQuickReplyByIdHandler(
      makeRequest({ params: { quickReplyId: "qr-victim" }, user: { orgId: "org-attacker" } }),
      reply,
    );

    expect(db.findUnique).toHaveBeenCalledWith({ where: { id: "qr-victim" } });
    expect(reply.payload).toMatchObject({ orgId: "org-victim" });
  });

  test("deletes another org's reply without checking who owns it", async () => {
    const reply = makeReply();

    await deleteWaQuickReplyByIdHandler(
      makeRequest({ params: { quickReplyId: "qr-victim" }, user: { orgId: "org-attacker" } }),
      reply,
    );

    expect(db.delete).toHaveBeenCalledWith({ where: { id: "qr-victim" } });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("updates another org's reply without checking who owns it", async () => {
    await updateWaQuickReplyByIdHandler(
      makeRequest({
        params: { quickReplyId: "qr-victim" },
        body: { text: "overwritten" },
        user: { orgId: "org-attacker" },
      }),
      makeReply(),
    );

    expect(db.update.mock.calls[0][0].where).toEqual({ id: "qr-victim" });
  });
});
