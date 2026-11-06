import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    externalIdempotencyRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { idempotencyOnSend, idempotencyPreHandler } from "./idempotency.js";

/** Runs the callback-style hook, resolving with the payload it hands on. */
const onSend = (request: any, rep: any, payload: unknown) =>
  new Promise((resolve, reject) =>
    idempotencyOnSend(request, rep, payload, (err, out) => (err ? reject(err) : resolve(out))),
  );

const db = prisma as unknown as Record<string, any>;
const KEY = "3f7c1a20-0f2e-4c10-9d52-2b6f1c8a91aa";

function req(over: Record<string, unknown> = {}) {
  return {
    method: "POST",
    url: "/loyalty/points/award",
    routeOptions: { url: "/loyalty/points/award", config: {} },
    headers: { "idempotency-key": KEY },
    body: { purchaseAmount: 500 },
    user: { orgId: "org-1" },
    ...over,
  } as any;
}

function reply() {
  const sent: { status?: number; body?: unknown; headers: Record<string, string> } = {
    headers: {},
  };
  const r: any = {
    statusCode: 200,
    code(s: number) {
      sent.status = s;
      return r;
    },
    send(b: unknown) {
      sent.body = b;
      return r;
    },
    header(k: string, v: string) {
      sent.headers[k] = v;
      return r;
    },
  };
  return { reply: r, sent };
}

const conflict = Object.assign(new Error("unique"), { code: "P2002" });

beforeEach(() => {
  vi.clearAllMocks();
  db.externalIdempotencyRecord.create.mockResolvedValue({});
});

describe("claiming a key", () => {
  test("a first write claims it and carries on", async () => {
    const request = req();
    await idempotencyPreHandler(request, reply().reply);

    expect(db.externalIdempotencyRecord.create.mock.calls[0][0].data).toMatchObject({
      orgId: "org-1",
      scope: "POST /loyalty/points/award",
      key: KEY,
      state: "IN_FLIGHT",
    });
    expect(request.idempotency).toMatchObject({ key: KEY });
  });

  test("reads need no key at all", async () => {
    const request = req({ method: "GET", headers: {} });
    await idempotencyPreHandler(request, reply().reply);

    expect(db.externalIdempotencyRecord.create).not.toHaveBeenCalled();
  });

  test("a write without a key goes straight through, unclaimed and unwarned", async () => {
    const { reply: rep, sent } = reply();
    const request = req({ headers: {} });

    await expect(idempotencyPreHandler(request, rep)).resolves.toBeUndefined();

    expect(db.externalIdempotencyRecord.create).not.toHaveBeenCalled();
    expect(request.idempotency).toBeUndefined();
    expect(sent.headers.Warning).toBeUndefined();
  });

  test("a write that sends a key is claimed", async () => {
    const request = req();

    await idempotencyPreHandler(request, reply().reply);

    expect(db.externalIdempotencyRecord.create).toHaveBeenCalledOnce();
    expect(request.idempotency).toMatchObject({ key: KEY, scope: "POST /loyalty/points/award" });
  });

  test("a key that is not a key is refused", async () => {
    await expect(
      idempotencyPreHandler(req({ headers: { "idempotency-key": "short" } }), reply().reply),
    ).rejects.toMatchObject({ status: 400, code: "idempotency_key_invalid" });
  });
});

describe("a repeat", () => {
  test("replays the stored answer instead of doing the work again", async () => {
    db.externalIdempotencyRecord.create.mockRejectedValue(conflict);
    db.externalIdempotencyRecord.findUnique.mockResolvedValue({
      state: "COMPLETED",
      requestHash: (await import("node:crypto"))
        .createHash("sha256")
        .update('{"purchaseAmount":500}')
        .digest("hex"),
      responseStatus: 200,
      responseBody: { pointsAwarded: 100 },
    });

    const { reply: rep, sent } = reply();
    await idempotencyPreHandler(req(), rep);

    expect(sent.body).toEqual({ pointsAwarded: 100 });
    expect(sent.headers["Idempotent-Replay"]).toBe("true");
  });

  test("the same key with a different body is a conflict, not a replay", async () => {
    // Answering a different question with the first one's answer would be worse than
    // refusing: the caller would believe a write it never made had happened.
    db.externalIdempotencyRecord.create.mockRejectedValue(conflict);
    db.externalIdempotencyRecord.findUnique.mockResolvedValue({
      state: "COMPLETED",
      requestHash: "some-other-hash",
    });

    await expect(idempotencyPreHandler(req(), reply().reply)).rejects.toMatchObject({
      status: 409,
      code: "idempotency_key_reused",
    });
  });

  test("the same key and body on a different path param is a conflict, not a replay", async () => {
    const issue = (rewardCode: string) =>
      req({
        url: `/loyalty/rewards/${rewardCode}/issue`,
        routeOptions: { url: "/loyalty/rewards/:rewardCode/issue", config: {} },
        params: { rewardCode },
        body: { phone: "15550001111" },
      });
    await idempotencyPreHandler(issue("A"), reply().reply);
    const first = db.externalIdempotencyRecord.create.mock.calls[0][0].data;

    db.externalIdempotencyRecord.create.mockRejectedValue(conflict);
    db.externalIdempotencyRecord.findUnique.mockResolvedValue({
      state: "COMPLETED",
      requestHash: first.requestHash,
      responseStatus: 200,
      responseBody: { issued: "A" },
    });

    // Same scope (method + pattern), same body, same key — only :rewardCode differs.
    await expect(idempotencyPreHandler(issue("B"), reply().reply)).rejects.toMatchObject({
      status: 409,
      code: "idempotency_key_reused",
    });
    // And the identical request still replays.
    const { reply: rep, sent } = reply();
    await idempotencyPreHandler(issue("A"), rep);
    expect(sent.body).toEqual({ issued: "A" });
  });

  test("the query string is part of the request too", async () => {
    await idempotencyPreHandler(req({ query: { dryRun: "1" } }), reply().reply);
    await idempotencyPreHandler(req({ query: { dryRun: "0" } }), reply().reply);
    const [a, b] = db.externalIdempotencyRecord.create.mock.calls.map((c: any[]) => c[0].data);
    expect(a.requestHash).not.toBe(b.requestHash);
  });

  test("an identical write still running is told to wait", async () => {
    db.externalIdempotencyRecord.create.mockRejectedValue(conflict);
    db.externalIdempotencyRecord.findUnique.mockResolvedValue({
      state: "IN_FLIGHT",
      requestHash: (await import("node:crypto"))
        .createHash("sha256")
        .update('{"purchaseAmount":500}')
        .digest("hex"),
    });

    await expect(idempotencyPreHandler(req(), reply().reply)).rejects.toMatchObject({
      status: 409,
      code: "request_in_progress",
    });
  });
});

describe("recording the outcome", () => {
  const claim = { orgId: "org-1", scope: "POST /loyalty/points/award", key: KEY };

  test("a success is stored for the next identical call", async () => {
    const { reply: rep } = reply();
    rep.statusCode = 200;

    await onSend(req({ idempotency: claim }), rep, { pointsAwarded: 100 });

    expect(db.externalIdempotencyRecord.updateMany.mock.calls[0][0].data).toMatchObject({
      state: "COMPLETED",
      responseStatus: 200,
      responseBody: { pointsAwarded: 100 },
    });
  });

  test("a failure releases the key so the caller can fix it and retry", async () => {
    const { reply: rep } = reply();
    rep.statusCode = 500;

    await onSend(req({ idempotency: claim }), rep, { error: {} });

    expect(db.externalIdempotencyRecord.deleteMany).toHaveBeenCalled();
    expect(db.externalIdempotencyRecord.updateMany).not.toHaveBeenCalled();
  });

  test("bookkeeping that fails never fails a request that succeeded", async () => {
    db.externalIdempotencyRecord.updateMany.mockRejectedValue(new Error("redis down"));
    const { reply: rep } = reply();

    await expect(onSend(req({ idempotency: claim }), rep, { ok: true })).resolves.toEqual({
      ok: true,
    });
  });

  test("an unclaimed request is left alone, and answered in the same tick", async () => {
    // Synchronous on purpose: an async onSend defers the send past a handler that calls
    // reply.send() without returning it, which Fastify then answers a second time as a 500.
    let handedOn: unknown = "not yet";
    idempotencyOnSend(req(), reply().reply, { ok: true }, (_err, out) => (handedOn = out));
    expect(handedOn).toEqual({ ok: true });

    expect(db.externalIdempotencyRecord.updateMany).not.toHaveBeenCalled();
    expect(db.externalIdempotencyRecord.deleteMany).not.toHaveBeenCalled();
  });
});

describe("idempotencyOnSend inside Fastify", () => {
  /**
   * The bug this pins: with an async onSend, a handler that calls reply.send() without
   * returning it resolved first, and Fastify logged (and onResponse saw) a 500 after the
   * client had been sent a 200. Many v1 handlers forward to dashboard code written that way.
   */
  test("a handler that sends without returning is recorded as what it sent", async () => {
    const Fastify = (await import("fastify")).default;
    const app = Fastify();
    let seen: number | undefined;
    app.addHook("onSend", idempotencyOnSend);
    app.addHook("onResponse", async (_req, rep) => {
      seen = rep.statusCode;
    });
    app.get("/teams", async (_req, rep) => {
      rep.send([{ id: "t1" }]);
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/teams" });

    expect(res.statusCode).toBe(200);
    expect(seen).toBe(200);
    await app.close();
  });
});
