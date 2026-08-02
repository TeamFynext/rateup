import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      meta: any;
      constructor(code: string, meta?: any) {
        super(code);
        this.code = code;
        this.meta = meta;
      }
    },
  },
}));

vi.mock("../../utils/prisma.js", () => ({
  default: {
    generateQr: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/redisConnection.js", () => ({ default: { set: vi.fn() } }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../utils/rateLimit.js", () => ({
  rateLimit: vi.fn((opts) => Object.assign(vi.fn(), { opts })),
}));

import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import connection from "../../utils/redisConnection.js";
import { checkSession } from "../../utils/checkSession.js";
import {
  createGenerateQrRecordInDB,
  deleteGenerateQrRecordInDB,
  getAllGenerateQrRecordsFromDB,
  getGenerateQrRecordWithShortIdFromDB,
  getPublicGenerateQrRecordWithShortIdFromDB,
  incrementNoOfScansInDB,
  updateGenerateQrRecordWithShortIdInDB,
} from "./generateQr.service.js";
import {
  createGenerateQrRecord,
  deleteGenerateQrRecordWithShortId,
  getGenerateQrRecords,
  getGenerateQrRecordWithShortId,
  getPublicGenerateQrRecordWithShortId,
  incrementGenerateQrNoOfScans,
  updateGenerateQrRecordWithShortId,
} from "./generateQr.controllers.js";
import linkRoutes from "./generateQr.routes.js";
import {
  createGenerateQrRecordReqBody,
  generateQrBaseSchema,
  getGenerateQrRecordWithShortIdParams,
  updateGenerateQrRecordReqBody,
} from "./generateQr.schema.js";
import {
  createGenerateQrRecordRouteOptions,
  deleteGenerateQrRecordWithShortIdRouteOptions,
  getAllGenerateQrRecordsRouteOptions,
  getGenerateQrRecordWithShortIdRouteOptions,
  getPublicGenerateQrRecordWithShortIdRouteOptions,
  incrementGenerateQrNoOfScansRouteOptions,
  updateGenerateQrRecordWithShortIdRouteOptions,
} from "./generateQr.routeOptions.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { generateQr: Record<string, Mock> };

const FakeKnownError = (Prisma as any).PrismaClientKnownRequestError as new (
  code: string,
  meta?: any,
) => Error & { code: string; meta: any };

const ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG = "22222222-2222-2222-2222-222222222222";
const USER = "33333333-3333-3333-3333-333333333333";
const SHORT = "Bc7Fh9Km";

/** `GenerateQr.shareSettings` is a nullable Json column. */
const NULL_JSON: Prisma.JsonValue = null;

function row(over: Record<string, unknown> = {}) {
  return {
    id: "qr-1",
    name: "Table tent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdById: USER,
    ownerOrgId: ORG,
    shortUrlId: SHORT,
    shareSettings: NULL_JSON,
    link: "https://rateup.app/s/abc",
    noOfScans: 0,
    ...over,
  };
}

function req(over: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    user: { userId: USER, orgId: ORG, role: "MEMBER", email: "a@b.c" },
    ...over,
  } as any;
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  // "OK" is what Redis answers when SET NX actually set the key — i.e. this is
  // the first scan from this address for this code today.
  (connection.set as unknown as Mock).mockResolvedValue("OK");
  db.generateQr.updateMany.mockResolvedValue({ count: 1 });
  db.generateQr.create.mockResolvedValue(row());
  db.generateQr.findFirst.mockResolvedValue(row());
  db.generateQr.findMany.mockResolvedValue([row()]);
  db.generateQr.update.mockResolvedValue(row());
  db.generateQr.delete.mockResolvedValue(row());
});

// ===========================================================================
// Creation
// ===========================================================================

describe("createGenerateQrRecordInDB", () => {
  test("takes the org and the author from the session, not the body", async () => {
    await createGenerateQrRecordInDB(
      req({
        body: { name: "Table tent", link: "https://x.test", ownerOrgId: OTHER_ORG },
      }),
    );

    const data = db.generateQr.create.mock.calls[0][0].data;
    expect(data.ownerOrgId).toBe(ORG);
    expect(data.createdById).toBe(USER);
  });

  test("writes only the four fields it builds", async () => {
    await createGenerateQrRecordInDB(req({ body: { name: "T", link: "https://x.test" } }));

    expect(Object.keys(db.generateQr.create.mock.calls[0][0].data).sort()).toEqual([
      "createdById",
      "link",
      "name",
      "ownerOrgId",
      "shortUrlId",
    ]);
  });

  test("mints an eight-character short id", async () => {
    await createGenerateQrRecordInDB(req({ body: { name: "T", link: "https://x.test" } }));

    const { shortUrlId } = db.generateQr.create.mock.calls[0][0].data;
    expect(shortUrlId).toMatch(/^[0-9A-Za-z]{8}$/);
  });

  test("a caller-supplied shortUrlId is ignored", async () => {
    await createGenerateQrRecordInDB(
      req({ body: { name: "T", link: "https://x.test", shortUrlId: "chosen" } }),
    );

    expect(db.generateQr.create.mock.calls[0][0].data.shortUrlId).not.toBe("chosen");
  });

  test("noOfScans is left to the database default", async () => {
    await createGenerateQrRecordInDB(req({ body: { name: "T", link: "https://x.test" } }));

    expect(db.generateQr.create.mock.calls[0][0].data).not.toHaveProperty("noOfScans");
  });
});

// ===========================================================================
// The org-scoped reads
// ===========================================================================

describe("the authenticated reads", () => {
  test("the single read is scoped to the session org", async () => {
    await getGenerateQrRecordWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.generateQr.findFirst).toHaveBeenCalledWith({
      where: { shortUrlId: SHORT, ownerOrgId: ORG },
    });
  });

  test("another org's short id resolves to nothing", async () => {
    db.generateQr.findFirst.mockResolvedValueOnce(null);

    await expect(
      getGenerateQrRecordWithShortIdFromDB(req({ params: { shortUrlId: SHORT } })),
    ).resolves.toBeNull();
  });

  test("the listing is scoped to the session org and newest first", async () => {
    await getAllGenerateQrRecordsFromDB(req());

    expect(db.generateQr.findMany).toHaveBeenCalledWith({
      where: { ownerOrgId: ORG },
      orderBy: { createdAt: "desc" },
    });
  });

  test("the listing returns the whole row, including the owning org", async () => {
    // NOTE: the route's response schema is what strips ownerOrgId and
    // createdById; the service itself selects nothing and returns everything.
    const rows = await getAllGenerateQrRecordsFromDB(req());

    expect(rows[0]).toHaveProperty("ownerOrgId", ORG);
    expect(db.generateQr.findMany.mock.calls[0][0]).not.toHaveProperty("select");
  });
});

// ===========================================================================
// The public read
// ===========================================================================

describe("getPublicGenerateQrRecordWithShortIdFromDB", () => {
  test("looks the record up on the short id alone", async () => {
    await getPublicGenerateQrRecordWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.generateQr.findFirst.mock.calls[0][0].where).toEqual({ shortUrlId: SHORT });
  });

  test("exposes only name, short id and link", async () => {
    await getPublicGenerateQrRecordWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.generateQr.findFirst.mock.calls[0][0].select).toEqual({
      name: true,
      shortUrlId: true,
      link: true,
    });
  });

  test("the scan count and the owning org are not exposed", async () => {
    await getPublicGenerateQrRecordWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    const select = db.generateQr.findFirst.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("noOfScans");
    expect(select).not.toHaveProperty("ownerOrgId");
    expect(select).not.toHaveProperty("shareSettings");
  });

  test("an unknown short id resolves to null rather than throwing", async () => {
    db.generateQr.findFirst.mockResolvedValueOnce(null);

    await expect(
      getPublicGenerateQrRecordWithShortIdFromDB(req({ params: { shortUrlId: "nope" } })),
    ).resolves.toBeNull();
  });
});

// ===========================================================================
// The org-scoped writes
// ===========================================================================

describe("updateGenerateQrRecordWithShortIdInDB", () => {
  test("carries the session org into the where clause", async () => {
    await updateGenerateQrRecordWithShortIdInDB(
      req({ body: { shortUrlId: SHORT, name: "Renamed" } }),
    );

    expect(db.generateQr.update.mock.calls[0][0].where).toEqual({
      shortUrlId: SHORT,
      ownerOrgId: ORG,
    });
  });

  test("the short id is removed from the data it writes", async () => {
    await updateGenerateQrRecordWithShortIdInDB(
      req({ body: { shortUrlId: SHORT, name: "Renamed", link: "https://y.test" } }),
    );

    expect(db.generateQr.update.mock.calls[0][0].data).toEqual({
      name: "Renamed",
      link: "https://y.test",
    });
  });

  test("everything else in the body is spread into the update unfiltered", async () => {
    // NOTE: the route schema is the only thing bounding this. The service
    // spreads whatever survives it.
    await updateGenerateQrRecordWithShortIdInDB(
      req({ body: { shortUrlId: SHORT, noOfScans: 9999, ownerOrgId: OTHER_ORG } }),
    );

    expect(db.generateQr.update.mock.calls[0][0].data).toEqual({
      noOfScans: 9999,
      ownerOrgId: OTHER_ORG,
    });
  });

  test("a record owned by another org is not updated", async () => {
    db.generateQr.update.mockRejectedValueOnce(new FakeKnownError("P2025"));

    await expect(
      updateGenerateQrRecordWithShortIdInDB(req({ body: { shortUrlId: SHORT } })),
    ).rejects.toMatchObject({ code: "P2025" });
  });
});

describe("deleteGenerateQrRecordInDB", () => {
  test("carries the session org into the where clause", async () => {
    await deleteGenerateQrRecordInDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.generateQr.delete).toHaveBeenCalledWith({
      where: { shortUrlId: SHORT, ownerOrgId: ORG },
    });
  });

  test("deleting another org's record rejects rather than succeeding silently", async () => {
    db.generateQr.delete.mockRejectedValueOnce(new FakeKnownError("P2025"));

    await expect(
      deleteGenerateQrRecordInDB(req({ params: { shortUrlId: SHORT } })),
    ).rejects.toMatchObject({ code: "P2025" });
  });
});

// ===========================================================================
// The public scan counter
// ===========================================================================

describe("incrementNoOfScansInDB", () => {
  // The counter is unauthenticated by design — a scanner has no session — so
  // the short id is still the whole of the where clause. What changed is that
  // the caller is bounded (44.2) and a miss is a miss rather than a 500 (44.4).
  test("increments on the short id alone", async () => {
    await incrementNoOfScansInDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.generateQr.updateMany).toHaveBeenCalledWith({
      where: { shortUrlId: SHORT },
      data: { noOfScans: { increment: 1 } },
    });
  });

  // Was a bare update, so P2025 escaped and asyncErrHandler turned an ordinary
  // client condition — a code that has since been deleted — into a 500 with a
  // stack trace in the log. See issues.txt 44.4.
  test("an unknown short id reports a miss rather than rejecting", async () => {
    db.generateQr.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(incrementNoOfScansInDB(req({ params: { shortUrlId: "nope" } }))).resolves.toBe(
      false,
    );
  });

  test("a counted scan reports it", async () => {
    await expect(incrementNoOfScansInDB(req({ params: { shortUrlId: SHORT } }))).resolves.toBe(
      true,
    );
  });
});

// ===========================================================================
// Controllers
// ===========================================================================

describe("controllers", () => {
  test("create answers 201 with the new record", async () => {
    const rep = reply();

    await createGenerateQrRecord(req({ body: { name: "T", link: "https://x.test" } }), rep);

    expect(answer(rep)).toEqual({ code: 201, body: row() });
  });

  test("a short id collision on create retries with the original request and succeeds", async () => {
    // NOTE: shortIdUniqueConstraintErrHandler's retry calls
    // `functionToBeHandled()` with none of the original ...args — previously
    // the service function itself was passed as functionToBeHandled with req
    // as a spread arg, so the retry lost the request and crashed with a
    // TypeError. The controller now wraps the service call in a closure that
    // captures req directly, so the retry succeeds instead of losing it.
    db.generateQr.create.mockRejectedValueOnce(
      new FakeKnownError("P2002", { target: ["shortUrlId"] }),
    );
    const rep = reply();

    await createGenerateQrRecord(req({ body: { name: "T", link: "https://x.test" } }), rep);

    expect(db.generateQr.create).toHaveBeenCalledTimes(2);
    expect(answer(rep)).toEqual({ code: 201, body: row() });
  });

  test("a unique-constraint error carrying no meta is rethrown untouched", async () => {
    // The guard reads err.meta?.target, so a P2002 with no meta is simply not a
    // shortUrlId collision: it is not retried and reaches the caller unchanged.
    const err = new FakeKnownError("P2002");
    db.generateQr.create.mockRejectedValueOnce(err);
    const rep = reply();

    await expect(
      createGenerateQrRecord(req({ body: { name: "T", link: "https://x.test" } }), rep),
    ).rejects.toBe(err);
    expect(db.generateQr.create).toHaveBeenCalledTimes(1);
  });

  test("an unrelated write failure is rethrown untouched", async () => {
    db.generateQr.create.mockRejectedValueOnce(new Error("connection lost"));
    const rep = reply();

    await expect(
      createGenerateQrRecord(req({ body: { name: "T", link: "https://x.test" } }), rep),
    ).rejects.toThrow("connection lost");
  });

  test("the authenticated read answers 404 when the org does not own it", async () => {
    db.generateQr.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await getGenerateQrRecordWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Generate Qr Record with requested shortId not found." },
    });
  });

  // The public read used to send the service's null with a 200, so anything
  // treating a 2xx as success read a dead QR code as a working one. Its
  // authenticated twin already answered 404 for the same condition.
  // See issues.txt 44.3.
  test("the public read answers 404 for an unknown short id", async () => {
    db.generateQr.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await getPublicGenerateQrRecordWithShortId(req({ params: { shortUrlId: "nope" } }), rep);

    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Generate Qr Record with requested shortId not found." },
    });
  });

  test("the two reads now answer a missing code the same way", async () => {
    db.generateQr.findFirst.mockResolvedValue(null);
    const publicRep = reply();
    const privateRep = reply();

    await getPublicGenerateQrRecordWithShortId(req({ params: { shortUrlId: "nope" } }), publicRep);
    await getGenerateQrRecordWithShortId(req({ params: { shortUrlId: "nope" } }), privateRep);

    expect(answer(publicRep)).toEqual(answer(privateRep));
  });

  test("the public read serves a record it does resolve", async () => {
    db.generateQr.findFirst.mockResolvedValueOnce({
      name: "T",
      shortUrlId: SHORT,
      link: "https://rateup.app/s/abc",
    });
    const rep = reply();

    await getPublicGenerateQrRecordWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body.link).toBe("https://rateup.app/s/abc");
  });

  test("the listing answers 200 with the array", async () => {
    const rep = reply();

    await getGenerateQrRecords(req(), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [row()] });
  });

  test("update answers 200 with the updated record", async () => {
    const rep = reply();

    await updateGenerateQrRecordWithShortId(req({ body: { shortUrlId: SHORT } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: row() });
  });

  test("delete answers a fixed success message and never the deleted row", async () => {
    const rep = reply();

    await deleteGenerateQrRecordWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Deleted QR sucessfully." },
    });
  });

  test("the scan counter counts a first scan and reports success", async () => {
    const rep = reply();

    await incrementGenerateQrNoOfScans(
      req({ params: { shortUrlId: SHORT }, ip: "203.0.113.1" }),
      rep,
    );

    expect(db.generateQr.updateMany).toHaveBeenCalledOnce();
    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Successfully incremented number of scan value." },
    });
  });

  // Anyone who knew an eight-character short id could raise another
  // organisation's scan count without bound, and noOfScans is the only measure
  // the product offers of whether a printed campaign worked. One scan per
  // address per code per day now. See issues.txt 44.2.
  test("a repeat scan from the same address is not counted again", async () => {
    (connection.set as unknown as Mock).mockResolvedValueOnce(null);
    const rep = reply();

    await incrementGenerateQrNoOfScans(
      req({ params: { shortUrlId: SHORT }, ip: "203.0.113.1" }),
      rep,
    );

    expect(db.generateQr.updateMany).not.toHaveBeenCalled();
    // Answered the same either way: whether this address was seen today is not
    // the caller's business.
    expect(answer(rep).code).toBe(200);
  });

  test("the dedup key names both the code and the address, and expires daily", async () => {
    await incrementGenerateQrNoOfScans(
      req({ params: { shortUrlId: SHORT }, ip: "203.0.113.1" }),
      reply(),
    );

    expect(connection.set).toHaveBeenCalledWith(
      `generateQr:scan:${SHORT}:203.0.113.1`,
      "1",
      "EX",
      86_400,
      "NX",
    );
  });

  test("a Redis failure counts the scan rather than dropping it", async () => {
    (connection.set as unknown as Mock).mockRejectedValueOnce(new Error("redis down"));
    const rep = reply();

    await incrementGenerateQrNoOfScans(req({ params: { shortUrlId: SHORT } }), rep);

    expect(db.generateQr.updateMany).toHaveBeenCalledOnce();
    expect(answer(rep).code).toBe(200);
  });

  // Was a 500 from an unauthenticated endpoint for the ordinary case of a
  // deleted code. See issues.txt 44.4.
  test("an unknown short id answers 404 rather than escaping as a 500", async () => {
    db.generateQr.updateMany.mockResolvedValueOnce({ count: 0 });
    const rep = reply();

    await expect(
      incrementGenerateQrNoOfScans(req({ params: { shortUrlId: "nope" } }), rep),
    ).resolves.toBeUndefined();
    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Generate Qr Record with requested shortId not found." },
    });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("routes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("registers seven routes behind a single onRoute hook", async () => {
    const { srv, routes, hooks } = fakeServer();

    await linkRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("onRoute");
    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /public/:shortUrlId",
      "POST /noOfScans/:shortUrlId",
      "POST /",
      "GET /:shortUrlId",
      "GET /",
      "PUT /",
      "DELETE /:shortUrlId",
    ]);
  });

  test("every route is registered two-arg, so the options object lands in opts", async () => {
    const { srv, routes } = fakeServer();

    await linkRoutes(srv);

    for (const r of routes) {
      expect(r.handler).toBeUndefined();
      expect(typeof r.opts.handler).toBe("function");
    }
  });

  test("the hook puts checkSession on a route with no config", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const opts: any = { schema: {} };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([checkSession]);
  });

  test("the hook adds nothing to a route flagged public", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const opts: any = { config: { isPublic: true } };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([]);
  });

  // Both branches used to ASSIGN, so a role check written into a route's own
  // options would have been discarded with no error and nothing in the route
  // table to show it — and a public route could not carry the rate limiter
  // 44.2 needs. See issues.txt 44.5.
  test("the hook keeps a preHandler a route declared for itself", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const ownGuard = vi.fn();
    const opts: any = { preHandler: [ownGuard] };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([checkSession, ownGuard]);
  });

  test("a public route keeps its own guard too", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const limiter = vi.fn();
    const opts: any = { config: { isPublic: true }, preHandler: [limiter] };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([limiter]);
    expect(opts.preHandler).not.toContain(checkSession);
  });

  test("a single-function preHandler is normalised rather than dropped", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const ownGuard = vi.fn();
    const opts: any = { preHandler: ownGuard };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([checkSession, ownGuard]);
  });

  test("isPublic must be exactly true — anything else gets the session check", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const opts: any = { config: { isPublic: "true" } };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([checkSession]);
  });

  test("exactly two route options declare themselves public", async () => {
    const publicOnes = [
      getPublicGenerateQrRecordWithShortIdRouteOptions,
      incrementGenerateQrNoOfScansRouteOptions,
    ];
    const privateOnes = [
      createGenerateQrRecordRouteOptions,
      getGenerateQrRecordWithShortIdRouteOptions,
      getAllGenerateQrRecordsRouteOptions,
      updateGenerateQrRecordWithShortIdRouteOptions,
      deleteGenerateQrRecordWithShortIdRouteOptions,
    ];

    for (const o of publicOnes) expect((o as any).config).toEqual({ isPublic: true });
    for (const o of privateOnes) expect((o as any).config).toBeUndefined();
  });

  // STILL OPEN (issues.txt 44.5): the module has no role gating at all — any
  // member can create, edit, repoint and delete any of the organisation's QR
  // codes. What is fixed is that adding a gate would now take effect.
  test("no authenticated route declares a role requirement", async () => {
    const authenticated = [
      createGenerateQrRecordRouteOptions,
      getGenerateQrRecordWithShortIdRouteOptions,
      getAllGenerateQrRecordsRouteOptions,
      updateGenerateQrRecordWithShortIdRouteOptions,
      deleteGenerateQrRecordWithShortIdRouteOptions,
    ];

    for (const o of authenticated) {
      expect(o).not.toHaveProperty("onRequest");
      expect((o as any).preHandler).toBeUndefined();
    }
  });

  test("the public counter carries a rate limiter", async () => {
    const limiter = (incrementGenerateQrNoOfScansRouteOptions as any).preHandler[0];

    expect(limiter.opts).toEqual({
      max: 120,
      windowSeconds: 3600,
      key: "generateQrScan",
    });
  });

  test("the public read validates its short id", async () => {
    expect(getPublicGenerateQrRecordWithShortIdRouteOptions.schema).toEqual({
      params: getGenerateQrRecordWithShortIdParams,
    });
  });

  test("the public scan counter validates its params but declares no response", async () => {
    expect(incrementGenerateQrNoOfScansRouteOptions.schema).toEqual({
      params: getGenerateQrRecordWithShortIdParams,
    });
  });
});

// ===========================================================================
// Schemas
// ===========================================================================

describe("schemas", () => {
  test("create requires a name and a link", () => {
    expect(createGenerateQrRecordReqBody.safeParse({ name: "T" }).success).toBe(false);
    expect(createGenerateQrRecordReqBody.safeParse({ link: "https://x.test" }).success).toBe(false);
    expect(
      createGenerateQrRecordReqBody.safeParse({ name: "T", link: "https://x.test" }).success,
    ).toBe(true);
  });

  // link is what the public endpoint hands to a scanner's browser, and it was a
  // bare z.string() — so `javascript:`, `data:` and the empty string were all
  // accepted and served. See issues.txt 44.1.
  test("the link must be an http or https URL", () => {
    for (const link of [
      "javascript:alert(1)",
      "data:text/html,<script>1</script>",
      "not a url",
      "ftp://x.test/f",
      "",
    ]) {
      expect(createGenerateQrRecordReqBody.safeParse({ name: "T", link }).success).toBe(false);
    }
    expect(
      createGenerateQrRecordReqBody.safeParse({ name: "T", link: "http://x.test" }).success,
    ).toBe(true);
    expect(
      createGenerateQrRecordReqBody.safeParse({ name: "T", link: "https://x.test/a?b=c" }).success,
    ).toBe(true);
  });

  test("the link is bounded in length", () => {
    expect(
      createGenerateQrRecordReqBody.safeParse({
        name: "T",
        link: `https://x.test/${"a".repeat(2100)}`,
      }).success,
    ).toBe(false);
  });

  test("an empty name is refused", () => {
    expect(
      createGenerateQrRecordReqBody.safeParse({ name: "", link: "https://x.test" }).success,
    ).toBe(false);
  });

  test("create strips unknown keys rather than rejecting them", () => {
    const parsed = createGenerateQrRecordReqBody.parse({
      name: "T",
      link: "https://x.test",
      noOfScans: 9999,
      ownerOrgId: OTHER_ORG,
    });

    expect(parsed).toEqual({ name: "T", link: "https://x.test" });
  });

  test("update requires the short id and leaves everything else optional", () => {
    expect(updateGenerateQrRecordReqBody.safeParse({}).success).toBe(false);
    expect(updateGenerateQrRecordReqBody.safeParse({ shortUrlId: SHORT }).success).toBe(true);
  });

  // Repointing a printed code is the point of a dynamic QR — what the update
  // may not do any more is repoint it at an unparseable value or a scheme the
  // browser executes.
  test("update takes a new link but holds it to the same rules", () => {
    expect(
      updateGenerateQrRecordReqBody.parse({ shortUrlId: SHORT, link: "https://elsewhere.test" })
        .link,
    ).toBe("https://elsewhere.test");
    expect(
      updateGenerateQrRecordReqBody.safeParse({ shortUrlId: SHORT, link: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });

  test("update cannot reach noOfScans or the owning org", () => {
    const parsed = updateGenerateQrRecordReqBody.parse({
      shortUrlId: SHORT,
      noOfScans: 9999,
      ownerOrgId: OTHER_ORG,
    });

    expect(parsed).toEqual({ shortUrlId: SHORT });
  });

  test("shareSettings is unvalidated JSON", () => {
    const parsed = updateGenerateQrRecordReqBody.parse({
      shortUrlId: SHORT,
      shareSettings: { anything: [1, 2, 3] },
    });

    expect(parsed.shareSettings).toEqual({ anything: [1, 2, 3] });
  });

  test("the response schema omits the owning org and the author", () => {
    const shape = Object.keys((generateQrBaseSchema as any).shape).sort();

    expect(shape).toEqual([
      "createdAt",
      "id",
      "link",
      "name",
      "noOfScans",
      "shareSettings",
      "shortUrlId",
    ]);
  });

  test("the params schema accepts any string as a short id", () => {
    expect(getGenerateQrRecordWithShortIdParams.safeParse({ shortUrlId: "x" }).success).toBe(true);
    expect(getGenerateQrRecordWithShortIdParams.safeParse({}).success).toBe(false);
  });
});
