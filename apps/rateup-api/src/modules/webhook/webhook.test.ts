import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    webhook: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/redisConnection.js", () => ({
  outgoingWebhookQueue: { add: vi.fn() },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { outgoingWebhookQueue } from "../../utils/redisConnection.js";
import { checkSession } from "../../utils/checkSession.js";
import {
  deleteWebhook,
  enqueueWebhookDispatch,
  getWebhook,
  upsertWebhook,
  verifyWebhookUrl,
} from "./webhook.service.js";
import {
  deleteWebhookHandler,
  getWebhookHandler,
  saveWebhookHandler,
} from "./webhook.controller.js";
import { webhookRoutes } from "./webhook.route.js";
import { saveWebhookSchema } from "./webhook.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { webhook: Record<string, Mock> };

const ORG = "11111111-1111-1111-1111-111111111111";
const TOKEN = "challenge-token";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

const okResponse = (body: string) => ({ ok: true, status: 200, text: async () => body });

let fetchMock: Mock;

beforeEach(() => {
  vi.clearAllMocks();
  db.webhook.upsert.mockResolvedValue({ id: "w-1", orgId: ORG });
  db.webhook.findUnique.mockResolvedValue(null);
  db.webhook.delete.mockResolvedValue({ id: "w-1" });
  (outgoingWebhookQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
  fetchMock = vi.fn(async () => okResponse(TOKEN)) as unknown as Mock;
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===========================================================================
// verifyWebhookUrl — the server fetches whatever it is given
// ===========================================================================

describe("verifyWebhookUrl", () => {
  test("issues a GET to the caller's URL with the challenge appended", async () => {
    await verifyWebhookUrl("https://hooks.example.test/rateup", TOKEN);

    expect(fetchMock.mock.calls[0][0]).toBe(`https://hooks.example.test/rateup?challenge=${TOKEN}`);
  });

  test("accepts only an exact echo of the token", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(TOKEN));
    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(true);

    fetchMock.mockResolvedValueOnce(okResponse("something else"));
    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(false);
  });

  test("tolerates surrounding whitespace in the echo", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(`\n  ${TOKEN}  \n`));

    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(true);
  });

  test("rejects a non-2xx without reading the body", async () => {
    const text = vi.fn();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text });

    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(false);
    expect(text).not.toHaveBeenCalled();
  });

  test("bounds the request at five seconds", async () => {
    await verifyWebhookUrl("https://x.test", TOKEN);

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  // NOTE: no allowlist, no host or address check. The URL is whatever the
  // authenticated caller sent, and the request is made before anything decides
  // whether the answer was acceptable.
  test("fetches an internal host as readily as an external one", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("not the token"));

    await verifyWebhookUrl("https://internal-admin.svc.cluster.local/health", TOKEN);

    expect(fetchMock.mock.calls[0][0]).toContain("internal-admin.svc.cluster.local");
  });

  // NOTE: fetch defaults to redirect: "follow" and nothing overrides it here,
  // so the schema's https-only rule constrains the first hop only.
  test("sets no redirect policy, so the https rule covers only the first hop", async () => {
    await verifyWebhookUrl("https://x.test", TOKEN);

    expect(fetchMock.mock.calls[0][1].redirect).toBeUndefined();
  });

  // NOTE: a caller learns reachable-from-the-server versus not, because the two
  // outcomes are distinguishable in the response the endpoint returns.
  test("a connection failure is a distinguishable false, and is logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(verifyWebhookUrl("https://10.0.0.5:8080", TOKEN)).resolves.toBe(false);
    expect(log.warn).toHaveBeenCalled();
  });

  test("a timeout is also a false rather than an error", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "TimeoutError" }));

    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(false);
  });

  test("encodes the token into the query string", async () => {
    await verifyWebhookUrl("https://x.test", "a b&c=d");

    expect(fetchMock.mock.calls[0][0]).toBe("https://x.test?challenge=a%20b%26c%3Dd");
  });

  // NOTE: a URL that already carries a query gets a second `?`, so the
  // challenge is not a parameter the receiver can read.
  test("appends a second question mark to a URL that already has a query", async () => {
    await verifyWebhookUrl("https://x.test/hook?tenant=1", TOKEN);

    expect(fetchMock.mock.calls[0][0]).toBe(`https://x.test/hook?tenant=1?challenge=${TOKEN}`);
  });
});

// ===========================================================================
// The optional token that cannot be omitted
// ===========================================================================

describe("the verify token", () => {
  test("the schema marks it optional", () => {
    const parsed = saveWebhookSchema.safeParse({
      url: "https://x.test",
      events: ["message_status"],
    });

    expect(parsed.success).toBe(true);
    expect((parsed as any).data.verifyToken).toBeUndefined();
  });

  // NOTE: with no token the challenge reads `?challenge=undefined`, and the
  // comparison is against undefined, which no string equals — so verification
  // can never pass.
  test("omitting it sends the string undefined as the challenge", async () => {
    await verifyWebhookUrl("https://x.test", undefined as never);

    expect(fetchMock.mock.calls[0][0]).toBe("https://x.test?challenge=undefined");
  });

  test("omitting it fails verification whatever the receiver echoes", async () => {
    fetchMock.mockResolvedValue(okResponse("undefined"));

    await expect(verifyWebhookUrl("https://x.test", undefined as never)).resolves.toBe(false);
  });

  test("so a save with no token is always rejected", async () => {
    fetchMock.mockResolvedValue(okResponse("anything"));
    const rep = reply();

    await saveWebhookHandler(
      { user: { orgId: ORG }, body: { url: "https://x.test", events: [] } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "Webhook URL challenge verification failed" },
    });
    expect(db.webhook.upsert).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// saveWebhookHandler
// ===========================================================================

describe("saveWebhookHandler", () => {
  const body = {
    url: "https://hooks.example.test/rateup",
    events: ["message_status"],
    verifyToken: TOKEN,
  };

  test("stores the webhook against the session org once verified", async () => {
    const rep = reply();

    await saveWebhookHandler({ user: { orgId: ORG }, body } as never, rep);

    expect(db.webhook.upsert).toHaveBeenCalledWith({
      where: { orgId: ORG },
      update: { url: body.url, events: body.events },
      create: { orgId: ORG, url: body.url, events: body.events },
    });
  });

  test("takes the org from the session, never from the body", async () => {
    await saveWebhookHandler(
      { user: { orgId: ORG }, body: { ...body, orgId: "someone-else" } } as never,
      reply(),
    );

    expect(db.webhook.upsert.mock.calls[0][0].where).toEqual({ orgId: ORG });
    expect(db.webhook.upsert.mock.calls[0][0].create.orgId).toBe(ORG);
  });

  test("verifies before writing anything", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("wrong"));
    const rep = reply();

    await saveWebhookHandler({ user: { orgId: ORG }, body } as never, rep);

    expect(answer(rep).code).toBe(400);
    expect(db.webhook.upsert).not.toHaveBeenCalled();
  });

  // NOTE: orgId is @unique on the model (prisma/schema.prisma:2780), so an org
  // has exactly one webhook and saving a second silently replaces the first.
  test("a second save replaces the org's existing webhook", async () => {
    await saveWebhookHandler({ user: { orgId: ORG }, body } as never, reply());
    await saveWebhookHandler(
      { user: { orgId: ORG }, body: { ...body, url: "https://other.test" } } as never,
      reply(),
    );

    expect(db.webhook.upsert).toHaveBeenCalledTimes(2);
    expect(db.webhook.upsert.mock.calls[1][0].update.url).toBe("https://other.test");
  });

  // NOTE: no handler in this controller has a try/catch, and the module
  // installs no error handler, so a write failure escapes to the global one.
  test("a write failure escapes the handler", async () => {
    db.webhook.upsert.mockRejectedValueOnce(new Error("db down"));

    await expect(
      saveWebhookHandler({ user: { orgId: ORG }, body } as never, reply()),
    ).rejects.toThrow("db down");
  });
});

// ===========================================================================
// The schema
// ===========================================================================

describe("saveWebhookSchema", () => {
  test("requires https", () => {
    expect(
      saveWebhookSchema.safeParse({ url: "http://x.test", events: [], verifyToken: TOKEN }).success,
    ).toBe(false);
    expect(
      saveWebhookSchema.safeParse({ url: "https://x.test", events: [], verifyToken: TOKEN })
        .success,
    ).toBe(true);
  });

  test("rejects a value that is not a URL", () => {
    expect(saveWebhookSchema.safeParse({ url: "not a url", events: [] }).success).toBe(false);
  });

  // NOTE: events is an unconstrained string array. The only event the platform
  // ever emits is "message_status" (wasurvey.controller.ts:360).
  test("accepts any event name, including ones nothing emits", () => {
    const parsed = saveWebhookSchema.safeParse({
      url: "https://x.test",
      events: ["mesage_status", "order.created", ""],
      verifyToken: TOKEN,
    });

    expect(parsed.success).toBe(true);
  });

  test("accepts an empty event list, which subscribes to nothing", () => {
    expect(
      saveWebhookSchema.safeParse({ url: "https://x.test", events: [], verifyToken: TOKEN })
        .success,
    ).toBe(true);
  });

  test("puts no bound on the URL length or the number of events", () => {
    expect(
      saveWebhookSchema.safeParse({
        url: `https://x.test/${"a".repeat(5000)}`,
        events: Array.from({ length: 1000 }, (_, i) => `e-${i}`),
        verifyToken: TOKEN,
      }).success,
    ).toBe(true);
  });
});

// ===========================================================================
// The read and the delete
// ===========================================================================

describe("getWebhookHandler", () => {
  test("reads by the session org", async () => {
    await getWebhookHandler({ user: { orgId: ORG } } as never, reply());

    expect(db.webhook.findUnique).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("sends null rather than undefined when none is configured", async () => {
    const rep = reply();

    await getWebhookHandler({ user: { orgId: ORG } } as never, rep);

    expect(rep.send).toHaveBeenCalledWith(null);
  });

  test("returns the stored row as-is", async () => {
    db.webhook.findUnique.mockResolvedValueOnce({
      id: "w-1",
      orgId: ORG,
      url: "https://x.test",
      events: ["message_status"],
    });
    const rep = reply();

    await getWebhookHandler({ user: { orgId: ORG } } as never, rep);

    expect(rep.send.mock.calls[0][0].url).toBe("https://x.test");
  });
});

describe("deleteWebhookHandler", () => {
  test("deletes by the session org", async () => {
    await deleteWebhookHandler({ user: { orgId: ORG } } as never, reply());

    expect(db.webhook.delete).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("answers a fixed success", async () => {
    const rep = reply();

    await deleteWebhookHandler({ user: { orgId: ORG } } as never, rep);

    expect(rep.send).toHaveBeenCalledWith({ success: true });
  });

  // NOTE: prisma.delete raises P2025 when there is no row, and nothing catches
  // it — so deleting a webhook that was never configured is a 500 rather than
  // an idempotent success.
  test("deleting when none exists escapes as an error", async () => {
    db.webhook.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );

    await expect(
      deleteWebhookHandler({ user: { orgId: ORG } } as never, reply()),
    ).rejects.toMatchObject({ code: "P2025" });
  });

  test("the service is a bare delete with no existence check", async () => {
    await deleteWebhook(ORG);

    expect(db.webhook.delete).toHaveBeenCalledOnce();
    expect(db.webhook.findUnique).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// enqueueWebhookDispatch
// ===========================================================================

describe("enqueueWebhookDispatch", () => {
  test("queues a dispatch job carrying the phone id, event and payload", async () => {
    await enqueueWebhookDispatch("phone-1", "message_status", { messageId: "m-1" });

    expect(outgoingWebhookQueue.add).toHaveBeenCalledWith("dispatch", {
      phoneId: "phone-1",
      event: "message_status",
      payload: { messageId: "m-1" },
    });
  });

  // NOTE: no attempts and no backoff are set here, and the queue is created
  // with no defaultJobOptions (redisConnection.ts:39) — so BullMQ's default of
  // a single attempt applies. The worker throws on a non-2xx to request a
  // retry that will not happen.
  test("sets no retry policy on the job", async () => {
    await enqueueWebhookDispatch("phone-1", "message_status", {});

    expect((outgoingWebhookQueue.add as unknown as Mock).mock.calls[0][2]).toBeUndefined();
  });

  test("keys the job on a phone id rather than the org the webhook belongs to", async () => {
    await enqueueWebhookDispatch("phone-1", "message_status", {});

    const job = (outgoingWebhookQueue.add as unknown as Mock).mock.calls[0][1];
    expect(job).toHaveProperty("phoneId");
    expect(job).not.toHaveProperty("orgId");
  });

  test("passes the payload through without filtering", async () => {
    await enqueueWebhookDispatch("phone-1", "message_status", {
      recipientId: "919876543210",
      errors: [{ code: 131047 }],
    });

    expect((outgoingWebhookQueue.add as unknown as Mock).mock.calls[0][1].payload.recipientId).toBe(
      "919876543210",
    );
  });
});

// ===========================================================================
// upsertWebhook / getWebhook
// ===========================================================================

describe("the service writers", () => {
  test("upsert keys on orgId in all three positions", async () => {
    await upsertWebhook(ORG, "https://x.test", ["message_status"]);

    const arg = db.webhook.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ orgId: ORG });
    expect(arg.create.orgId).toBe(ORG);
    expect(arg.update).not.toHaveProperty("orgId");
  });

  // NOTE: the model carries no secret column (prisma/schema.prisma:2775-2783),
  // so nothing is stored that a delivery could be signed with.
  test("stores only a url and an event list", async () => {
    await upsertWebhook(ORG, "https://x.test", ["message_status"]);

    expect(Object.keys(db.webhook.upsert.mock.calls[0][0].create)).toEqual([
      "orgId",
      "url",
      "events",
    ]);
  });

  test("the verify token is not persisted", async () => {
    await saveWebhookHandler(
      {
        user: { orgId: ORG },
        body: { url: "https://x.test", events: [], verifyToken: TOKEN },
      } as never,
      reply(),
    );

    expect(JSON.stringify(db.webhook.upsert.mock.calls[0][0])).not.toContain(TOKEN);
  });

  test("getWebhook reads by orgId", async () => {
    await getWebhook(ORG);

    expect(db.webhook.findUnique).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("webhookRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("guards the tree with checkSession", async () => {
    const { srv, hooks } = fakeServer();

    await webhookRoutes(srv);

    expect(hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
  });

  test("registers three routes, all on the collection path", async () => {
    const { srv, routes } = fakeServer();

    await webhookRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual(["POST /", "GET /", "DELETE /"]);
  });

  test("only the save route validates a body", async () => {
    const { srv, routes } = fakeServer();

    await webhookRoutes(srv);

    expect(routes[0].opts.schema.body).toBe(saveWebhookSchema);
    expect(routes[1].opts).toBe(getWebhookHandler);
    expect(routes[2].opts).toBe(deleteWebhookHandler);
  });

  // NOTE: no role check — any member of an org can point that org's webhook at
  // an address of their choosing, or delete it.
  test("no route declares a role requirement", async () => {
    const { srv, routes } = fakeServer();

    await webhookRoutes(srv);

    for (const r of routes) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });
});
