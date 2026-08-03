import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => {
  const client = {
    testimonialCollection: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testimonialCollectionMap: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    testimonial: { findMany: vi.fn() },
    team: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  // The interactive form: run the callback against the same mocked client, so
  // what the tests pin is the statements the transaction would issue.
  client.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(client));
  return { default: client };
});

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  addMultipleTestimonialToCollection,
  CollectionAccessError,
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
  testimonial: Record<string, Mock>;
  team: Record<string, Mock>;
  $transaction: Mock;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const OWN_TEAM = "22222222-2222-2222-2222-222222222222";
const VICTIM_TEAM = "33333333-3333-3333-3333-333333333333";
const OWN_COLLECTION = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const VICTIM_COLLECTION = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";
const OWN_TESTIMONIAL = "9d8c7b6a-5f4e-4d3c-2b1a-0f9e8d7c6b5a";
const VICTIM_TESTIMONIAL = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

/** The caller's own collection and own testimonials resolve; anything else does not. */
function ownEverything() {
  db.testimonialCollection.findFirst.mockResolvedValue({ id: OWN_COLLECTION });
  db.team.findFirst.mockResolvedValue({ id: OWN_TEAM });
  db.testimonial.findMany.mockImplementation(async ({ where }: any) => {
    const ids: string[] = where.id?.in ?? [];
    return ids.filter((id) => id !== VICTIM_TESTIMONIAL).map((id) => ({ id }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  db.testimonialCollection.create.mockResolvedValue({ id: OWN_COLLECTION, name: "Wall of love" });
  db.testimonialCollection.findMany.mockResolvedValue([]);
  db.testimonialCollection.findUnique.mockResolvedValue(null);
  db.testimonialCollection.update.mockResolvedValue({ id: OWN_COLLECTION });
  db.testimonialCollection.delete.mockResolvedValue({ id: OWN_COLLECTION });
  db.testimonialCollectionMap.createMany.mockResolvedValue({ count: 1 });
  db.testimonialCollectionMap.deleteMany.mockResolvedValue({ count: 0 });
  db.testimonialCollectionMap.findMany.mockResolvedValue([]);
  ownEverything();
});

// ===========================================================================
// Adding testimonials — both sides are now resolved to an owner
// ===========================================================================

describe("addMultipleTestimonialToCollection", () => {
  // The collection id came from the path and the testimonial ids from the body,
  // and neither was resolved to a team or an org before the join rows were
  // written — which, with the public by-id read below, turned any testimonial id
  // into a page the attacker controls.
  test("resolves the collection through its team to the caller's org", async () => {
    await addMultipleTestimonialToCollection(OWN_COLLECTION, [OWN_TESTIMONIAL], ORG);

    expect(db.testimonialCollection.findFirst).toHaveBeenCalledWith({
      where: { id: OWN_COLLECTION, team: { orgId: ORG } },
      select: { id: true },
    });
    expect(db.testimonialCollectionMap.createMany).toHaveBeenCalledWith({
      data: [{ testimonialId: OWN_TESTIMONIAL, collectionId: OWN_COLLECTION }],
    });
  });

  test("refuses a collection that is not the caller's", async () => {
    db.testimonialCollection.findFirst.mockResolvedValueOnce(null);

    await expect(
      addMultipleTestimonialToCollection(VICTIM_COLLECTION, [OWN_TESTIMONIAL], ORG),
    ).rejects.toBeInstanceOf(CollectionAccessError);
    expect(db.testimonialCollectionMap.createMany).not.toHaveBeenCalled();
  });

  // The testimonial ids are checked through SurveyResponse -> SurveyTeamMap ->
  // Team, the same join the by-org listing uses.
  test("refuses a testimonial belonging to another org", async () => {
    await expect(
      addMultipleTestimonialToCollection(OWN_COLLECTION, [VICTIM_TESTIMONIAL], ORG),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.testimonialCollectionMap.createMany).not.toHaveBeenCalled();
  });

  test("checks ownership through the survey response's team", async () => {
    await addMultipleTestimonialToCollection(OWN_COLLECTION, [OWN_TESTIMONIAL], ORG);

    expect(db.testimonial.findMany.mock.calls[0][0].where).toEqual({
      id: { in: [OWN_TESTIMONIAL] },
      surveyResponse: { surveyTeamMap: { team: { orgId: ORG } } },
    });
  });

  test("skips ids the collection already holds", async () => {
    db.testimonialCollectionMap.findMany.mockResolvedValueOnce([
      { testimonialId: OWN_TESTIMONIAL },
    ]);

    await addMultipleTestimonialToCollection(OWN_COLLECTION, [OWN_TESTIMONIAL, "t-2"], ORG);

    expect(db.testimonialCollectionMap.createMany.mock.calls[0][0].data).toEqual([
      { testimonialId: "t-2", collectionId: OWN_COLLECTION },
    ]);
  });

  test("the handler takes the org from the session and answers 403 for a foreign id", async () => {
    const rep = reply();

    await addMultipleTestimonialToCollectionHandler(
      {
        params: { id: OWN_COLLECTION },
        body: { testimonialIds: [VICTIM_TESTIMONIAL] },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(403);
    expect(db.testimonialCollectionMap.createMany).not.toHaveBeenCalled();
  });

  // The read on the far end is registered on the PUBLIC tree
  // (testimonialPublic.route.ts, prefix /api/public/testimonials), which is
  // deliberate — collections are embeddable. That is what made the unchecked add
  // above publishable.
  test("the read that follows returns the collection's testimonials", async () => {
    db.testimonialCollection.findUnique.mockResolvedValueOnce({
      id: OWN_COLLECTION,
      testimonials: [{ testimonial: { id: OWN_TESTIMONIAL, testimonial: { name: "Ann" } } }],
    });

    const collection = await getTestimonialCollectionById(OWN_COLLECTION);

    expect(collection?.testimonials).toEqual([
      { id: OWN_TESTIMONIAL, testimonial: { name: "Ann" } },
    ]);
  });

  test("an empty id list writes an empty batch rather than refusing", async () => {
    await addMultipleTestimonialToCollection(OWN_COLLECTION, [], ORG);

    expect(db.testimonialCollectionMap.createMany).toHaveBeenCalledWith({ data: [] });
    expect(db.testimonial.findMany).not.toHaveBeenCalled();
  });
});

describe("deleteMultipleTestimonialFromCollection", () => {
  test("removes links only from a collection the caller owns", async () => {
    await deleteMultipleTestimonialFromCollection(OWN_COLLECTION, [OWN_TESTIMONIAL], ORG);

    expect(db.testimonialCollection.findFirst).toHaveBeenCalledWith({
      where: { id: OWN_COLLECTION, team: { orgId: ORG } },
      select: { id: true },
    });
    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: OWN_COLLECTION, testimonialId: { in: [OWN_TESTIMONIAL] } },
    });
  });

  // The destructive direction of 31.1: a collection id used to be enough to
  // empty another org's live widget.
  test("refuses to empty another org's collection", async () => {
    db.testimonialCollection.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await deleteMultipleTestimonialsFromCollectionHandler(
      {
        params: { id: VICTIM_COLLECTION },
        body: { testimonialIds: [VICTIM_TESTIMONIAL] },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Collection not found" } });
    expect(db.testimonialCollectionMap.deleteMany).not.toHaveBeenCalled();
  });

  // Both "multiple" handlers used to interpolate the caught error into the
  // response body — Prisma's message names the model and the failing field,
  // which on an endpoint accepting arbitrary ids is an existence oracle. The
  // other five handlers already sent a fixed string.
  test("a database failure answers a fixed 500", async () => {
    db.testimonialCollectionMap.deleteMany.mockRejectedValueOnce(
      new Error("Invalid `prisma.testimonialCollectionMap.deleteMany()` invocation"),
    );
    const rep = reply();

    await deleteMultipleTestimonialsFromCollectionHandler(
      {
        params: { id: OWN_COLLECTION },
        body: { testimonialIds: [] },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
    expect(log.error).toHaveBeenCalled();
  });

  test("the add handler sends the same fixed string", async () => {
    db.testimonialCollectionMap.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await addMultipleTestimonialToCollectionHandler(
      {
        params: { id: OWN_COLLECTION },
        body: { testimonialIds: [] },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep).body).toEqual({ error: "Something went wrong" });
  });
});

// ===========================================================================
// The by-id writers
// ===========================================================================

describe("updateTestimonialCollection", () => {
  test("scopes the update to the caller's org", async () => {
    await updateTestimonialCollection({ name: "Renamed" }, OWN_COLLECTION, ORG);

    expect(db.testimonialCollection.update.mock.calls[0][0].where).toEqual({
      id: OWN_COLLECTION,
      team: { orgId: ORG },
    });
  });

  // A collection id used to be enough for any authenticated user to rename
  // another org's published widget, replace its theme or replace its whole
  // membership — all visible on the victim's own website.
  test("refuses a collection that is not the caller's", async () => {
    db.testimonialCollection.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateTestimonialCollection({ name: "Renamed" }, VICTIM_COLLECTION, ORG),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.testimonialCollection.update).not.toHaveBeenCalled();
  });

  test("the handler takes the org from the session and answers 404", async () => {
    db.testimonialCollection.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await updateTestimonialCollectionHandler(
      {
        params: { id: VICTIM_COLLECTION },
        body: { name: "Renamed by another tenant" },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Collection not found" } });
  });

  // testimonialIds on the update path was written with no ownership check
  // either — 31.1 through a different door.
  test("refuses a membership containing another org's testimonial", async () => {
    await expect(
      updateTestimonialCollection({ testimonialIds: [VICTIM_TESTIMONIAL] }, OWN_COLLECTION, ORG),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.testimonialCollectionMap.deleteMany).not.toHaveBeenCalled();
  });

  // The clear and the rewrite used to run unwrapped, so a failure between them
  // left the published widget with no testimonials and nothing recording what it
  // had held.
  test("replaces the membership inside one transaction", async () => {
    await updateTestimonialCollection({ testimonialIds: [OWN_TESTIMONIAL] }, OWN_COLLECTION, ORG);

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: OWN_COLLECTION },
    });
    expect(db.testimonialCollectionMap.createMany.mock.calls[0][0].data).toEqual([
      { testimonialId: OWN_TESTIMONIAL, collectionId: OWN_COLLECTION },
    ]);
  });

  test("a failure inside the transaction propagates rather than half-applying", async () => {
    db.testimonialCollectionMap.createMany.mockRejectedValueOnce(new Error("db down"));

    await expect(
      updateTestimonialCollection({ testimonialIds: [OWN_TESTIMONIAL] }, OWN_COLLECTION, ORG),
    ).rejects.toThrow("db down");
    expect(db.testimonialCollection.update).not.toHaveBeenCalled();
  });

  // The guard was `if (testimonialIds?.length)`, so an empty array was falsy and
  // skipped the block — there was no way to empty a collection through this
  // endpoint, and a caller clearing the list in the UI saw no change.
  test("an empty testimonialIds array clears the membership", async () => {
    await updateTestimonialCollection({ testimonialIds: [] }, OWN_COLLECTION, ORG);

    expect(db.testimonialCollectionMap.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: OWN_COLLECTION },
    });
    expect(db.testimonialCollectionMap.createMany).not.toHaveBeenCalled();
  });

  test("omitting testimonialIds leaves the membership alone", async () => {
    await updateTestimonialCollection({ name: "Renamed" }, OWN_COLLECTION, ORG);

    expect(db.testimonialCollectionMap.deleteMany).not.toHaveBeenCalled();
  });

  test("writes name and theme as given, undefined included", async () => {
    await updateTestimonialCollection({ name: "Renamed" }, OWN_COLLECTION, ORG);

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
  test("scopes the delete to the caller's org", async () => {
    await deleteTestimonialCollection(OWN_COLLECTION, ORG);

    expect(db.testimonialCollection.delete).toHaveBeenCalledWith({
      where: { id: OWN_COLLECTION, team: { orgId: ORG } },
    });
  });

  // Deleting cascades TestimonialCollectionMap and leaves the embedded widget
  // with nothing to serve, so the unscoped version was defacement of a page the
  // victim's visitors see.
  test("a foreign or missing collection answers 404, not 500", async () => {
    db.testimonialCollection.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );
    const rep = reply();

    await deleteTestimonialCollectionHandler(
      { params: { id: VICTIM_COLLECTION }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Collection not found" } });
    expect(log.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// createTestimonialCollection
// ===========================================================================

describe("createTestimonialCollection", () => {
  // teamId is a required body field and nothing checked it against the caller's
  // org, so a collection could be planted inside any team on the platform, where
  // it would appear in that team's own listing.
  test("refuses a team outside the caller's org", async () => {
    db.team.findFirst.mockResolvedValueOnce(null);

    await expect(
      createTestimonialCollection({ name: "Wall", teamId: VICTIM_TEAM } as never, ORG),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.testimonialCollection.create).not.toHaveBeenCalled();
  });

  test("creates inside a team the caller's org owns", async () => {
    await createTestimonialCollection({ name: "Wall", teamId: OWN_TEAM } as never, ORG);

    expect(db.team.findFirst).toHaveBeenCalledWith({
      where: { id: OWN_TEAM, orgId: ORG },
      select: { id: true },
    });
    expect(db.testimonialCollection.create).toHaveBeenCalledWith({
      data: { name: "Wall", teamId: OWN_TEAM, theme: undefined },
    });
  });

  test("the handler passes the session org through", async () => {
    const rep = reply();

    await createTestimonialCollectionHandler(
      { body: { name: "Wall", teamId: OWN_TEAM }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(db.team.findFirst.mock.calls[0][0].where.orgId).toBe(ORG);
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

  // (name, teamId) is unique on the model, so a repeated name is P2002 — which
  // used to be reported as a generic server error.
  test("a duplicate name in the same team answers 409", async () => {
    db.testimonialCollection.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const rep = reply();

    await createTestimonialCollectionHandler(
      { body: { name: "Wall", teamId: OWN_TEAM }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 409,
      body: { error: "A collection with that name already exists" },
    });
  });
});

// ===========================================================================
// The listing — the query parameter no longer opts out of the org scope
// ===========================================================================

describe("getTestimonialCollections", () => {
  test("falls back to the caller's org when no team is named", async () => {
    await getTestimonialCollections({ query: {}, user: { orgId: ORG } } as never, reply());

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where).toEqual({
      team: { orgId: ORG },
    });
  });

  // Naming any team in the query string used to take a branch that filtered on
  // teamId alone, so the module's one scoped read was opt-out.
  test("a teamId in the query stays inside the caller's org", async () => {
    await getTestimonialCollections(
      { query: { teamId: VICTIM_TEAM }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where).toEqual({
      teamId: VICTIM_TEAM,
      team: { orgId: ORG },
    });
  });

  test("the by-team service takes the org as an argument, not from the query", async () => {
    await getTestimonialCollectionsByTeamId(VICTIM_TEAM, ORG);

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where.team).toEqual({ orgId: ORG });
  });

  test("the org listing joins through the team", async () => {
    await getCollectionsByOrgId(ORG);

    expect(db.testimonialCollection.findMany.mock.calls[0][0].where).toEqual({
      team: { orgId: ORG },
    });
  });

  test("both listings count testimonials rather than returning them", async () => {
    await getCollectionsByOrgId(ORG);
    await getTestimonialCollectionsByTeamId(OWN_TEAM, ORG);

    for (const call of db.testimonialCollection.findMany.mock.calls) {
      expect(call[0].include).toEqual({ _count: { select: { testimonials: true } } });
    }
  });
});

// ===========================================================================
// The public read
// ===========================================================================

describe("getTestimonialCollectionById", () => {
  // Spreading null yielded {}, a truthy object the handler answered 200 for — so
  // a deleted collection rendered as an empty wall rather than failing visibly,
  // and every id probed came back 200.
  test("answers 404 for an id that does not exist", async () => {
    const rep = reply();

    await getTestimonialCollectionByIdHandler({ params: { id: VICTIM_COLLECTION } } as never, rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Collection not found" } });
  });

  test("the service returns null rather than a spread of null", async () => {
    expect(await getTestimonialCollectionById(VICTIM_COLLECTION)).toBeNull();
  });

  // teamId used to travel to the public response, so the widget payload
  // disclosed the internal team id to every visitor of the embedding page.
  test("the public payload is a projection that omits the owning team id", async () => {
    db.testimonialCollection.findUnique.mockResolvedValueOnce({
      id: OWN_COLLECTION,
      name: "Wall",
      theme: { layout: "grid" },
      testimonials: [],
    });
    const rep = reply();

    await getTestimonialCollectionByIdHandler({ params: { id: OWN_COLLECTION } } as never, rep);

    expect(db.testimonialCollection.findUnique.mock.calls[0][0].select).toEqual({
      id: true,
      name: true,
      theme: true,
      testimonials: { select: { testimonial: true } },
    });
    expect(answer(rep).body).toEqual({
      id: OWN_COLLECTION,
      name: "Wall",
      theme: { layout: "grid" },
      testimonials: [],
    });
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

  // The by-id read is not on this tree at all — it is registered on the public
  // one, which is what made the unchecked add publishable.
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
