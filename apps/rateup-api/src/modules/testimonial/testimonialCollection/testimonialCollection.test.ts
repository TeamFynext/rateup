import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    testimonialCollection: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testimonialCollectionMap: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  addMultipleTestimonialToCollection,
  createTestimonialCollection,
  deleteMultipleTestimonialFromCollection,
  deleteTestimonialCollection,
  getCollectionsByOrgId,
  getTestimonialCollectionById,
  getTestimonialCollectionsByTeamId,
  updateTestimonialCollection,
} from "./testimonialCollection.service.js";
import {
  addMultipleTestimonialToCollectionHandler,
  createTestimonialCollectionHandler,
  deleteMultipleTestimonialsFromCollectionHandler,
  deleteTestimonialCollectionHandler,
  getTestimonialCollectionByIdHandler,
  getTestimonialCollections,
  updateTestimonialCollectionHandler,
} from "./testimonialCollection.controller.js";
import { testimonialCollectionRoutes } from "./testimonialCollection.route.js";
import { testimonialPublicRoutes } from "../testimonialPublic.route.js";
import {
  byIdParamsSchema,
  createTestimonialCollectionSchema,
  updateTestimonialCollectionSchema,
} from "./testimonialCollection.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  testimonialCollection: Record<string, Mock>;
  testimonialCollectionMap: Record<string, Mock>;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const OWN_TEAM = "22222222-2222-2222-2222-222222222222";
const VICTIM_TEAM = "33333333-3333-3333-3333-333333333333";
const OWN_COLLECTION = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const VICTIM_COLLECTION = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";
const VICTIM_TESTIMONIAL = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

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
  db.testimonialCollection.create.mockResolvedValue({ id: OWN_COLLECTION, name: "Wall of love" });
  db.testimonialCollection.findMany.mockResolvedValue([]);
  db.testimonialCollection.findUnique.mockResolvedValue(null);
  db.testimonialCollection.update.mockResolvedValue({ id: OWN_COLLECTION });
  db.testimonialCollection.delete.mockResolvedValue({ id: OWN_COLLECTION });
  db.testimonialCollectionMap.createMany.mockResolvedValue({ count: 1 });
  db.testimonialCollectionMap.deleteMany.mockResolvedValue({ count: 0 });
  db.testimonialCollectionMap.findMany.mockResolvedValue([]);
});

// ===========================================================================
// Adding testimonials — neither side is checked
// ===========================================================================

describe("addMultipleTestimonialToCollection", () => {
  // NOTE: the collection id comes from the path and the testimonial ids from
  // the body. Neither is resolved to a team or an org before the join rows are
  // written.
  test("links any testimonial id to any collection id", async () => {
    await addMultipleTestimonialToCollection(OWN_COLLECTION, [VICTIM_TESTIMONIAL]);

    expect(db.testimonialCollectionMap.createMany).toHaveBeenCalledWith({
      data: [{ testimonialId: VICTIM_TESTIMONIAL, collectionId: OWN_COLLECTION }],
    });
  });

  test("reads only the collection's existing links, never its owner", async () => {
    await addMultipleTestimonialToCollection(OWN_COLLECTION, [VICTIM_TESTIMONIAL]);

    expect(db.testimonialCollectionMap.findMany.mock.calls[0][0]).toEqual({
      where: { collectionId: OWN_COLLECTION },
      select: { testimonialId: true },
    });
    expect(db.testimonialCollection.findUnique).not.toHaveBeenCalled();
  });

  test("skips ids the collection already holds", async () => {
    db.testimonialCollectionMap.findMany.mockResolvedValueOnce([
      { testimonialId: VICTIM_TESTIMONIAL },
    ]);

    await addMultipleTestimonialToCollection(OWN_COLLECTION, [VICTIM_TESTIMONIAL, "t-2"]);

    expect(db.testimonialCollectionMap.createMany.mock.calls[0][0].data).toEqual([
      { testimonialId: "t-2", collectionId: OWN_COLLECTION },
    ]);
  });

  test("the handler never consults the session org", async () => {
    const req: any = {
      params: { id: OWN_COLLECTION },
      body: { testimonialIds: [VICTIM_TESTIMONIAL] },
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(addMultipleTestimonialToCollectionHandler(req, reply())).resolves.toBeUndefined();
    expect(db.testimonialCollectionMap.createMany).toHaveBeenCalledOnce();
  });

  // NOTE: getTestimonialCollectionById is registered on the PUBLIC route
  // (testimonialPublic.route.ts:6, prefix /api/public/testimonials), which is
  // deliberate — collections are embeddable. Combined with the unchecked add
  // above, that turns an arbitrary testimonial id into a public URL.
  test("the read that follows returns the full testimonial rows", async () => {
    db.testimonialCollection.findUnique.mockResolvedValueOnce({
      id: OWN_COLLECTION,
      teamId: OWN_TEAM,
      testimonials: [
        { testimonial: { id: VICTIM_TESTIMONIAL, testimonial: { name: "Ann", text: "private" } } },
      ],
    });

    const collection = await getTestimonialCollectionById(OWN_COLLECTION);

    expect(collection.testimonials).toEqual([
      { id: VICTIM_TESTIMONIAL, testimonial: { name: "Ann", text: "private" } },
    ]);
  });

  test("the by-id read selects the whole testimonial, not a projection", async () => {
    await getTestimonialCollectionById(OWN_COLLECTION);

    expect(db.testimonialCollection.findUnique.mock.calls[0][0].include).toEqual({
      testimonials: { select: { testimonial: true } },
    });
  });

  test("an empty id list writes an empty batch rather than refusing", async () => {
    await addMultipleTestimonialToCollection(OWN_COLLECTION, []);

    expect(db.testimonialCollectionMap.createMany).toHaveBeenCalledWith({ data: [] });
  });
});

describe("deleteMultipleTestimonialFromCollection", () => {
  test("removes links by collection and testimonial id alone", async () => {
    await deleteMultipleTestimonialFromCollection(VICTIM_COLLECTION, [VICTIM_TESTIMONIAL]);

    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: VICTIM_COLLECTION, testimonialId: { in: [VICTIM_TESTIMONIAL] } },
    });
  });

  test("the handler passes the path and body through with no org check", async () => {
    const rep = reply();

    await deleteMultipleTestimonialsFromCollectionHandler(
      {
        params: { id: VICTIM_COLLECTION },
        body: { testimonialIds: [VICTIM_TESTIMONIAL] },
      } as never,
      rep,
    );

    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledOnce();
    expect(answer(rep).code).toBe(200);
  });

  // NOTE: both "multiple" handlers interpolate the caught error into the
  // response body, unlike the other five which send a fixed string.
  test("interpolates the raw error into the response", async () => {
    db.testimonialCollectionMap.deleteMany.mockRejectedValueOnce(
      new Error("Invalid `prisma.testimonialCollectionMap.deleteMany()` invocation"),
    );
    const rep = reply();

    await deleteMultipleTestimonialsFromCollectionHandler(
      { params: { id: VICTIM_COLLECTION }, body: { testimonialIds: [] } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body.error).toContain("prisma.testimonialCollectionMap.deleteMany()");
  });

  test("the add handler leaks the same way", async () => {
    db.testimonialCollectionMap.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await addMultipleTestimonialToCollectionHandler(
      { params: { id: OWN_COLLECTION }, body: { testimonialIds: [] } } as never,
      rep,
    );

    expect(answer(rep).body.error).toContain("db down");
  });
});

// ===========================================================================
// The by-id writers
// ===========================================================================

describe("updateTestimonialCollection", () => {
  test("selects the collection by id alone", async () => {
    await updateTestimonialCollection({ name: "Renamed" }, VICTIM_COLLECTION);

    expect(db.testimonialCollection.update.mock.calls[0][0].where).toEqual({
      id: VICTIM_COLLECTION,
    });
  });

  test("the handler takes the id from the path and nothing from the session", async () => {
    const req: any = {
      params: { id: VICTIM_COLLECTION },
      body: { name: "Renamed by another tenant" },
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(updateTestimonialCollectionHandler(req, reply())).resolves.toBeUndefined();
    expect(db.testimonialCollection.update.mock.calls[0][0].where.id).toBe(VICTIM_COLLECTION);
  });

  // NOTE: the two map writes are not in a transaction, so a failure between
  // them leaves the collection emptied.
  test("clears the whole membership before writing the new set", async () => {
    await updateTestimonialCollection({ testimonialIds: [VICTIM_TESTIMONIAL] }, VICTIM_COLLECTION);

    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: VICTIM_COLLECTION },
    });
    expect(db.testimonialCollectionMap.createMany.mock.calls[0][0].data).toEqual([
      { testimonialId: VICTIM_TESTIMONIAL, collectionId: VICTIM_COLLECTION },
    ]);
  });

  test("a failure after the clear leaves the collection empty", async () => {
    db.testimonialCollectionMap.createMany.mockRejectedValueOnce(new Error("db down"));

    await expect(
      updateTestimonialCollection({ testimonialIds: ["t-1"] }, VICTIM_COLLECTION),
    ).rejects.toThrow("db down");
    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledOnce();
    expect(db.testimonialCollection.update).not.toHaveBeenCalled();
  });

  // NOTE: the guard is `if (testimonialIds?.length)`, so an empty array is
  // falsy and skips the block entirely — there is no way to empty a collection
  // through this endpoint.
  test("an empty testimonialIds array changes no membership", async () => {
    await updateTestimonialCollection({ testimonialIds: [] }, VICTIM_COLLECTION);

    expect(db.testimonialCollectionMap.deleteMany).not.toHaveBeenCalled();
    expect(db.testimonialCollectionMap.createMany).not.toHaveBeenCalled();
  });

  test("omitting testimonialIds leaves the membership alone", async () => {
    await updateTestimonialCollection({ name: "Renamed" }, VICTIM_COLLECTION);

    expect(db.testimonialCollectionMap.deleteMany).not.toHaveBeenCalled();
  });

  test("writes name and theme as given, undefined included", async () => {
    await updateTestimonialCollection({ name: "Renamed" }, VICTIM_COLLECTION);

    expect(db.testimonialCollection.update.mock.calls[0][0].data).toEqual({
      name: "Renamed",
      theme: undefined,
    });
  });

  test("the update schema makes every field optional", () => {
    expect(updateTestimonialCollectionSchema.safeParse({}).success).toBe(true);
  });
});

describe("deleteTestimonialCollection", () => {
  test("deletes by id alone", async () => {
    await deleteTestimonialCollection(VICTIM_COLLECTION);

    expect(db.testimonialCollection.delete).toHaveBeenCalledWith({
      where: { id: VICTIM_COLLECTION },
    });
  });

  test("the handler consults nothing but the path", async () => {
    const req: any = {
      params: { id: VICTIM_COLLECTION },
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(deleteTestimonialCollectionHandler(req, reply())).resolves.toBeUndefined();
    expect(db.testimonialCollection.delete).toHaveBeenCalledOnce();
  });

  test("a missing collection answers 500 rather than 404", async () => {
    db.testimonialCollection.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );
    const rep = reply();

    await deleteTestimonialCollectionHandler({ params: { id: VICTIM_COLLECTION } } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
    expect(log.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// createTestimonialCollection
// ===========================================================================

describe("createTestimonialCollection", () => {
  // NOTE: teamId is a required body field and nothing checks it against the
  // caller's org, so a collection can be created inside any team on the
  // platform.
  test("creates the collection inside whatever team the body names", async () => {
    await createTestimonialCollection({ name: "Wall", teamId: VICTIM_TEAM } as never);

    expect(db.testimonialCollection.create).toHaveBeenCalledWith({
      data: { name: "Wall", teamId: VICTIM_TEAM, theme: undefined },
    });
  });

  test("the handler passes the body straight through", async () => {
    const rep = reply();

    await createTestimonialCollectionHandler(
      { body: { name: "Wall", teamId: VICTIM_TEAM }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(db.testimonialCollection.create.mock.calls[0][0].data.teamId).toBe(VICTIM_TEAM);
    expect(answer(rep).code).toBe(201);
  });

  test("the create schema requires a team but no org", () => {
    expect(createTestimonialCollectionSchema.safeParse({ name: "Wall" }).success).toBe(false);
    expect(
      createTestimonialCollectionSchema.safeParse({ name: "Wall", teamId: VICTIM_TEAM }).success,
    ).toBe(true);
  });

  test("the id and team fields are plain strings, not uuids", () => {
    expect(byIdParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(true);
    expect(
      createTestimonialCollectionSchema.safeParse({ name: "W", teamId: "not-a-uuid" }).success,
    ).toBe(true);
  });

  // NOTE: (name, teamId) is unique on the model (prisma/schema.prisma:1468), so
  // a duplicate name raises P2002 — and there is no 409 branch, so it reports
  // as a generic server error.
  test("a duplicate name in the same team answers 500 rather than 409", async () => {
    db.testimonialCollection.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const rep = reply();

    await createTestimonialCollectionHandler(
      { body: { name: "Wall", teamId: OWN_TEAM }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

// ===========================================================================
// The listing — one scoped path, bypassed by a query parameter
// ===========================================================================

describe("getTestimonialCollections", () => {
  // NOTE: this is the only org-scoped read in the module.
  test("falls back to the caller's org when no team is named", async () => {
    await getTestimonialCollections({ query: {}, user: { orgId: ORG } } as never, reply());

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where).toEqual({
      team: { orgId: ORG },
    });
  });

  // NOTE: ...and naming any team in the query string takes the other branch,
  // which filters on that team and nothing else.
  test("a teamId in the query takes the unscoped branch", async () => {
    await getTestimonialCollections(
      { query: { teamId: VICTIM_TEAM }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where).toEqual({
      teamId: VICTIM_TEAM,
    });
  });

  test("the by-team service adds no org condition", async () => {
    await getTestimonialCollectionsByTeamId(VICTIM_TEAM);

    const where = db.testimonialCollection.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).not.toContain("org");
  });

  test("the org listing joins through the team", async () => {
    await getCollectionsByOrgId(ORG);

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where).toEqual({
      team: { orgId: ORG },
    });
  });

  test("both listings count testimonials rather than returning them", async () => {
    await getCollectionsByOrgId(ORG);
    await getTestimonialCollectionsByTeamId(VICTIM_TEAM);

    for (const call of db.testimonialCollection.findMany.mock.calls) {
      expect(call[0].include).toEqual({ _count: { select: { testimonials: true } } });
    }
  });
});

// ===========================================================================
// The public read
// ===========================================================================

describe("getTestimonialCollectionById", () => {
  // NOTE: spreading null yields {}, so a collection that does not exist comes
  // back as an object with an undefined testimonials key — and the handler
  // answers 200.
  test("answers 200 with an empty object for an id that does not exist", async () => {
    const rep = reply();

    await getTestimonialCollectionByIdHandler({ params: { id: VICTIM_COLLECTION } } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { testimonials: undefined } });
  });

  test("returns the collection's own fields alongside the testimonials", async () => {
    db.testimonialCollection.findUnique.mockResolvedValueOnce({
      id: OWN_COLLECTION,
      name: "Wall",
      teamId: OWN_TEAM,
      theme: { layout: "grid" },
      testimonials: [],
    });

    const collection = await getTestimonialCollectionById(OWN_COLLECTION);

    expect(collection).toMatchObject({ id: OWN_COLLECTION, name: "Wall", teamId: OWN_TEAM });
  });

  // NOTE: teamId travels to the public response, so the widget payload
  // discloses which team owns the collection.
  test("the public payload carries the owning team id", async () => {
    db.testimonialCollection.findUnique.mockResolvedValueOnce({
      id: OWN_COLLECTION,
      teamId: OWN_TEAM,
      testimonials: [],
    });
    const rep = reply();

    await getTestimonialCollectionByIdHandler({ params: { id: OWN_COLLECTION } } as never, rep);

    expect(answer(rep).body.teamId).toBe(OWN_TEAM);
  });

  test("a read failure answers a fixed 500", async () => {
    db.testimonialCollection.findUnique.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await getTestimonialCollectionByIdHandler({ params: { id: OWN_COLLECTION } } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

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

describe("route registration", () => {
  test("the authenticated tree adds checkSession and nothing else", async () => {
    const { srv, hooks, routes } = fakeServer();

    await testimonialCollectionRoutes(srv);

    expect(hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
    for (const r of routes) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });

  test("registers six authenticated routes", async () => {
    const { srv, routes } = fakeServer();

    await testimonialCollectionRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /create",
      "GET /",
      "PUT /update/:id",
      "DELETE /:id",
      "POST /:id/testimonials",
      "DELETE /:id/testimonials",
    ]);
  });

  // NOTE: the by-id read is not on this tree at all — it is registered on the
  // public one, which is what makes the unchecked add (28-style) publishable.
  test("the by-id read is absent from the authenticated tree", async () => {
    const { srv, routes } = fakeServer();

    await testimonialCollectionRoutes(srv);

    expect(routes.find((r) => r.method === "GET" && r.url === "/:id")).toBeUndefined();
  });

  test("the public tree exposes the by-id read with no session check", async () => {
    const { srv, routes, hooks } = fakeServer();

    await testimonialPublicRoutes(srv);

    expect(hooks).toHaveLength(0);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: "GET", url: "/:id" });
    expect(routes[0].opts.preHandler).toBeUndefined();
    expect(routes[0].handler).toBe(getTestimonialCollectionByIdHandler);
  });

  test("the public route validates only the id shape", async () => {
    const { srv, routes } = fakeServer();

    await testimonialPublicRoutes(srv);

    expect(routes[0].opts.schema.params).toBe(byIdParamsSchema);
    expect(routes[0].opts.schema.response).toBeUndefined();
  });
});
