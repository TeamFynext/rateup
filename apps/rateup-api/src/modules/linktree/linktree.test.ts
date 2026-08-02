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
    linktree: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    org: { findFirst: vi.fn() },
    survey: { findMany: vi.fn() },
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
  UnknownLinkTypeError,
  createLinktreeInDB,
  deleteLinktreeInDB,
  generateAndGetOptionsFromDB,
  getAllLinktreesFromDB,
  getLinktreeWithShortIdFromDB,
  getPublicLinktreeWithShortIdFromDB,
  updateLinktreeWithShortIdInDB,
  updatePageVisitOrLinkClickInDB,
} from "./linktree.service.js";
import {
  createLinktree,
  deleteLinktreeById,
  getLinktrees,
  getLinktreeWithShortId,
  getLinkTypeDropdownOptions,
  getPublicLinktreeWithShortId,
  updateLinktreeWithShortId,
  updatePageVisitsOrLinkClicks,
} from "./linktree.controllers.js";
import linkRoutes from "./linktree.routes.js";
import {
  byIdParams,
  createLinktreeReqBody,
  linkTypeParams,
  linktreeBaseSchema,
  updateLinktreeReqBody,
  updatePageVisitsOrLinkClicksReqBody,
} from "./linktree.schema.js";
import {
  createLinktreeRouteOptions,
  deleteLinktreeByIdRouteOptions,
  getLinktreesRouteOptions,
  getLinktreeWithShortIdRouteOptions,
  getLinkTypeDropdownOptionsRouteOptions,
  getPublicLinktreeWithShortIdRouteOptions,
  updateLinktreeWithShortIdRouteOptions,
  updatePageVisitsOrLinkClicksOptions,
} from "./linktree.routeOptions.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  linktree: Record<string, Mock>;
  org: Record<string, Mock>;
  survey: Record<string, Mock>;
};

const FakeKnownError = (Prisma as any).PrismaClientKnownRequestError as new (
  code: string,
  meta?: any,
) => Error & { code: string; meta: any };

const ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG = "22222222-2222-2222-2222-222222222222";
const USER = "33333333-3333-3333-3333-333333333333";
const SHORT = "Bc7Fh9Km";
const ID = "44444444-4444-4444-4444-444444444444";

/** `Linktree.additionalData` / `.shareSettings` are nullable Json columns. */
const NULL_JSON: Prisma.JsonValue = null;

function links() {
  return [
    { id: "l-1", label: "Menu", url: "https://x.test/menu", noOfClicks: 3 },
    { id: "l-2", label: "Survey", url: "https://x.test/s", noOfClicks: 0 },
  ];
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: "Our links",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdById: USER,
    ownerOrgId: ORG,
    shortUrlId: SHORT,
    theme: { colour: "blue" },
    links: links(),
    additionalData: NULL_JSON,
    visitorsCount: 12,
    shareSettings: NULL_JSON,
    isPublished: true,
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
  db.linktree.create.mockResolvedValue(row());
  db.linktree.findFirst.mockResolvedValue(row());
  db.linktree.findMany.mockResolvedValue([row()]);
  db.linktree.update.mockResolvedValue(row());
  db.linktree.updateMany.mockResolvedValue({ count: 1 });
  db.linktree.delete.mockResolvedValue(row());
  db.org.findFirst.mockResolvedValue({ id: ORG, members: [] });
  db.survey.findMany.mockResolvedValue([]);
  // "OK" is what Redis answers when SET NX actually set the key — i.e. this is
  // the first visit or click from this address for this page today.
  (connection.set as unknown as Mock).mockResolvedValue("OK");
});

// ===========================================================================
// The org-scoped CRUD — the part the module gets right
// ===========================================================================

describe("createLinktreeInDB", () => {
  test("takes the org and the author from the session, not the body", async () => {
    await createLinktreeInDB(req({ body: { name: "Our links", ownerOrgId: OTHER_ORG } }));

    const data = db.linktree.create.mock.calls[0][0].data;
    expect(data.ownerOrgId).toBe(ORG);
    expect(data.createdById).toBe(USER);
  });

  test("writes only name, org, author and a minted short id", async () => {
    await createLinktreeInDB(req({ body: { name: "Our links" } }));

    expect(Object.keys(db.linktree.create.mock.calls[0][0].data).sort()).toEqual([
      "createdById",
      "name",
      "ownerOrgId",
      "shortUrlId",
    ]);
    expect(db.linktree.create.mock.calls[0][0].data.shortUrlId).toMatch(/^[0-9A-Za-z]{8}$/);
  });

  test("a new linktree starts unpublished and uncounted, by database default", async () => {
    await createLinktreeInDB(req({ body: { name: "Our links" } }));

    const data = db.linktree.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("isPublished");
    expect(data).not.toHaveProperty("visitorsCount");
    expect(data).not.toHaveProperty("links");
  });
});

describe("the org-scoped reads and writes", () => {
  test("the listing is scoped to the session org, newest first", async () => {
    await getAllLinktreesFromDB(req());

    expect(db.linktree.findMany).toHaveBeenCalledWith({
      where: { ownerOrgId: ORG },
      orderBy: { createdAt: "desc" },
    });
  });

  test("the authenticated single read is scoped to the session org", async () => {
    await getLinktreeWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.linktree.findFirst).toHaveBeenCalledWith({
      where: { shortUrlId: SHORT, ownerOrgId: ORG },
    });
  });

  test("update carries the session org into the where clause", async () => {
    await updateLinktreeWithShortIdInDB(req({ body: { shortUrlId: SHORT, name: "Renamed" } }));

    expect(db.linktree.update.mock.calls[0][0].where).toEqual({
      shortUrlId: SHORT,
      ownerOrgId: ORG,
    });
  });

  test("update strips the short id from the data and spreads the rest", async () => {
    await updateLinktreeWithShortIdInDB(
      req({ body: { shortUrlId: SHORT, name: "Renamed", isPublished: false } }),
    );

    expect(db.linktree.update.mock.calls[0][0].data).toEqual({
      name: "Renamed",
      isPublished: false,
    });
  });

  test("delete is scoped to the session org", async () => {
    await deleteLinktreeInDB(req({ params: { id: ID } }));

    expect(db.linktree.delete).toHaveBeenCalledWith({
      where: { id: ID, ownerOrgId: ORG },
    });
  });

  test("another org's record is refused by the database, not by the service", async () => {
    db.linktree.update.mockRejectedValueOnce(new FakeKnownError("P2025"));
    db.linktree.delete.mockRejectedValueOnce(new FakeKnownError("P2025"));

    await expect(
      updateLinktreeWithShortIdInDB(req({ body: { shortUrlId: SHORT } })),
    ).rejects.toMatchObject({ code: "P2025" });
    await expect(deleteLinktreeInDB(req({ params: { id: ID } }))).rejects.toMatchObject({
      code: "P2025",
    });
  });

  test("the delete id goes straight into the where clause unvalidated", async () => {
    // NOTE: deleteLinktreeByIdRouteOptions declares `schema: {}`, so nothing
    // checks that :id is a uuid before Prisma sees it.
    await deleteLinktreeInDB(req({ params: { id: "not-a-uuid" } }));

    expect(db.linktree.delete.mock.calls[0][0].where.id).toBe("not-a-uuid");
  });
});

// ===========================================================================
// The public read
// ===========================================================================

describe("getPublicLinktreeWithShortIdFromDB", () => {
  // isPublished was in the select list but not in the where, so a draft — its
  // name, its theme and every link on it — was fully readable by anyone holding
  // the short id, which exists from the moment the row does. See issues.txt 45.2.
  test("the query restricts it to published linktrees", async () => {
    await getPublicLinktreeWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.linktree.findFirst.mock.calls[0][0].where).toEqual({
      shortUrlId: SHORT,
      isPublished: true,
    });
  });

  test("an unpublished draft resolves to nothing", async () => {
    // The where does the work; a draft never comes back to be inspected.
    db.linktree.findFirst.mockResolvedValueOnce(null);

    await expect(
      getPublicLinktreeWithShortIdFromDB(req({ params: { shortUrlId: SHORT } })),
    ).resolves.toBeNull();
  });

  test("the visitor count and the owning org are not exposed", async () => {
    await getPublicLinktreeWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    const select = db.linktree.findFirst.mock.calls[0][0].select;
    expect(select).toEqual({
      name: true,
      shortUrlId: true,
      theme: true,
      links: true,
      isPublished: true,
    });
    expect(select).not.toHaveProperty("visitorsCount");
    expect(select).not.toHaveProperty("ownerOrgId");
  });
});

// ===========================================================================
// The link-type dropdown
// ===========================================================================

function survey(over: Record<string, unknown> = {}) {
  return {
    id: "s-1",
    title: "Lunch feedback",
    type: "web",
    teams: [{ team: { name: "Front of house", tags: ["vip"] } }],
    ...over,
  };
}

describe("generateAndGetOptionsFromDB", () => {
  // This used to walk org -> members -> user -> surveys with no `where` below
  // the org. Survey hangs off createdBy, a User, and a User may belong to any
  // number of organisations — so `user.surveys` was every survey that person
  // had ever created anywhere, and the dropdown handed a member of org A the
  // ids and titles of org B's surveys plus the name and tags of every team each
  // was mapped to. Surveys are queried through teams now, scoped to the session
  // org, the way getSurveysByUserId does. See issues.txt 45.1.
  test("queries surveys scoped to the session org, not through members", async () => {
    await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));

    expect(db.org.findFirst).not.toHaveBeenCalled();
    expect(db.survey.findMany.mock.calls[0][0].where).toEqual({
      type: "web",
      OR: [{ orgId: ORG }, { teams: { some: { team: { orgId: ORG } } } }],
    });
  });

  // Survey.orgId is nullable, so older rows carry the organisation on their
  // teams alone; both routes to the same org are accepted.
  test("accepts a survey that belongs by team as well as by column", async () => {
    const where = (async () => {
      await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));
      return db.survey.findMany.mock.calls[0][0].where;
    })();

    expect((await where).OR).toHaveLength(2);
  });

  test("the query asks for the team name and tags explicitly", async () => {
    await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));

    const select = db.survey.findMany.mock.calls[0][0].select;
    expect(select.teams.include.team.select).toEqual({ name: true, tags: true });
    // And nothing beyond what the dropdown renders.
    expect(Object.keys(select).sort()).toEqual(["id", "teams", "title", "type"]);
  });

  test("maps web-survey to the web type and whatsapp-survey to waFlow", async () => {
    await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));
    await generateAndGetOptionsFromDB(req({ params: { linkType: "whatsapp-survey" } }));

    expect(db.survey.findMany.mock.calls[0][0].where.type).toBe("web");
    expect(db.survey.findMany.mock.calls[1][0].where.type).toBe("waFlow");
  });

  test("the option reports the requested link type, not the stored one", async () => {
    db.survey.findMany.mockResolvedValueOnce([survey({ type: "web" })]);

    const options: any[] = await generateAndGetOptionsFromDB(
      req({ params: { linkType: "web-survey" } }),
    );

    expect(options[0].type).toBe("web-survey");
    expect(options[0].id).toBe("s-1");
    expect(options[0].teams).toEqual([{ team: { name: "Front of house", tags: ["vip"] } }]);
  });

  // Was silently an empty array, so a typo was indistinguishable from "this
  // organisation has no surveys". See issues.txt 45.6.
  test("an unrecognised link type is refused rather than answered empty", async () => {
    await expect(
      generateAndGetOptionsFromDB(req({ params: { linkType: "websurvey" } })),
    ).rejects.toBeInstanceOf(UnknownLinkTypeError);
    expect(db.survey.findMany).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// The public visit and click counters
// ===========================================================================

describe("updatePageVisitOrLinkClickInDB — page visits", () => {
  // The counter is unauthenticated by design — a visitor has no session — so
  // the short id is still the whole of the where clause. What changed is that
  // the caller is bounded in the controller (45.3) and that a miss is a miss
  // rather than a 500 (45.5).
  test("increments on the short id alone", async () => {
    await updatePageVisitOrLinkClickInDB(
      req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "page-visit" } }),
    );

    expect(db.linktree.updateMany).toHaveBeenCalledWith({
      where: { shortUrlId: SHORT },
      data: { visitorsCount: { increment: 1 } },
    });
  });

  // Was a bare update, so P2025 escaped and asyncErrHandler reported an
  // ordinary client condition — a page that has since been deleted — as a 500
  // from an unauthenticated endpoint. See issues.txt 45.5.
  test("an unknown short id reports a miss rather than rejecting", async () => {
    db.linktree.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updatePageVisitOrLinkClickInDB(
        req({ params: { shortUrlId: "nope" }, body: { resourceToBeUpdated: "page-visit" } }),
      ),
    ).resolves.toBeNull();
  });

  test("a counted visit reports success", async () => {
    await expect(
      updatePageVisitOrLinkClickInDB(
        req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "page-visit" } }),
      ),
    ).resolves.toEqual({ success: true, message: "Updated visitor count successfully" });
  });
});

describe("updatePageVisitOrLinkClickInDB — link clicks", () => {
  function clickReq(linkId: string, shortUrlId = SHORT) {
    return req({
      params: { shortUrlId },
      body: { resourceToBeUpdated: "link-click", linkId },
    });
  }

  test("increments the matching link's counter", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });

    await updatePageVisitOrLinkClickInDB(clickReq("l-1"));

    expect(db.linktree.updateMany.mock.calls[0][0].data.links).toEqual([
      { id: "l-1", label: "Menu", url: "https://x.test/menu", noOfClicks: 4 },
      { id: "l-2", label: "Survey", url: "https://x.test/s", noOfClicks: 0 },
    ]);
  });

  // The write is still the whole array — that is what a JSON column costs — but
  // it is now conditional on the array still being the one that was read, so a
  // click that overlaps an owner's edit no longer silently reverts it.
  // See issues.txt 45.4.
  test("the write is conditional on the array it read", async () => {
    const read = links();
    db.linktree.findFirst.mockResolvedValueOnce({ links: read });

    await updatePageVisitOrLinkClickInDB(clickReq("l-1"));

    expect(db.linktree.updateMany.mock.calls[0][0].where).toEqual({
      shortUrlId: SHORT,
      links: { equals: read },
    });
  });

  test("a click that loses the race to an owner's edit retries against the new array", async () => {
    const edited = [...links(), { id: "l-3", label: "New", url: "https://x.test/n" }];
    // First attempt: the conditional write matches nothing, because the owner's
    // PUT landed in between.
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });
    db.linktree.updateMany.mockResolvedValueOnce({ count: 0 });
    db.linktree.findFirst.mockResolvedValueOnce({ links: edited });

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toEqual({
      success: true,
      message: "Updated button click successfully.",
    });

    // The second attempt carries the owner's new link through rather than
    // writing the pre-edit array back over it.
    const written = db.linktree.updateMany.mock.calls[1][0].data.links;
    expect(written.map((l: any) => l.id)).toEqual(["l-1", "l-2", "l-3"]);
    expect(written.find((l: any) => l.id === "l-1").noOfClicks).toBe(4);
  });

  test("a click that keeps losing is dropped rather than overwriting", async () => {
    db.linktree.findFirst.mockResolvedValue({ links: links() });
    db.linktree.updateMany.mockResolvedValue({ count: 0 });

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toBeNull();
    expect(db.linktree.updateMany).toHaveBeenCalledTimes(3);
  });

  test("an unknown link id resolves to null and writes nothing", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-99"))).resolves.toBeNull();
    expect(db.linktree.updateMany).not.toHaveBeenCalled();
  });

  test("an empty or absent links array resolves to null", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: [] });
    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toBeNull();

    db.linktree.findFirst.mockResolvedValueOnce({ links: null });
    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toBeNull();
  });

  test("an unknown short id resolves to null rather than crashing", async () => {
    db.linktree.findFirst.mockResolvedValueOnce(null);

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1", "nope"))).resolves.toBeNull();
  });

  // links is a Json column, so a non-array value can be stored by a path that
  // skips the route schema, and `.find` on it threw a TypeError that
  // asyncErrHandler reported as a 500. See issues.txt 45.5.
  test("a links value that is not an array is refused rather than throwing", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: "not an array" });

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toBeNull();
    expect(db.linktree.updateMany).not.toHaveBeenCalled();
  });

  test("a link with no counter yet starts from zero", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: [{ id: "l-1", label: "Menu" }] });

    await updatePageVisitOrLinkClickInDB(clickReq("l-1"));

    expect(db.linktree.updateMany.mock.calls[0][0].data.links[0].noOfClicks).toBe(1);
  });
});

// ===========================================================================
// Controllers
// ===========================================================================

describe("controllers", () => {
  test("create answers 201 with the new linktree", async () => {
    const rep = reply();

    await createLinktree(req({ body: { name: "Our links" } }), rep);

    expect(answer(rep)).toEqual({ code: 201, body: row() });
  });

  test("a short id collision on create retries with the original request and succeeds", async () => {
    // NOTE: shortIdUniqueConstraintErrHandler's retry calls
    // `functionToBeHandled()` with none of the original ...args — previously
    // the service function itself was passed as functionToBeHandled with req
    // as a spread arg, so the retry lost the request and crashed with a
    // TypeError. The controller now wraps the service call in a closure that
    // captures req directly, so the retry succeeds instead of losing it.
    db.linktree.create.mockRejectedValueOnce(
      new FakeKnownError("P2002", { target: ["shortUrlId"] }),
    );
    const rep = reply();

    await createLinktree(req({ body: { name: "Our links" } }), rep);

    expect(db.linktree.create).toHaveBeenCalledTimes(2);
    expect(answer(rep)).toEqual({ code: 201, body: row() });
  });

  test("the listing answers 200 with the array", async () => {
    const rep = reply();

    await getLinktrees(req(), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [row()] });
  });

  // The authenticated 404 was a bare string where every other error in the
  // module is an object, and the public read reported the same condition as a
  // 200 with a null body. Both answer the same thing now. See issues.txt 45.6.
  test("the two reads answer a missing page the same way", async () => {
    db.linktree.findFirst.mockResolvedValue(null);
    const privateRep = reply();
    const publicRep = reply();

    await getLinktreeWithShortId(req({ params: { shortUrlId: SHORT } }), privateRep);
    await getPublicLinktreeWithShortId(req({ params: { shortUrlId: "nope" } }), publicRep);

    const expected = {
      code: 404,
      body: { success: false, message: "Linktree with requested shortId not found." },
    };
    expect(answer(privateRep)).toEqual(expected);
    expect(answer(publicRep)).toEqual(expected);
  });

  // An unpublished draft is deliberately indistinguishable from a page that
  // does not exist, so the endpoint does not report drafts into existence.
  // See issues.txt 45.2.
  test("the public read answers 404 for an unpublished draft", async () => {
    db.linktree.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await getPublicLinktreeWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep).code).toBe(404);
  });

  test("the public read serves a published page", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({
      name: "Live",
      shortUrlId: SHORT,
      theme: {},
      links: links(),
      isPublished: true,
    });
    const rep = reply();

    await getPublicLinktreeWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body.links).toHaveLength(2);
  });

  test("update answers 200 with the updated linktree", async () => {
    const rep = reply();

    await updateLinktreeWithShortId(req({ body: { shortUrlId: SHORT } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: row() });
  });

  test("delete answers a fixed message and never the deleted row", async () => {
    const rep = reply();

    await deleteLinktreeById(req({ params: { id: ID } }), rep);

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Deleted Linktree sucessfully." },
    });
  });

  test("the dropdown answers 200 with the options array", async () => {
    db.survey.findMany.mockResolvedValueOnce([survey({ type: "web" })]);
    const rep = reply();

    await getLinkTypeDropdownOptions(req({ params: { linkType: "web-survey" } }), rep);

    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body).toHaveLength(1);
  });

  // An unmapped :linkType used to read as "this organisation has no surveys".
  // See issues.txt 45.6.
  test("an unrecognised link type answers 400 rather than an empty list", async () => {
    const rep = reply();

    await getLinkTypeDropdownOptions(req({ params: { linkType: "websurvey" } }), rep);

    expect(answer(rep).code).toBe(400);
    expect(answer(rep).body.success).toBe(false);
  });

  test("anything else from the dropdown service still escapes to asyncErrHandler", async () => {
    db.survey.findMany.mockRejectedValueOnce(new Error("db down"));

    await expect(
      getLinkTypeDropdownOptions(req({ params: { linkType: "web-survey" } }), reply()),
    ).rejects.toThrow("db down");
  });

  test("a link click with no linkId is refused before the service runs", async () => {
    const rep = reply();

    await updatePageVisitsOrLinkClicks(
      req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "link-click" } }),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { success: false, message: "linkId field is required in the request body." },
    });
    expect(db.linktree.findFirst).not.toHaveBeenCalled();
  });

  test("a page visit does not require a linkId", async () => {
    const rep = reply();

    await updatePageVisitsOrLinkClicks(
      req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "page-visit" } }),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Updated button click successfully." },
    });
  });

  test("an unmatched linkId answers 400", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });
    const rep = reply();

    await updatePageVisitsOrLinkClicks(
      req({
        params: { shortUrlId: SHORT },
        body: { resourceToBeUpdated: "link-click", linkId: "l-99" },
      }),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { success: false, message: "Link with given linkId not found." },
    });
  });

  test("an unknown short id answers 400 rather than crashing the controller", async () => {
    // NOTE: previously the service crashed with a bare TypeError instead of
    // resolving; the controller now gets a clean null back and answers the
    // same "not found" 400 it uses for an unmatched linkId.
    db.linktree.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await updatePageVisitsOrLinkClicks(
      req({
        params: { shortUrlId: "nope" },
        body: { resourceToBeUpdated: "link-click", linkId: "l-1" },
      }),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { success: false, message: "Link with given linkId not found." },
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
      patch: vi.fn((url, opts, handler) => routes.push({ method: "PATCH", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("registers eight routes behind a single onRoute hook", async () => {
    const { srv, routes, hooks } = fakeServer();

    await linkRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("onRoute");
    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /public/:shortUrlId",
      "GET /:shortUrlId",
      "GET /",
      "POST /",
      "PUT /",
      "DELETE /:id",
      "GET /linkTypeDropdownOptions/:linkType",
      "PATCH /pageVisitsOrLinkClicks/:shortUrlId",
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

  test("the hook clears the preHandler for a route flagged public", async () => {
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const opts: any = { config: { isPublic: true } };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([]);
  });

  // Both branches used to ASSIGN, so a role check written into a route's own
  // options would have been discarded with no error and nothing in the route
  // table to show it — and a public route could not carry the rate limiter 45.3
  // needs. See issues.txt 45.7.
  test("the hook keeps a preHandler a route declared for itself", async () => {
    // NOTE: it assigns rather than appends, in both branches.
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

    for (const config of [{ isPublic: "true" }, { isPublic: 1 }, {}]) {
      const opts: any = { config };
      hooks[0].fn(opts);
      expect(opts.preHandler).toEqual([checkSession]);
    }
  });

  test("exactly two route options declare themselves public", async () => {
    for (const o of [
      getPublicLinktreeWithShortIdRouteOptions,
      updatePageVisitsOrLinkClicksOptions,
    ]) {
      expect((o as any).config).toEqual({ isPublic: true });
    }
    for (const o of [
      createLinktreeRouteOptions,
      getLinktreesRouteOptions,
      getLinktreeWithShortIdRouteOptions,
      updateLinktreeWithShortIdRouteOptions,
      deleteLinktreeByIdRouteOptions,
      getLinkTypeDropdownOptionsRouteOptions,
    ]) {
      expect((o as any).config).toBeUndefined();
    }
  });

  // STILL OPEN (issues.txt 45.7): the module has no role gating at all — any
  // member can create, edit, publish, unpublish and delete any of the
  // organisation's link pages. What is fixed is that adding a gate would now
  // take effect.
  test("no authenticated route declares a role requirement", async () => {
    const authenticated = [
      createLinktreeRouteOptions,
      getLinktreesRouteOptions,
      getLinktreeWithShortIdRouteOptions,
      updateLinktreeWithShortIdRouteOptions,
      deleteLinktreeByIdRouteOptions,
      getLinkTypeDropdownOptionsRouteOptions,
    ];

    for (const o of authenticated) {
      expect(o).not.toHaveProperty("onRequest");
      expect((o as any).preHandler).toBeUndefined();
    }
  });

  test("the public counter carries a rate limiter", async () => {
    const limiter = (updatePageVisitsOrLinkClicksOptions as any).preHandler[0];

    expect(limiter.opts).toEqual({ max: 240, windowSeconds: 3600, key: "linktreeCount" });
  });

  // All three used to declare `schema: {}` — so the delete's :id reached
  // prisma.linktree.delete unvalidated on a @db.Uuid column, and :linkType
  // reached a service that mapped only two values. See issues.txt 45.6.
  test("the three schema-less routes now declare their params", async () => {
    expect(deleteLinktreeByIdRouteOptions.schema).toHaveProperty("params");
    expect(getLinkTypeDropdownOptionsRouteOptions.schema).toHaveProperty("params");
    expect(getPublicLinktreeWithShortIdRouteOptions.schema).toHaveProperty("params");
  });

  test("the delete id must be a uuid and the link type one of the two", async () => {
    expect(byIdParams.safeParse({ id: ID }).success).toBe(true);
    expect(byIdParams.safeParse({ id: "not-a-uuid" }).success).toBe(false);
    expect(linkTypeParams.safeParse({ linkType: "web-survey" }).success).toBe(true);
    expect(linkTypeParams.safeParse({ linkType: "websurvey" }).success).toBe(false);
  });

  test("the public counter validates its body and params", async () => {
    expect(updatePageVisitsOrLinkClicksOptions.schema).toHaveProperty("body");
    expect(updatePageVisitsOrLinkClicksOptions.schema).toHaveProperty("params");
  });
});

// ===========================================================================
// Schemas
// ===========================================================================

describe("schemas", () => {
  test("create requires only a name", () => {
    expect(createLinktreeReqBody.safeParse({}).success).toBe(false);
    expect(createLinktreeReqBody.safeParse({ name: "Our links" }).success).toBe(true);
  });

  test("create strips unknown keys rather than rejecting them", () => {
    expect(
      createLinktreeReqBody.parse({ name: "T", ownerOrgId: OTHER_ORG, visitorsCount: 9999 }),
    ).toEqual({ name: "T" });
  });

  test("update requires the short id and leaves everything else optional", () => {
    expect(updateLinktreeReqBody.safeParse({}).success).toBe(false);
    expect(updateLinktreeReqBody.safeParse({ shortUrlId: SHORT }).success).toBe(true);
  });

  test("update cannot reach the visitor count or the owning org", () => {
    expect(
      updateLinktreeReqBody.parse({
        shortUrlId: SHORT,
        visitorsCount: 9999,
        ownerOrgId: OTHER_ORG,
      }),
    ).toEqual({ shortUrlId: SHORT });
  });

  // `links` is now shaped (an array of link objects); theme and shareSettings remain
  // unvalidated JSON blobs.
  test("links must be an array while theme and shareSettings stay unvalidated JSON", () => {
    expect(
      updateLinktreeReqBody.safeParse({ shortUrlId: SHORT, links: "not an array" }).success,
    ).toBe(false);

    const parsed = updateLinktreeReqBody.parse({
      shortUrlId: SHORT,
      theme: "not an object",
      shareSettings: 42,
    });

    expect(parsed.theme).toBe("not an object");
  });

  test("nothing constrains a link's shape or its url", () => {
    const parsed = updateLinktreeReqBody.parse({
      shortUrlId: SHORT,
      links: [{ id: "l-1", url: "javascript:alert(1)", noOfClicks: 99999 }],
    });

    expect(parsed.links?.[0].url).toBe("javascript:alert(1)");
    expect(parsed.links?.[0].noOfClicks).toBe(99999);
  });

  test("the counter body is bounded to the two resources", () => {
    expect(
      updatePageVisitsOrLinkClicksReqBody.safeParse({ resourceToBeUpdated: "page-visit" }).success,
    ).toBe(true);
    expect(
      updatePageVisitsOrLinkClicksReqBody.safeParse({ resourceToBeUpdated: "link-click" }).success,
    ).toBe(true);
    expect(
      updatePageVisitsOrLinkClicksReqBody.safeParse({ resourceToBeUpdated: "delete" }).success,
    ).toBe(false);
  });

  test("linkId stays optional even for a link click", () => {
    // The controller, not the schema, is what refuses that combination.
    expect(
      updatePageVisitsOrLinkClicksReqBody.safeParse({ resourceToBeUpdated: "link-click" }).success,
    ).toBe(true);
  });

  test("the response schema omits the owning org, the author and additionalData", () => {
    expect(Object.keys((linktreeBaseSchema as any).shape).sort()).toEqual([
      "createdAt",
      "id",
      "isPublished",
      "links",
      "name",
      "shareSettings",
      "shortUrlId",
      "theme",
      "visitorsCount",
    ]);
  });
});
