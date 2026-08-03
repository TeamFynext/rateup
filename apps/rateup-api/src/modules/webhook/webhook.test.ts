import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    webhook: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/redisConnection.js", () => ({
  outgoingWebhookQueue: { add: vi.fn() },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/checkRoleHandler.js", () => ({
  checkRoleHandler: vi.fn((roles) => Object.assign(vi.fn(), { roles })),
}));

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { lookup } from "node:dns/promises";
import { log } from "../../utils/logger.js";
import { outgoingWebhookQueue } from "../../utils/redisConnection.js";
import { checkSession } from "../../utils/checkSession.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
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
import { saveWebhookSchema, WEBHOOK_EVENTS } from "./webhook.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { webhook: Record<string, Mock> };
const dns = lookup as unknown as Mock;

const ORG = "11111111-1111-1111-1111-111111111111";
const TOKEN = "challenge-token";
const PUBLIC_IP = "93.184.216.34";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

const okResponse = (body: string) => ({ ok: true, status: 200, text: async () => body });

/** The URL the fetch was actually issued against, as a string. */
const fetched = (call: number = 0) => String(fetchMock.mock.calls[call][0]);

let fetchMock: Mock;

beforeEach(() => {
  vi.clearAllMocks();
  db.webhook.upsert.mockResolvedValue({ id: "w-1", orgId: ORG });
  db.webhook.findUnique.mockResolvedValue(null);
  db.webhook.delete.mockResolvedValue({ id: "w-1" });
  db.webhook.deleteMany.mockResolvedValue({ count: 1 });
  dns.mockResolvedValue([{ address: PUBLIC_IP, family: 4 }]);
  (outgoingWebhookQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
  fetchMock = vi.fn(async () => okResponse(TOKEN)) as unknown as Mock;
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===========================================================================
// verifyWebhookUrl — the server no longer fetches whatever it is given
// ===========================================================================

describe("verifyWebhookUrl", () => {
  test("issues a GET to the caller's URL with the challenge appended", async () => {
    await verifyWebhookUrl("https://hooks.example.test/rateup", TOKEN);

    expect(fetched()).toBe(`https://hooks.example.test/rateup?challenge=${TOKEN}`);
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

  test("refuses a host that resolves to a private address", async () => {
    dns.mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }]);

    await expect(
      verifyWebhookUrl("https://internal-admin.svc.cluster.local/health", TOKEN),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  test("refuses the cloud metadata endpoint, loopback and the private ranges", async () => {
    for (const address of ["169.254.169.254", "127.0.0.1", "192.168.1.9", "172.16.4.4"]) {
      dns.mockResolvedValueOnce([{ address, family: 4 }]);
      await expect(verifyWebhookUrl(`https://receiver.test/${address}`, TOKEN)).resolves.toBe(
        false,
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("refuses IPv6 loopback and unique-local", async () => {
    for (const address of ["[::1]", "[fd00::1]", "[fe80::1]"]) {
      await expect(verifyWebhookUrl(`https://${address}/hook`, TOKEN)).resolves.toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("refuses a literal private address without consulting the resolver", async () => {
    await expect(verifyWebhookUrl("https://10.0.0.5:8080", TOKEN)).resolves.toBe(false);

    expect(dns).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("refuses when any resolved address is private", async () => {
    dns.mockResolvedValueOnce([
      { address: PUBLIC_IP, family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    await expect(verifyWebhookUrl("https://split-horizon.test", TOKEN)).resolves.toBe(false);
  });

  // fetch defaults to redirect: "follow", so the schema's https-only rule
  // constrained the first hop only — a caller could register their own host and
  // have it answer 302 to http://169.254.169.254/.
  test("sets redirect to manual, so the check cannot be bypassed by a second hop", async () => {
    await verifyWebhookUrl("https://x.test", TOKEN);

    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
  });

  test("refuses a non-https URL even if one reaches the service directly", async () => {
    await expect(verifyWebhookUrl("http://x.test", TOKEN)).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a connection failure is a false, and is logged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(false);
    expect(log.warn).toHaveBeenCalled();
  });

  test("a timeout is also a false rather than an error", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "TimeoutError" }));

    await expect(verifyWebhookUrl("https://x.test", TOKEN)).resolves.toBe(false);
  });

  test("encodes the token into the query string", async () => {
    await verifyWebhookUrl("https://x.test", "a b&c=d");

    expect(fetched()).toBe("https://x.test/?challenge=a+b%26c%3Dd");
  });

  test("sets the challenge on a URL that already has a query", async () => {
    await verifyWebhookUrl("https://x.test/hook?tenant=1", TOKEN);

    expect(fetched()).toBe(`https://x.test/hook?tenant=1&challenge=${TOKEN}`);
  });
});

// ===========================================================================
// The token that used to be optional in name only
// ===========================================================================

describe("the verify token", () => {
  test("the schema requires it", () => {
    expect(
      saveWebhookSchema.safeParse({ url: "https://x.test", events: ["message_status"] }).success,
    ).toBe(false);
    expect(
      saveWebhookSchema.safeParse({
        url: "https://x.test",
        events: ["message_status"],
        verifyToken: "",
      }).success,
    ).toBe(false);
    expect(
      saveWebhookSchema.safeParse({
        url: "https://x.test",
        events: ["message_status"],
        verifyToken: TOKEN,
      }).success,
    ).toBe(true);
  });

  test("the handler still refuses a body that reaches it without one", async () => {
    const rep = reply();

    await saveWebhookHandler(
      { user: { orgId: ORG }, body: { url: "https://x.test", events: [] } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { message: "verifyToken is required" } });
    expect(fetchMock).not.toHaveBeenCalled();
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
  const base = { events: ["message_status"], verifyToken: TOKEN };

  test("requires https", () => {
    expect(saveWebhookSchema.safeParse({ ...base, url: "http://x.test" }).success).toBe(false);
    expect(saveWebhookSchema.safeParse({ ...base, url: "https://x.test" }).success).toBe(true);
  });

  test("rejects a value that is not a URL", () => {
    expect(saveWebhookSchema.safeParse({ ...base, url: "not a url" }).success).toBe(false);
  });

  test("rejects an event name the platform does not emit", () => {
    expect(
      saveWebhookSchema.safeParse({
        url: "https://x.test",
        events: ["mesage_status", "order.created"],
        verifyToken: TOKEN,
      }).success,
    ).toBe(false);
  });

  test("the enum is the set the platform actually emits", () => {
    expect(WEBHOOK_EVENTS).toEqual(["message_status"]);
  });

  test("rejects an empty event list, which would subscribe to nothing", () => {
    expect(
      saveWebhookSchema.safeParse({ url: "https://x.test", events: [], verifyToken: TOKEN })
        .success,
    ).toBe(false);
  });

  test("bounds the URL length", () => {
    expect(
      saveWebhookSchema.safeParse({ ...base, url: `https://x.test/${"a".repeat(5000)}` }).success,
    ).toBe(false);
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

    expect(db.webhook.deleteMany).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("answers a fixed success", async () => {
    const rep = reply();

    await deleteWebhookHandler({ user: { orgId: ORG } } as never, rep);

    expect(rep.send).toHaveBeenCalledWith({ success: true });
  });

  test("deleting when none exists is an idempotent success", async () => {
    db.webhook.deleteMany.mockResolvedValueOnce({ count: 0 });
    const rep = reply();

    await expect(
      deleteWebhookHandler({ user: { orgId: ORG } } as never, rep),
    ).resolves.toBeUndefined();
    expect(rep.send).toHaveBeenCalledWith({ success: true });
  });

  test("the service issues no existence check of its own", async () => {
    await deleteWebhook(ORG);

    expect(db.webhook.deleteMany).toHaveBeenCalledOnce();
    expect(db.webhook.findUnique).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// enqueueWebhookDispatch
// ===========================================================================

describe("enqueueWebhookDispatch", () => {
  test("queues a dispatch job carrying the phone id, event and payload", async () => {
    await enqueueWebhookDispatch("phone-1", "message_status", { messageId: "m-1" });

    expect((outgoingWebhookQueue.add as unknown as Mock).mock.calls[0].slice(0, 2)).toEqual([
      "dispatch",
      { phoneId: "phone-1", event: "message_status", payload: { messageId: "m-1" } },
    ]);
  });

  test("sets a retry policy with exponential backoff", async () => {
    await enqueueWebhookDispatch("phone-1", "message_status", {});

    const opts = (outgoingWebhookQueue.add as unknown as Mock).mock.calls[0][2];
    expect(opts.attempts).toBeGreaterThan(1);
    expect(opts.backoff).toEqual({ type: "exponential", delay: 5_000 });
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
        body: { url: "https://x.test", events: ["message_status"], verifyToken: TOKEN },
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
    expect(routes[2].opts.schema).toBeUndefined();
  });

  test("the two writers require an admin role, and the read does not", async () => {
    const { srv, routes } = fakeServer();

    await webhookRoutes(srv);

    expect(checkRoleHandler).toHaveBeenCalledWith(["SUPER_ADMIN", "ADMIN"]);
    expect(routes[0].opts.preHandler).toBeDefined();
    expect(routes[2].opts.preHandler).toBe(routes[0].opts.preHandler);
    expect(routes[1].opts).toBe(getWebhookHandler);
  });
});
