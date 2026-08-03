import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    referral: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
import {
  createReferral,
  deleteReferral,
  getAllReferrals,
  updateReferral,
} from "./referrals.service.js";
import {
  createReferralHandler,
  deleteReferralHandler,
  getAllReferralsHandler,
  trackVisitHandler,
} from "./referrals.controller.js";
import { referralRoutes } from "./referrals.route.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { referral: Record<string, Mock> };

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
      expect(r.opts.preHandler).toEqual([checkSession, assertRootOrg]);
    }
  });

  // NOTE: registered as post(url, handler) — no options object, so no
  // preHandler and no schema.
  test("track-visit carries no guard at all", async () => {
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    const track = routes.find((r) => r.url === "/track-visit");
    expect(track.opts).toBe(trackVisitHandler);
    expect(track.handler).toBeUndefined();
  });

  test("no route declares a schema", async () => {
    const { srv, routes } = fakeServer();

    await referralRoutes(srv);

    for (const r of routes.slice(0, 3)) {
      expect(r.opts.schema).toBeUndefined();
    }
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

  // NOTE: the handler reads nothing but the body — no session, no IP, no
  // fingerprint, and nothing records who or what asked.
  test("consults no identity and no request metadata", async () => {
    const req: any = {
      log: { error: vi.fn() },
      body: { code: CODE },
      get user() {
        throw new Error("request.user was read");
      },
      get ip() {
        throw new Error("request.ip was read");
      },
    };

    await expect(trackVisitHandler(req, reply())).resolves.toBeDefined();
    expect(db.referral.update).toHaveBeenCalledOnce();
  });

  // NOTE: nothing deduplicates, so the same code can be counted without limit
  // from a single caller.
  test("counts every call, with no deduplication", async () => {
    for (let i = 0; i < 25; i++) {
      await trackVisitHandler(request({ body: { code: CODE } }), reply());
    }

    expect(db.referral.update).toHaveBeenCalledTimes(25);
  });

  test("400s a request with no code", async () => {
    const rep = reply();

    await trackVisitHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "code is required" } });
    expect(db.referral.findUnique).not.toHaveBeenCalled();
  });

  test("404s a code that does not exist", async () => {
    db.referral.findUnique.mockResolvedValueOnce(null);
    const rep = reply();

    await trackVisitHandler(request({ body: { code: "guessed" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Referral not found" } });
  });

  // NOTE: a known code and an unknown one are distinguishable, so the code
  // space can be probed through this endpoint.
  test("a known and an unknown code answer differently", async () => {
    const known = reply();
    await trackVisitHandler(request({ body: { code: CODE } }), known);

    db.referral.findUnique.mockResolvedValueOnce(null);
    const unknown = reply();
    await trackVisitHandler(request({ body: { code: "nope" } }), unknown);

    expect(answer(known).code).toBe(200);
    expect(answer(unknown).code).toBe(404);
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

  test("throws a named error for a code that does not resolve", async () => {
    await expect(updateReferral(CODE, "visit")).rejects.toThrow("Referral not found");
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
  test("builds the code from the name plus a three digit suffix", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    await createReferral("Ann Smith", "ann@example.test");

    expect(db.referral.create.mock.calls[0][0].data.referral_code).toBe("annsmith550");
  });

  test("strips punctuation and casing and truncates to fifteen characters", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    await createReferral("Ann-Marie O'Sullivan Jr.", "a@b.test");

    const code = db.referral.create.mock.calls[0][0].data.referral_code;
    expect(code).toBe("annmarieosulliv550");
    expect(code.slice(0, -3)).toHaveLength(15);
  });

  // NOTE: the suffix is Math.floor(100 + Math.random() * 900), so there are 900
  // possible codes for a given name — and Math.random is not a CSPRNG.
  test("draws the suffix from Math.random rather than a CSPRNG", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    await createReferral("Ann", "a@b.test");

    expect(spy).toHaveBeenCalled();
  });

  test("retries when the generated code is already taken", async () => {
    const randoms = [0.1, 0.2, 0.3];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => randoms[i++] ?? 0.9);
    db.referral.findUnique
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce(null);

    await createReferral("Ann", "a@b.test");

    expect(db.referral.findUnique).toHaveBeenCalledTimes(3);
    expect(db.referral.create.mock.calls[0][0].data.referral_code).toBe("ann370");
  });

  // NOTE: after ten collisions the function abandons the uniqueness check and
  // returns a random string that is never looked up.
  test("the fallback after ten attempts is never checked for uniqueness", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    db.referral.findUnique.mockResolvedValue({ id: "taken" });

    await createReferral("Ann", "a@b.test");

    expect(db.referral.findUnique).toHaveBeenCalledTimes(10);
    const code = db.referral.create.mock.calls[0][0].data.referral_code;
    expect(code).not.toContain("ann");
  });

  // NOTE: a name with no alphanumeric characters produces an empty base and
  // goes straight to the same unchecked fallback.
  test("a name with no alphanumerics skips the uniqueness check entirely", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    await createReferral("...", "a@b.test");

    expect(db.referral.findUnique).not.toHaveBeenCalled();
    expect(db.referral.create).toHaveBeenCalledOnce();
  });

  // NOTE: the fallback is Math.random().toString(36).substring(2, 9), whose
  // length depends on how many base-36 digits the draw happens to have.
  test("the fallback length varies with the draw", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    await createReferral("...", "a@b.test");
    const short = db.referral.create.mock.calls[0][0].data.referral_code;

    vi.clearAllMocks();
    db.referral.create.mockResolvedValue({ id: "r-2" });
    vi.spyOn(Math, "random").mockReturnValue(0.123456789012345);
    await createReferral("...", "b@c.test");
    const long = db.referral.create.mock.calls[0][0].data.referral_code;

    expect(short).toBe("i");
    expect(long.length).toBeGreaterThan(short.length);
  });

  test("a draw of exactly zero produces an empty code", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    await createReferral("...", "a@b.test");

    expect(db.referral.create.mock.calls[0][0].data.referral_code).toBe("");
  });

  test("stores the counters at zero", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

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
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

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

  // NOTE: the only check on the email is that it is truthy — there is no route
  // schema and no format validation anywhere.
  test("accepts anything non-empty as an email", async () => {
    const rep = reply();

    await createReferralHandler(request({ body: { name: "Ann", email: "not-an-email" } }), rep);

    expect(db.referral.create.mock.calls[0][0].data.email).toBe("not-an-email");
    expect(answer(rep).code).toBe(201);
  });

  // NOTE: Referral has unique constraints on BOTH email and referral_code
  // (prisma/schema.prisma:2811, :2813), and every P2002 is reported as a
  // duplicate email.
  test("reports a referral-code collision as a duplicate email", async () => {
    db.referral.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed on the fields: (`referral_code`)"), {
        code: "P2002",
      }),
    );
    const rep = reply();

    await createReferralHandler(request({ body: { name: "Ann", email: "ann@example.test" } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Email already exists" } });
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

    expect(db.referral.delete).toHaveBeenCalledWith({ where: { id: "r-1" } });
  });

  test("400s when no id is present", async () => {
    const rep = reply();

    await deleteReferralHandler(request({ params: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "id is required" } });
  });

  // NOTE: a missing row raises P2025 and is reported as a server error, so the
  // caller cannot tell a stale id from a fault.
  test("a missing row answers 500 rather than 404", async () => {
    db.referral.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );
    const rep = reply();

    await deleteReferralHandler(request({ params: { id: "r-1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Internal server error" } });
  });

  test("the counters are lost with the row", async () => {
    const rep = reply();

    await deleteReferralHandler(request({ params: { id: "r-1" } }), rep);

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Referral deleted successfully" },
    });
  });
});
