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
      delete: vi.fn(),
    },
    org: { findFirst: vi.fn() },
  },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { checkSession } from "../../utils/checkSession.js";
import {
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
  createLinktreeReqBody,
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
    additionalData: null,
    visitorsCount: 12,
    shareSettings: null,
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
  db.linktree.delete.mockResolvedValue(row());
  db.org.findFirst.mockResolvedValue({ id: ORG, members: [] });
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
  test("looks the record up on the short id alone", async () => {
    await getPublicLinktreeWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.linktree.findFirst.mock.calls[0][0].where).toEqual({ shortUrlId: SHORT });
  });

  test("nothing in the query restricts it to published linktrees", async () => {
    await getPublicLinktreeWithShortIdFromDB(req({ params: { shortUrlId: SHORT } }));

    expect(db.linktree.findFirst.mock.calls[0][0].where).not.toHaveProperty("isPublished");
  });

  test("an unpublished draft is returned in full", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({
      name: "Unreleased campaign",
      shortUrlId: SHORT,
      theme: { colour: "blue" },
      links: links(),
      isPublished: false,
    });

    const result: any = await getPublicLinktreeWithShortIdFromDB(
      req({ params: { shortUrlId: SHORT } }),
    );

    expect(result.isPublished).toBe(false);
    expect(result.name).toBe("Unreleased campaign");
    expect(result.links).toHaveLength(2);
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

function orgWithMembers(members: any[]) {
  return { id: ORG, members };
}

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
  test("resolves the org from the session", async () => {
    await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));

    expect(db.org.findFirst.mock.calls[0][0].where).toEqual({ id: ORG });
  });

  test("the surveys it pulls in are not filtered by anything", async () => {
    // NOTE: this is the whole of 45.1. Survey has no orgId — it hangs off
    // createdBy, a User — and the include walks Org -> members -> user ->
    // surveys with no `where` at any level.
    await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));

    const include = db.org.findFirst.mock.calls[0][0].include;
    expect(include.members).not.toHaveProperty("where");
    expect(include.members.include.user).not.toHaveProperty("where");
    expect(include.members.include.user.include.surveys).not.toHaveProperty("where");
  });

  test("a member's surveys from another organisation are returned too", async () => {
    db.org.findFirst.mockResolvedValueOnce(
      orgWithMembers([
        { user: { surveys: [survey({ id: "s-mine", title: "Lunch feedback" })] } },
        {
          user: {
            surveys: [
              survey({
                id: "s-elsewhere",
                title: "Rival Ltd — exit interview",
                teams: [{ team: { name: "Rival HR", tags: ["confidential"] } }],
              }),
            ],
          },
        },
      ]),
    );

    const options: any[] = await generateAndGetOptionsFromDB(
      req({ params: { linkType: "web-survey" } }),
    );

    expect(options.map((o) => o.id)).toEqual(["s-mine", "s-elsewhere"]);
    expect(options[1].title).toBe("Rival Ltd — exit interview");
  });

  test("the leaked rows carry the other org's team names and tags", async () => {
    db.org.findFirst.mockResolvedValueOnce(
      orgWithMembers([
        {
          user: {
            surveys: [
              survey({
                id: "s-elsewhere",
                teams: [{ team: { name: "Rival HR", tags: ["confidential", "exec"] } }],
              }),
            ],
          },
        },
      ]),
    );

    const options: any[] = await generateAndGetOptionsFromDB(
      req({ params: { linkType: "web-survey" } }),
    );

    expect(options[0].teams).toEqual([
      { team: { name: "Rival HR", tags: ["confidential", "exec"] } },
    ]);
  });

  test("the query asks for the team name and tags explicitly", async () => {
    await generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } }));

    const include = db.org.findFirst.mock.calls[0][0].include;
    expect(include.members.include.user.include.surveys.include.teams.include.team.select).toEqual({
      name: true,
      tags: true,
    });
  });

  test("maps web-survey to the web type and whatsapp-survey to waFlow", async () => {
    db.org.findFirst.mockResolvedValue(
      orgWithMembers([
        {
          user: {
            surveys: [survey({ id: "s-web", type: "web" }), survey({ id: "s-wa", type: "waFlow" })],
          },
        },
      ]),
    );

    const web: any[] = await generateAndGetOptionsFromDB(
      req({ params: { linkType: "web-survey" } }),
    );
    const wa: any[] = await generateAndGetOptionsFromDB(
      req({ params: { linkType: "whatsapp-survey" } }),
    );

    expect(web.map((o) => o.id)).toEqual(["s-web"]);
    expect(wa.map((o) => o.id)).toEqual(["s-wa"]);
  });

  test("the option reports the requested link type, not the stored one", async () => {
    db.org.findFirst.mockResolvedValueOnce(
      orgWithMembers([{ user: { surveys: [survey({ type: "web" })] } }]),
    );

    const options: any[] = await generateAndGetOptionsFromDB(
      req({ params: { linkType: "web-survey" } }),
    );

    expect(options[0].type).toBe("web-survey");
  });

  test("an unrecognised link type silently returns an empty array", async () => {
    // NOTE: linkTypeInDB stays undefined, so nothing ever matches. The route
    // declares `schema: {}`, so a typo reaches here and reads as "no surveys".
    db.org.findFirst.mockResolvedValueOnce(
      orgWithMembers([{ user: { surveys: [survey({ type: "web" })] } }]),
    );

    await expect(
      generateAndGetOptionsFromDB(req({ params: { linkType: "websurvey" } })),
    ).resolves.toEqual([]);
  });

  test("an org that resolves to nothing throws rather than answering empty", async () => {
    db.org.findFirst.mockResolvedValueOnce(null);

    await expect(
      generateAndGetOptionsFromDB(req({ params: { linkType: "web-survey" } })),
    ).rejects.toBeInstanceOf(TypeError);
  });
});

// ===========================================================================
// The public visit and click counters
// ===========================================================================

describe("updatePageVisitOrLinkClickInDB — page visits", () => {
  test("increments on the short id alone, with no org and no ownership check", async () => {
    await updatePageVisitOrLinkClickInDB(
      req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "page-visit" } }),
    );

    expect(db.linktree.update).toHaveBeenCalledWith({
      where: { shortUrlId: SHORT },
      data: { visitorsCount: { increment: 1 } },
    });
  });

  test("nothing bounds how many times the same caller may increment", async () => {
    for (let i = 0; i < 5; i++) {
      await updatePageVisitOrLinkClickInDB(
        req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "page-visit" } }),
      );
    }

    expect(db.linktree.update).toHaveBeenCalledTimes(5);
  });

  test("an unpublished linktree is counted just the same", async () => {
    await updatePageVisitOrLinkClickInDB(
      req({ params: { shortUrlId: SHORT }, body: { resourceToBeUpdated: "page-visit" } }),
    );

    expect(db.linktree.update.mock.calls[0][0].where).not.toHaveProperty("isPublished");
  });

  test("an unknown short id rejects rather than being ignored", async () => {
    db.linktree.update.mockRejectedValueOnce(new FakeKnownError("P2025"));

    await expect(
      updatePageVisitOrLinkClickInDB(
        req({ params: { shortUrlId: "nope" }, body: { resourceToBeUpdated: "page-visit" } }),
      ),
    ).rejects.toMatchObject({ code: "P2025" });
  });

  test("reports success without establishing that anything was counted", async () => {
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

    expect(db.linktree.update.mock.calls[0][0].data.links).toEqual([
      { id: "l-1", label: "Menu", url: "https://x.test/menu", noOfClicks: 4 },
      { id: "l-2", label: "Survey", url: "https://x.test/s", noOfClicks: 0 },
    ]);
  });

  test("writes the whole links array back, not just the counter", async () => {
    // NOTE: this is a read-modify-write on a Json column, and the write is the
    // array as it was read a moment earlier.
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });

    await updatePageVisitOrLinkClickInDB(clickReq("l-1"));

    expect(db.linktree.update.mock.calls[0][0]).toEqual({
      where: { shortUrlId: SHORT },
      data: { links: expect.any(Array) },
    });
    expect(db.linktree.update.mock.calls[0][0].data.links).toHaveLength(2);
  });

  test("a click overlapping an owner's edit reverts that edit", async () => {
    // The click reads the pre-edit array; the owner's PUT lands; the click
    // then writes its stale copy back over it.
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });

    await updatePageVisitOrLinkClickInDB(clickReq("l-1"));

    const written = db.linktree.update.mock.calls[0][0].data.links;
    expect(written.map((l: any) => l.id)).toEqual(["l-1", "l-2"]);
    expect(written.find((l: any) => l.id === "l-3")).toBeUndefined();
  });

  test("two concurrent clicks on the same link both write the same total", async () => {
    db.linktree.findFirst.mockResolvedValue({ links: links() });

    await Promise.all([
      updatePageVisitOrLinkClickInDB(clickReq("l-1")),
      updatePageVisitOrLinkClickInDB(clickReq("l-1")),
    ]);

    const totals = db.linktree.update.mock.calls.map(
      (c) => c[0].data.links.find((l: any) => l.id === "l-1").noOfClicks,
    );
    expect(totals).toEqual([4, 4]);
  });

  test("an unknown link id resolves to null and writes nothing", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: links() });

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-99"))).resolves.toBeNull();
    expect(db.linktree.update).not.toHaveBeenCalled();
  });

  test("an empty or absent links array resolves to null", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: [] });
    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toBeNull();

    db.linktree.findFirst.mockResolvedValueOnce({ links: null });
    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).resolves.toBeNull();
  });

  test("an unknown short id throws a TypeError from destructuring null", async () => {
    // NOTE: findFirst returns null and the service destructures { links } off
    // it immediately. This is reachable from an unauthenticated request.
    db.linktree.findFirst.mockResolvedValueOnce(null);

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1", "nope"))).rejects.toBeInstanceOf(
      TypeError,
    );
  });

  test("a links value that is a string throws rather than being rejected", async () => {
    // The route schema types links as z.any(), so a non-array can be stored.
    db.linktree.findFirst.mockResolvedValueOnce({ links: "not an array" });

    await expect(updatePageVisitOrLinkClickInDB(clickReq("l-1"))).rejects.toBeInstanceOf(TypeError);
  });

  test("a link with no counter yet starts from zero", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({ links: [{ id: "l-1", label: "Menu" }] });

    await updatePageVisitOrLinkClickInDB(clickReq("l-1"));

    expect(db.linktree.update.mock.calls[0][0].data.links[0].noOfClicks).toBe(1);
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

  test("a short id collision on create loses the request and throws", async () => {
    // NOTE: shortIdUniqueConstraintErrHandler retries as
    // `shortIdUniqueConstraintErrHandler(functionToBeHandled)` — dropping the
    // ...args it was given — so the retry calls the service with no request.
    // See issues.txt 3.x; linktree is one of its callers.
    db.linktree.create.mockRejectedValueOnce(
      new FakeKnownError("P2002", { target: ["shortUrlId"] }),
    );
    const rep = reply();

    await expect(createLinktree(req({ body: { name: "Our links" } }), rep)).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(db.linktree.create).toHaveBeenCalledTimes(1);
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("the listing answers 200 with the array", async () => {
    const rep = reply();

    await getLinktrees(req(), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [row()] });
  });

  test("the authenticated read answers 404 with a bare string", async () => {
    // NOTE: every other 404 in the module's neighbours sends an object.
    db.linktree.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await getLinktreeWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep)).toEqual({
      code: 404,
      body: "Linktree with requested shortId not found.",
    });
  });

  test("the public read answers 200 with null for an unknown short id", async () => {
    db.linktree.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await getPublicLinktreeWithShortId(req({ params: { shortUrlId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: null });
  });

  test("the public read serves an unpublished draft with a 200", async () => {
    db.linktree.findFirst.mockResolvedValueOnce({
      name: "Unreleased",
      shortUrlId: SHORT,
      theme: {},
      links: links(),
      isPublished: false,
    });
    const rep = reply();

    await getPublicLinktreeWithShortId(req({ params: { shortUrlId: SHORT } }), rep);

    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body.isPublished).toBe(false);
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
    db.org.findFirst.mockResolvedValueOnce(
      orgWithMembers([{ user: { surveys: [survey({ type: "web" })] } }]),
    );
    const rep = reply();

    await getLinkTypeDropdownOptions(req({ params: { linkType: "web-survey" } }), rep);

    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body).toHaveLength(1);
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

  test("an unknown short id escapes the controller rather than answering", async () => {
    db.linktree.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await expect(
      updatePageVisitsOrLinkClicks(
        req({
          params: { shortUrlId: "nope" },
          body: { resourceToBeUpdated: "link-click", linkId: "l-1" },
        }),
        rep,
      ),
    ).rejects.toBeInstanceOf(TypeError);
    expect(rep.send).not.toHaveBeenCalled();
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

  test("the hook replaces a preHandler a route declared for itself", async () => {
    // NOTE: it assigns rather than appends, in both branches.
    const { srv, hooks } = fakeServer();
    await linkRoutes(srv);

    const ownGuard = vi.fn();
    const opts: any = { preHandler: [ownGuard] };
    hooks[0].fn(opts);

    expect(opts.preHandler).toEqual([checkSession]);
    expect(opts.preHandler).not.toContain(ownGuard);
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

  test("no route declares a role or feature requirement", async () => {
    const all = [
      createLinktreeRouteOptions,
      getLinktreesRouteOptions,
      getLinktreeWithShortIdRouteOptions,
      updateLinktreeWithShortIdRouteOptions,
      deleteLinktreeByIdRouteOptions,
      getLinkTypeDropdownOptionsRouteOptions,
      getPublicLinktreeWithShortIdRouteOptions,
      updatePageVisitsOrLinkClicksOptions,
    ];

    for (const o of all) {
      expect(o).not.toHaveProperty("onRequest");
      expect((o as any).preHandler).toBeUndefined();
    }
  });

  test("three routes declare no schema at all", async () => {
    expect(deleteLinktreeByIdRouteOptions.schema).toEqual({});
    expect(getLinkTypeDropdownOptionsRouteOptions.schema).toEqual({});
    expect(getPublicLinktreeWithShortIdRouteOptions.schema).toEqual({});
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

  test("theme, links and shareSettings are unvalidated JSON", () => {
    const parsed = updateLinktreeReqBody.parse({
      shortUrlId: SHORT,
      theme: "not an object",
      links: "not an array",
      shareSettings: 42,
    });

    expect(parsed.links).toBe("not an array");
    expect(parsed.theme).toBe("not an object");
  });

  test("nothing constrains a link's shape or its url", () => {
    const parsed = updateLinktreeReqBody.parse({
      shortUrlId: SHORT,
      links: [{ id: "l-1", url: "javascript:alert(1)", noOfClicks: 99999 }],
    });

    expect(parsed.links[0].url).toBe("javascript:alert(1)");
    expect(parsed.links[0].noOfClicks).toBe(99999);
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
