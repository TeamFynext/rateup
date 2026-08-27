import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    referral: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({
  assertRootOrg: vi.fn(),
  // Returns the guard rather than being one, so the route tree can build a single
  // subscription check and reuse it across the administrative routes.
  getVerifySubscriptionHandler: vi.fn(() => requireReferralsMock),
}));
const requireReferralsMock = vi.fn();
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../utils/rateLimit.js", () => ({
  rateLimit: vi.fn((opts) => Object.assign(vi.fn(), { opts })),
}));
vi.mock("../../utils/redisConnection.js", () => ({ default: { set: vi.fn() } }));

import prisma from "../../utils/prisma.js";
import connection from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";
import { rateLimit } from "../../utils/rateLimit.js";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg, getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import {
  createReferral,
  deleteReferral,
  getAllReferrals,
  ReferralCodeError,
  updateReferral,
} from "./referrals.service.js";
import {
  createReferralHandler,
  deleteReferralHandler,
  getAllReferralsHandler,
  trackVisitHandler,
} from "./referrals.controller.js";
import { referralRoutes } from "./referrals.route.js";
import { byIdParamsSchema, createReferralSchema, trackVisitSchema } from "./referrals.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { referral: Record<string, Mock> };
const redis = connection as unknown as { set: Mock };

const CODE = "annsmith472";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

function request(over: any = {}) {
  return { log: { error: vi.fn() }, ...over } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.referral.create.mockResolvedValue({ id: "r-1", referral_code: CODE });
  db.referral.findMany.mockResolvedValue([]);
  db.referral.findUnique.mockResolvedValue(null);
  db.referral.update.mockResolvedValue({ id: "r-1", visit_count: 1 });
  db.referral.delete.mockResolvedValue({ id: "r-1" });
  db.referral.deleteMany.mockResolvedValue({ count: 1 });
  // "OK" means the key was not there — a first visit from this IP for this code.
  redis.set.mockResolvedValue("OK");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("referralRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const srv: any = {
      addHook: vi.fn(),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes };
  }

  test("registers four routes and adds no tree-wide hook", async () => {
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /",
      "GET /",
      "DELETE /:id",
      "POST /track-visit",
    ]);
    expect(srv.addHook).not.toHaveBeenCalled();
  });

  test("the three administrative routes require the platform root org", async () => {
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    for (const r of routes.slice(0, 3)) {
      expect(r.opts.preHandler).toEqual([checkSession, assertRootOrg, requireReferralsMock]);
    }
  });

  test("the administrative routes are gated on the referrals subscription feature", async () => {
    const { srv } = fakeServer();

    await referralRoutes(srv);

    expect(getVerifySubscriptionHandler).toHaveBeenCalledWith([
      SubscriptionFeaturePathName.WhatsappReferrals,
    ]);
  });

  test("track-visit is NOT subscription gated", async () => {
    // It is hit by referred visitors, who have no session and are not the subscribing
    // org — gating it would break the referral link itself.
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    const track = routes.find((r) => r.url === "/track-visit");
    expect(track.opts.preHandler).not.toContain(requireReferralsMock);
  });

  test("track-visit stays session-free but is rate limited and validated", async () => {
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    const track = routes.find((r) => r.url === "/track-visit");
    expect(track.handler).toBe(trackVisitHandler);
    expect(track.opts.preHandler).toBeDefined();
    expect(track.opts.preHandler).not.toBe(checkSession);
    expect(rateLimit).toHaveBeenCalledWith(expect.objectContaining({ key: "referralTrackVisit" }));
    expect(track.opts.schema.body).toBe(trackVisitSchema);
  });

  test("the writing routes declare schemas", async () => {
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    expect(routes.find((r) => r.method === "POST" && r.url === "/").opts.schema.body).toBe(
      createReferralSchema,
    );
    expect(routes.find((r) => r.method === "DELETE").opts.schema.params).toBe(byIdParamsSchema);
  });

  test("the create schema requires a real email and bounds the name", () => {
    expect(createReferralSchema.safeParse({ name: "Ann", email: "not-an-email" }).success).toBe(
      false,
    );
    expect(createReferralSchema.safeParse({ name: "", email: "a@b.test" }).success).toBe(false);
    expect(createReferralSchema.safeParse({ name: "Ann", email: "a@b.test" }).success).toBe(true);
  });

  test("the delete params schema requires a uuid", () => {
    expect(byIdParamsSchema.safeParse({ id: "r-1" }).success).toBe(false);
    expect(byIdParamsSchema.safeParse({ id: "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c" }).success).toBe(
      true,
    );
  });
});

// ===========================================================================
// trackVisitHandler — the open counter
// ===========================================================================

describe("trackVisitHandler", () => {
  beforeEach(() => {
    db.referral.findUnique.mockResolvedValue({ id: "r-1", referral_code: CODE, visit_count: 0 });
  });

  test("increments the visit count for the code in the body", async () => {
    const rep = reply();

    await trackVisitHandler(request({ body: { code: CODE } }), rep);

    expect(db.referral.update).toHaveBeenCalledWith({
      where: { referral_code: CODE },
      data: { visit_count: { increment: 1 }, signup_count: undefined },
    });
    expect(answer(rep).code).toBe(200);
  });

  test("keys the deduplication on the caller's IP and the code", async () => {
    await trackVisitHandler(request({ body: { code: CODE }, ip: "203.0.113.9" }), reply());

    expect(redis.set).toHaveBeenCalledWith(
      `referral:visit:${CODE}:203.0.113.9`,
      "1",
      "EX",
      86_400,
      "NX",
    );
  });

  // Nothing deduplicated, so the same code could be counted without limit from a
  // single caller — the figure the module exists to produce was directly
  // writable by the people it measures.
  test("counts one visit per IP per code per day", async () => {
    redis.set.mockResolvedValueOnce("OK");
    redis.set.mockResolvedValue(null); // the key already exists

    for (let i = 0; i < 25; i++) {
      await trackVisitHandler(request({ body: { code: CODE }, ip: "203.0.113.9" }), reply());
    }

    expect(db.referral.update).toHaveBeenCalledOnce();
  });

  test("a different IP is counted separately", async () => {
    await trackVisitHandler(request({ body: { code: CODE }, ip: "203.0.113.9" }), reply());
    await trackVisitHandler(request({ body: { code: CODE }, ip: "198.51.100.4" }), reply());

    expect(db.referral.update).toHaveBeenCalledTimes(2);
  });

  // Fails OPEN, for the same reason the rate limiter does: a Redis outage should
  // not stop legitimate visits being counted.
  test("a Redis failure counts the visit rather than dropping it", async () => {
    redis.set.mockRejectedValueOnce(new Error("redis down"));
    const rep = reply();

    await trackVisitHandler(request({ body: { code: CODE }, ip: "203.0.113.9" }), rep);

    expect(db.referral.update).toHaveBeenCalledOnce();
    expect(answer(rep).code).toBe(200);
    expect(log.error).toHaveBeenCalled();
  });

  test("400s a request with no code", async () => {
    const rep = reply();

    await trackVisitHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "code is required" } });
    expect(db.referral.findUnique).not.toHaveBeenCalled();
  });

  test("a known and an unknown code answer identically", async () => {
    const known = reply();
    await trackVisitHandler(request({ body: { code: CODE }, ip: "203.0.113.9" }), known);

    db.referral.findUnique.mockResolvedValueOnce(null);
    const unknown = reply();
    await trackVisitHandler(request({ body: { code: "nope" }, ip: "198.51.100.4" }), unknown);

    expect(answer(known)).toEqual(answer(unknown));
    expect(answer(known).code).toBe(200);
  });

  test("an unknown code counts nothing", async () => {
    db.referral.findUnique.mockResolvedValueOnce(null);

    await trackVisitHandler(request({ body: { code: "guessed" }, ip: "203.0.113.9" }), reply());

    expect(db.referral.update).not.toHaveBeenCalled();
  });

  test("a database failure answers a fixed 500", async () => {
    db.referral.update.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await trackVisitHandler(request({ body: { code: CODE } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Internal server error" } });
  });
});

// ===========================================================================
// updateReferral
// ===========================================================================

describe("updateReferral", () => {
  test("increments only the counter it was asked for", async () => {
    db.referral.findUnique.mockResolvedValue({ id: "r-1" });

    await updateReferral(CODE, "visit");
    expect(db.referral.update.mock.calls[0][0].data).toEqual({
      visit_count: { increment: 1 },
      signup_count: undefined,
    });

    await updateReferral(CODE, "signup");
    expect(db.referral.update.mock.calls[1][0].data).toEqual({
      visit_count: undefined,
      signup_count: { increment: 1 },
    });
  });

  test("returns null for a code that does not resolve", async () => {
    await expect(updateReferral(CODE, "visit")).resolves.toBeNull();
    expect(db.referral.update).not.toHaveBeenCalled();
  });

  // NOTE: the lookup exists only to produce that error — the update is keyed on
  // the same unique column and would raise P2025 by itself.
  test("reads the row before writing it", async () => {
    db.referral.findUnique.mockResolvedValue({ id: "r-1" });

    await updateReferral(CODE, "visit");

    expect(db.referral.findUnique).toHaveBeenCalledWith({ where: { referral_code: CODE } });
  });
});

// ===========================================================================
// The referral code generator
// ===========================================================================

describe("createReferral", () => {
  const CODE_PATTERN = /^[a-z0-9]+$/;

  test("builds the code from the name plus a random suffix", async () => {
    await createReferral("Ann Smith", "ann@example.test");

    const code = db.referral.create.mock.calls[0][0].data.referral_code;
    expect(code.startsWith("annsmith")).toBe(true);
    expect(code).toMatch(CODE_PATTERN);
  });

  test("strips punctuation and casing and truncates to fifteen characters", async () => {
    await createReferral("Ann-Marie O'Sullivan Jr.", "a@b.test");

    const code = db.referral.create.mock.calls[0][0].data.referral_code;
    expect(code.startsWith("annmarieosulliv")).toBe(true);
    expect(code.slice(0, 15)).toBe("annmarieosulliv");
  });

  test("does not draw the suffix from Math.random", async () => {
    const spy = vi.spyOn(Math, "random");

    await createReferral("Ann", "a@b.test");

    expect(spy).not.toHaveBeenCalled();
  });

  test("the suffix is wide enough not to be enumerable", async () => {
    await createReferral("Ann", "a@b.test");

    const code = db.referral.create.mock.calls[0][0].data.referral_code;
    expect(code.slice("ann".length)).toHaveLength(6);
  });

  test("retries when the generated code is already taken", async () => {
    db.referral.findUnique
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce(null);

    await createReferral("Ann", "a@b.test");

    expect(db.referral.findUnique).toHaveBeenCalledTimes(3);
    expect(db.referral.create.mock.calls[0][0].data.referral_code.startsWith("ann")).toBe(true);
  });

  // Two paths used to leave the retry loop WITHOUT checking the result: an empty
  // base returned immediately, and ten collisions returned the same unchecked
  // expression. Both wrote a code that could collide, and the create then failed
  // on the unique constraint — reported as "Email already exists" (38.3).
  test("exhausting the attempts raises rather than writing an unchecked code", async () => {
    db.referral.findUnique.mockResolvedValue({ id: "taken" });

    await expect(createReferral("Ann", "a@b.test")).rejects.toBeInstanceOf(ReferralCodeError);
    expect(db.referral.findUnique).toHaveBeenCalledTimes(10);
    expect(db.referral.create).not.toHaveBeenCalled();
  });

  // A name with no alphanumeric characters produced an empty base and went
  // straight to the same unchecked fallback.
  test("a name with no alphanumerics still checks its candidate", async () => {
    await createReferral("...", "a@b.test");

    expect(db.referral.findUnique).toHaveBeenCalledOnce();
    expect(db.referral.create).toHaveBeenCalledOnce();
  });

  // The fallback was Math.random().toString(36).substring(2, 9), whose length is
  // whatever the draw happens to give — seven characters typically, ONE for 0.5,
  // and an EMPTY STRING for a draw of exactly 0, which would have stored a
  // referral with no code at all.
  test("a name with no alphanumerics produces a fixed-length code", async () => {
    await createReferral("...", "a@b.test");
    const first = db.referral.create.mock.calls[0][0].data.referral_code;

    db.referral.create.mockClear();
    await createReferral("!!!", "b@c.test");
    const second = db.referral.create.mock.calls[0][0].data.referral_code;

    expect(first).toHaveLength(12);
    expect(second).toHaveLength(12);
    expect(first).not.toBe(second);
    expect(first).toMatch(CODE_PATTERN);
  });

  test("stores the counters at zero", async () => {
    await createReferral("Ann", "a@b.test");

    expect(db.referral.create.mock.calls[0][0].data).toMatchObject({
      visit_count: 0,
      signup_count: 0,
    });
  });
});

// ===========================================================================
// createReferralHandler
// ===========================================================================

describe("createReferralHandler", () => {
  test("answers 201 with only the generated code", async () => {
    db.referral.create.mockResolvedValueOnce({
      id: "r-1",
      referral_code: CODE,
      email: "ann@example.test",
    });
    const rep = reply();

    await createReferralHandler(
      request({ body: { name: "Ann Smith", email: "ann@example.test" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 201, body: { referral_code: CODE } });
  });

  test("requires a name and an email", async () => {
    const a = reply();
    await createReferralHandler(request({ body: { email: "a@b.test" } }), a);
    expect(answer(a)).toEqual({ code: 400, body: { message: "name is required" } });

    const b = reply();
    await createReferralHandler(request({ body: { name: "Ann" } }), b);
    expect(answer(b)).toEqual({ code: 400, body: { message: "email is required" } });
  });

  test("the schema, not the handler, is what rejects a non-email", () => {
    expect(createReferralSchema.safeParse({ name: "Ann", email: "not-an-email" }).success).toBe(
      false,
    );
  });

  test("reports a referral-code collision as a code collision", async () => {
    db.referral.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed on the fields: (`referral_code`)"), {
        code: "P2002",
        meta: { target: ["referral_code"] },
      }),
    );
    const rep = reply();

    await createReferralHandler(request({ body: { name: "Ann", email: "ann@example.test" } }), rep);

    expect(answer(rep)).toEqual({ code: 409, body: { message: "Referral code already exists" } });
  });

  test("still reports a duplicate email as one", async () => {
    db.referral.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed on the fields: (`email`)"), {
        code: "P2002",
        meta: { target: ["email"] },
      }),
    );
    const rep = reply();

    await createReferralHandler(request({ body: { name: "Ann", email: "ann@example.test" } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Email already exists" } });
  });

  test("a generator that cannot find a free code is reported as such", async () => {
    db.referral.findUnique.mockResolvedValue({ id: "taken" });
    const rep = reply();

    await createReferralHandler(request({ body: { name: "Ann", email: "a@b.test" } }), rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: { message: "Could not generate a unique referral code" },
    });
  });

  test("any other failure answers a fixed 500", async () => {
    db.referral.create.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await createReferralHandler(request({ body: { name: "Ann", email: "a@b.test" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Internal server error" } });
  });
});

// ===========================================================================
// The administrative reads and deletes
// ===========================================================================

describe("getAllReferralsHandler", () => {
  test("lists every referral, newest first", async () => {
    await getAllReferrals();

    expect(db.referral.findMany).toHaveBeenCalledWith({ orderBy: { created_at: "desc" } });
  });

  // NOTE: Referral carries no orgId — it is a platform-level table, which is
  // why the route is gated on the root org rather than on a tenant.
  test("returns the stored rows including the influencer's email", async () => {
    db.referral.findMany.mockResolvedValueOnce([
      { id: "r-1", referral_code: CODE, name: "Ann", email: "ann@example.test", visit_count: 12 },
    ]);
    const rep = reply();

    await getAllReferralsHandler(request(), rep);

    expect(answer(rep).body[0].email).toBe("ann@example.test");
  });

  test("a read failure answers a fixed 500", async () => {
    db.referral.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await getAllReferralsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Internal server error" } });
  });
});

describe("deleteReferralHandler", () => {
  test("deletes by the path id", async () => {
    await deleteReferral("r-1");

    expect(db.referral.deleteMany).toHaveBeenCalledWith({ where: { id: "r-1" } });
  });

  test("400s when no id is present", async () => {
    const rep = reply();

    await deleteReferralHandler(request({ params: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "id is required" } });
  });

  test("deleting an already-deleted referral is an idempotent success", async () => {
    db.referral.deleteMany.mockResolvedValueOnce({ count: 0 });
    const rep = reply();

    await deleteReferralHandler(request({ params: { id: "r-1" } }), rep);

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Referral deleted successfully" },
    });
  });

  test("logs the counters before removing the row", async () => {
    db.referral.findUnique.mockResolvedValueOnce({
      id: "r-1",
      referral_code: CODE,
      visit_count: 412,
      signup_count: 37,
    });

    await deleteReferralHandler(request({ params: { id: "r-1" } }), reply());

    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ visitCount: 412, signupCount: 37 }),
      expect.any(String),
    );
  });
});
