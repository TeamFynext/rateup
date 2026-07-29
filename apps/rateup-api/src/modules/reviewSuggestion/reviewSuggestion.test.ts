import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    reviewSuggestion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/auth.js", () => ({ hasAccessToTeam: vi.fn() }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../team/team.auth.js", () => ({ verifyTeamAccess: vi.fn() }));
vi.mock("../survey/survey.service.js", () => ({ getGoogleUrlBySurveyTeamMapId: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { hasAccessToTeam } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { verifyTeamAccess } from "../team/team.auth.js";
import { getGoogleUrlBySurveyTeamMapId } from "../survey/survey.service.js";
import {
  createReviewSuggestions,
  deleteReviewSuggestion,
  getReviewById,
  getReviewSuggestionsCountByTeamId,
  getReviewsBySurveyTeamMapId,
  getReviewsByTeamId,
  updateReviewSuggestion,
} from "./reviewSuggestion.service.js";
import { hasAccessToReview } from "./reviewSuggestion.auth.js";
import {
  createReviewSuggestionsHandler,
  deleteReviewSuggestionHandler,
  errorHandler,
  getReviewsBySurveyTeamMapIdHandler,
  getReviewsByTeamIdHandler,
  getReviewsSuggestionCountByTeamIdHandler,
  updateReviewSuggestionHandler,
} from "./reviewSuggestion.controller.js";
import { reviewSuggestionRoutes } from "./reviewSuggestion.route.js";
import {
  byReviewSuggestionIdSchema,
  createReviewSuggestionsSchema,
  updateReviewSuggestionSchema,
} from "./reviewSuggestion.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { reviewSuggestion: Record<string, Mock> };

const USER = "11111111-1111-1111-1111-111111111111";
const OWN_TEAM = "22222222-2222-2222-2222-222222222222";
const VICTIM_TEAM = "33333333-3333-3333-3333-333333333333";
const VICTIM_REVIEW = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const MAP = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return {
    code: rep.code.mock.calls[0]?.[0] ?? rep.status.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.reviewSuggestion.findMany.mockResolvedValue([]);
  db.reviewSuggestion.findUnique.mockResolvedValue(null);
  db.reviewSuggestion.count.mockResolvedValue(0);
  db.reviewSuggestion.createMany.mockResolvedValue({ count: 2 });
  db.reviewSuggestion.update.mockResolvedValue({ id: VICTIM_REVIEW });
  db.reviewSuggestion.delete.mockResolvedValue({ id: VICTIM_REVIEW });
  (hasAccessToTeam as unknown as Mock).mockResolvedValue(true);
  (getGoogleUrlBySurveyTeamMapId as unknown as Mock).mockResolvedValue("https://g.page/r/xyz");
});

// ===========================================================================
// Route registration — where the guards are, and are not
// ===========================================================================

function fakeServer() {
  const routes: any[] = [];
  const srv: any = {
    setErrorHandler: vi.fn(),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  return { srv, routes };
}

describe("reviewSuggestionRoutes", () => {
  test("registers six routes", async () => {
    const { srv, routes } = fakeServer();

    await reviewSuggestionRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /:teamId",
      "GET /public/:surveyTeamMapId",
      "GET /:teamId/count",
      "POST /:teamId",
      "PUT /:reviewSuggestionId",
      "DELETE /:reviewSuggestionId",
    ]);
  });

  test("the three team routes carry both the session and the team check", async () => {
    const { srv, routes } = fakeServer();

    await reviewSuggestionRoutes(srv);

    for (const url of ["/:teamId", "/:teamId/count"]) {
      const r = routes.find((x) => x.url === url && x.method === "GET");
      expect(r.opts.preHandler).toEqual([checkSession, verifyTeamAccess]);
    }
    const post = routes.find((r) => r.method === "POST");
    expect(post.opts.preHandler).toEqual([checkSession, verifyTeamAccess]);
  });

  test("the update route carries the session check and does its own", async () => {
    const { srv, routes } = fakeServer();

    await reviewSuggestionRoutes(srv);

    const put = routes.find((r) => r.method === "PUT");
    expect(put.opts.preHandler).toEqual([checkSession]);
  });

  // NOTE: every other write in the file carries at least checkSession. The
  // delete carries no preHandler key at all.
  test("the delete route carries no preHandler of any kind", async () => {
    const { srv, routes } = fakeServer();

    await reviewSuggestionRoutes(srv);

    const del = routes.find((r) => r.method === "DELETE");
    expect(del.opts.preHandler).toBeUndefined();
    expect(Object.keys(del.opts)).toEqual(["schema"]);
  });

  test("the public read is unguarded, as its path says", async () => {
    const { srv, routes } = fakeServer();

    await reviewSuggestionRoutes(srv);

    const pub = routes.find((r) => r.url === "/public/:surveyTeamMapId");
    expect(pub.opts.preHandler).toBeUndefined();
  });

  // NOTE: the create route validates its body; the update route does not, even
  // though updateReviewSuggestionSchema exists for exactly that.
  test("only the create route declares a body schema", async () => {
    const { srv, routes } = fakeServer();

    await reviewSuggestionRoutes(srv);

    const post = routes.find((r) => r.method === "POST");
    const put = routes.find((r) => r.method === "PUT");
    expect(post.opts.schema.body).toBe(createReviewSuggestionsSchema);
    expect(put.opts.schema.body).toBeUndefined();
  });

  test("installs the module's own error handler", async () => {
    const { srv } = fakeServer();

    await reviewSuggestionRoutes(srv);

    expect(srv.setErrorHandler).toHaveBeenCalledWith(errorHandler);
  });

  test("the error handler answers a fixed 500 and logs", () => {
    const rep = reply();

    errorHandler(new Error("boom"), {} as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    expect(log.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// deleteReviewSuggestion
// ===========================================================================

describe("deleteReviewSuggestion", () => {
  test("deletes by id alone", async () => {
    await deleteReviewSuggestion(VICTIM_REVIEW);

    expect(db.reviewSuggestion.delete).toHaveBeenCalledWith({ where: { id: VICTIM_REVIEW } });
  });

  // NOTE: the handler resolves nothing about the caller — there is no session
  // to read, because the route never establishes one.
  test("the handler reads neither a user nor a team", async () => {
    const request: any = {
      params: { reviewSuggestionId: VICTIM_REVIEW },
      get user() {
        throw new Error("request.user was read");
      },
      get userId() {
        throw new Error("request.userId was read");
      },
    };

    await expect(deleteReviewSuggestionHandler(request, reply())).resolves.toBeUndefined();
    expect(db.reviewSuggestion.delete).toHaveBeenCalledOnce();
  });

  test("nothing looks the review up before deleting it", async () => {
    await deleteReviewSuggestionHandler(
      { params: { reviewSuggestionId: VICTIM_REVIEW } } as never,
      reply(),
    );

    expect(db.reviewSuggestion.findUnique).not.toHaveBeenCalled();
    expect(hasAccessToTeam).not.toHaveBeenCalled();
  });

  test("sends the deleted row back to the caller", async () => {
    db.reviewSuggestion.delete.mockResolvedValueOnce({
      id: VICTIM_REVIEW,
      teamId: VICTIM_TEAM,
      review: "Great service",
      language: "English",
    });
    const rep = reply();

    await deleteReviewSuggestionHandler(
      { params: { reviewSuggestionId: VICTIM_REVIEW } } as never,
      rep,
    );

    expect(rep.send.mock.calls[0][0].teamId).toBe(VICTIM_TEAM);
  });

  // NOTE: a missing row raises P2025, which the module error handler turns into
  // a 500 — so a probe cannot be told apart from a server failure.
  test("a missing row escapes to the error handler", async () => {
    db.reviewSuggestion.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );

    await expect(
      deleteReviewSuggestionHandler(
        { params: { reviewSuggestionId: VICTIM_REVIEW } } as never,
        reply(),
      ),
    ).rejects.toMatchObject({ code: "P2025" });
  });

  test("the id must at least be a uuid", () => {
    expect(byReviewSuggestionIdSchema.safeParse({ reviewSuggestionId: "nope" }).success).toBe(
      false,
    );
    expect(
      byReviewSuggestionIdSchema.safeParse({ reviewSuggestionId: VICTIM_REVIEW }).success,
    ).toBe(true);
  });
});

// ===========================================================================
// updateReviewSuggestion
// ===========================================================================

describe("updateReviewSuggestion", () => {
  test("selects the row by id alone and writes the body", async () => {
    await updateReviewSuggestion(VICTIM_REVIEW, { review: "x", language: "English" });

    expect(db.reviewSuggestion.update).toHaveBeenCalledWith({
      where: { id: VICTIM_REVIEW },
      data: { review: "x", language: "English" },
    });
  });

  // NOTE: the route declares no body schema, so `data` is whatever was posted,
  // and it is handed to Prisma unchanged. ReviewSuggestion carries a teamId
  // (prisma/schema.prisma:1205).
  test("forwards a teamId in the body into the update", async () => {
    await updateReviewSuggestion(VICTIM_REVIEW, {
      review: "x",
      language: "English",
      teamId: OWN_TEAM,
    } as never);

    expect(db.reviewSuggestion.update.mock.calls[0][0].data.teamId).toBe(OWN_TEAM);
  });

  test("the handler passes the request body straight through", async () => {
    db.reviewSuggestion.findUnique.mockResolvedValueOnce({
      id: VICTIM_REVIEW,
      teamId: VICTIM_TEAM,
    });

    await updateReviewSuggestionHandler(
      {
        params: { reviewSuggestionId: VICTIM_REVIEW },
        body: { review: "x", teamId: OWN_TEAM },
        userId: USER,
      } as never,
      reply(),
    );

    expect(db.reviewSuggestion.update.mock.calls[0][0].data).toEqual({
      review: "x",
      teamId: OWN_TEAM,
    });
  });

  // NOTE: the schema that describes this body exists and is not attached to the
  // route.
  test("the unused update schema would have bounded the body", () => {
    expect(
      updateReviewSuggestionSchema.safeParse({ review: "x", language: "English", teamId: OWN_TEAM })
        .success,
    ).toBe(true);
    const parsed = updateReviewSuggestionSchema.safeParse({
      review: "x",
      language: "English",
      teamId: OWN_TEAM,
    });
    expect((parsed as any).data).not.toHaveProperty("teamId");
  });

  test("the access check resolves the review's team", async () => {
    db.reviewSuggestion.findUnique.mockResolvedValueOnce({
      id: VICTIM_REVIEW,
      teamId: VICTIM_TEAM,
    });

    await hasAccessToReview(USER, VICTIM_REVIEW);

    expect(hasAccessToTeam).toHaveBeenCalledWith(VICTIM_TEAM, USER);
  });

  test("a caller outside the team is refused before the write", async () => {
    db.reviewSuggestion.findUnique.mockResolvedValueOnce({
      id: VICTIM_REVIEW,
      teamId: VICTIM_TEAM,
    });
    (hasAccessToTeam as unknown as Mock).mockResolvedValueOnce(false);
    const rep = reply();

    await updateReviewSuggestionHandler(
      { params: { reviewSuggestionId: VICTIM_REVIEW }, body: {}, userId: USER } as never,
      rep,
    );

    expect(db.reviewSuggestion.update).not.toHaveBeenCalled();
  });

  // NOTE: the refusal sets a status code and never calls send, and the handler
  // returns undefined — so nothing completes the reply.
  test("the refusal sets a status but sends no body", async () => {
    db.reviewSuggestion.findUnique.mockResolvedValueOnce({
      id: VICTIM_REVIEW,
      teamId: VICTIM_TEAM,
    });
    (hasAccessToTeam as unknown as Mock).mockResolvedValueOnce(false);
    const rep = reply();

    const returned = await updateReviewSuggestionHandler(
      { params: { reviewSuggestionId: VICTIM_REVIEW }, body: {}, userId: USER } as never,
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send).not.toHaveBeenCalled();
    expect(returned).toBeUndefined();
  });

  test("the success path does send", async () => {
    db.reviewSuggestion.findUnique.mockResolvedValueOnce({
      id: VICTIM_REVIEW,
      teamId: OWN_TEAM,
    });
    const rep = reply();

    await updateReviewSuggestionHandler(
      {
        params: { reviewSuggestionId: VICTIM_REVIEW },
        body: { review: "x", language: "English" },
        userId: USER,
      } as never,
      rep,
    );

    expect(rep.send).toHaveBeenCalledOnce();
  });

  // NOTE: hasAccessToReview throws rather than returning false for an id that
  // resolves to nothing, and the handler does not catch it.
  test("an unknown review throws instead of answering 404", async () => {
    await expect(hasAccessToReview(USER, VICTIM_REVIEW)).rejects.toThrow("Review not found");

    await expect(
      updateReviewSuggestionHandler(
        { params: { reviewSuggestionId: VICTIM_REVIEW }, body: {}, userId: USER } as never,
        reply(),
      ),
    ).rejects.toThrow("Review not found");
  });
});

// ===========================================================================
// The reads
// ===========================================================================

describe("the reads", () => {
  test("the team listing filters on the team id", async () => {
    await getReviewsByTeamId(OWN_TEAM);

    expect(db.reviewSuggestion.findMany).toHaveBeenCalledWith({ where: { teamId: OWN_TEAM } });
  });

  // NOTE: no select, so the whole row goes back — the public read beside it
  // projects to review and id.
  test("the team listing returns whole rows while the public one projects", async () => {
    await getReviewsByTeamId(OWN_TEAM);
    await getReviewsBySurveyTeamMapId(MAP);

    expect(db.reviewSuggestion.findMany.mock.calls[0][0].select).toBeUndefined();
    expect(db.reviewSuggestion.findMany.mock.calls[1][0].select).toEqual({
      review: true,
      id: true,
    });
  });

  test("the count filters on the team id", async () => {
    await getReviewSuggestionsCountByTeamId(OWN_TEAM);

    expect(db.reviewSuggestion.count).toHaveBeenCalledWith({ where: { teamId: OWN_TEAM } });
  });

  test("the team handlers take the team from the path", async () => {
    await getReviewsByTeamIdHandler({ params: { teamId: OWN_TEAM } } as never, reply());
    await getReviewsSuggestionCountByTeamIdHandler(
      { params: { teamId: OWN_TEAM } } as never,
      reply(),
    );

    expect(db.reviewSuggestion.findMany.mock.calls[0][0].where.teamId).toBe(OWN_TEAM);
    expect(db.reviewSuggestion.count.mock.calls[0][0].where.teamId).toBe(OWN_TEAM);
  });

  test("the public read resolves suggestions through the survey mapping", async () => {
    await getReviewsBySurveyTeamMapId(MAP, "English");

    expect(db.reviewSuggestion.findMany.mock.calls[0][0].where).toEqual({
      team: { surveys: { some: { id: MAP } } },
      language: "English",
    });
  });

  // NOTE: language is an unvalidated query string, and Prisma drops an
  // undefined filter — so omitting it returns every language.
  test("omitting the language drops the filter entirely", async () => {
    await getReviewsBySurveyTeamMapId(MAP);

    expect(db.reviewSuggestion.findMany.mock.calls[0][0].where.language).toBeUndefined();
  });

  test("the public handler also returns the Google review link", async () => {
    const rep = reply();

    await getReviewsBySurveyTeamMapIdHandler(
      { params: { surveyTeamMapId: MAP }, query: {} } as never,
      rep,
    );

    expect(rep.send.mock.calls[0][0]).toEqual({ reviews: [], reviewLink: "https://g.page/r/xyz" });
  });

  test("the public handler logs the identifiers it was given", async () => {
    await getReviewsBySurveyTeamMapIdHandler(
      { params: { surveyTeamMapId: MAP }, query: { language: "English" } } as never,
      reply(),
    );

    expect((log.trace as unknown as Mock).mock.calls[0][0]).toContain(MAP);
  });
});

// ===========================================================================
// createReviewSuggestions
// ===========================================================================

describe("createReviewSuggestions", () => {
  test("writes one row per review against the path's team", async () => {
    await createReviewSuggestions({ reviews: ["a", "b"], language: "English" }, OWN_TEAM);

    expect(db.reviewSuggestion.createMany).toHaveBeenCalledWith({
      data: [
        { review: "a", language: "English", teamId: OWN_TEAM },
        { review: "b", language: "English", teamId: OWN_TEAM },
      ],
    });
  });

  test("the handler takes the team from the path, not the body", async () => {
    await createReviewSuggestionsHandler(
      {
        params: { teamId: OWN_TEAM },
        body: { reviews: ["a"], language: "English", teamId: VICTIM_TEAM },
      } as never,
      reply(),
    );

    expect(db.reviewSuggestion.createMany.mock.calls[0][0].data[0].teamId).toBe(OWN_TEAM);
  });

  test("the create schema bounds each review and requires at least one", () => {
    expect(createReviewSuggestionsSchema.safeParse({ reviews: [], language: "en" }).success).toBe(
      false,
    );
    expect(
      createReviewSuggestionsSchema.safeParse({ reviews: ["x".repeat(1001)], language: "en" })
        .success,
    ).toBe(false);
    expect(
      createReviewSuggestionsSchema.safeParse({ reviews: ["ok"], language: "en" }).success,
    ).toBe(true);
  });

  // NOTE: no upper bound on how many reviews one request may create.
  test("the create schema puts no ceiling on the number of reviews", () => {
    expect(
      createReviewSuggestionsSchema.safeParse({
        reviews: Array.from({ length: 5000 }, () => "x"),
        language: "en",
      }).success,
    ).toBe(true);
  });

  test("language is any string of two or more characters", () => {
    expect(createReviewSuggestionsSchema.safeParse({ reviews: ["x"], language: "e" }).success).toBe(
      false,
    );
    expect(
      createReviewSuggestionsSchema.safeParse({ reviews: ["x"], language: "not-a-language" })
        .success,
    ).toBe(true);
  });
});

describe("getReviewById", () => {
  test("reads by id with no team or org condition", async () => {
    await getReviewById(VICTIM_REVIEW);

    expect(db.reviewSuggestion.findUnique).toHaveBeenCalledWith({
      where: { id: VICTIM_REVIEW },
    });
  });
});
