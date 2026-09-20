import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { testimonial: { createMany: vi.fn(), findMany: vi.fn() } },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { QuestionType } from "../../types/enums.js";
import {
  createTestimonial,
  getAllTestimonialByOrgId,
  getAllTestimonialBySurveyId,
} from "./testimonial.service.js";
import {
  getAllTestimonialByOrgHandler,
  getAllTestimonialBySurveyIdHandler,
} from "./testimonial.controller.js";
import { testimonialRoutes } from "./testimonials.route.js";
import { bySurveyIdParamsSchema, createTestimonialSchama } from "./testimonial.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { testimonial: Record<string, Mock> };

const ORG = "11111111-1111-1111-1111-111111111111";
const VICTIM_SURVEY = "22222222-2222-2222-2222-222222222222";
const RESPONSE = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";

const testimonialAnswer = (over: Record<string, unknown> = {}) => ({
  questionId: "q-1",
  type: QuestionType.Testimonial,
  response: {
    [QuestionType.Testimonial]: {
      name: "Ann Smith",
      jobTitle: "Head of Ops",
      testimonial: "They were excellent",
      rating: 5,
      photo: "https://cdn.test/ann.png",
    },
  },
  ...over,
});

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.testimonial.createMany.mockResolvedValue({ count: 1 });
  db.testimonial.findMany.mockResolvedValue([]);
});

// ===========================================================================
// The by-survey read — where testimonial ids come from
// ===========================================================================

describe("getAllTestimonialBySurveyId", () => {
  test("joins through the team to the caller's org", async () => {
    await getAllTestimonialBySurveyId(VICTIM_SURVEY, ORG);

    expect(db.testimonial.findMany.mock.calls[0][0].where).toEqual({
      surveyResponse: { surveyTeamMap: { surveyId: VICTIM_SURVEY, team: { orgId: ORG } } },
    });
  });

  test("the handler takes the org from the session", async () => {
    await getAllTestimonialBySurveyIdHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(
      db.testimonial.findMany.mock.calls[0][0].where.surveyResponse.surveyTeamMap.team.orgId,
    ).toBe(ORG);
  });

  test("projects the fields the caller needs rather than the whole row", async () => {
    db.testimonial.findMany.mockResolvedValueOnce([
      { id: "t-1", createdAt: new Date(2026, 0, 1), testimonial: { name: "Ann" } },
    ]);
    const rep = reply();

    await getAllTestimonialBySurveyIdHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(db.testimonial.findMany.mock.calls[0][0].select).toEqual({
      id: true,
      createdAt: true,
      testimonial: true,
    });
    expect(answer(rep).body[0].testimonial.name).toBe("Ann");
  });

  // The include used to pull the entire SurveyTeamMap row, so the internal
  // surveyId, teamId and shortUrlId travelled with every testimonial.
  test("no longer includes the survey-team mapping row", async () => {
    await getAllTestimonialBySurveyId(VICTIM_SURVEY, ORG);

    expect(db.testimonial.findMany.mock.calls[0][0].include).toBeUndefined();
  });

  test("the params schema accepts any string as a survey id", () => {
    expect(bySurveyIdParamsSchema.safeParse({ surveyId: "not-a-uuid" }).success).toBe(true);
  });

  test("an unknown survey id is an empty list, not an error", async () => {
    const rep = reply();

    await getAllTestimonialBySurveyIdHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep).body).toEqual([]);
  });
});

// ===========================================================================
// The by-org read — the counter-example
// ===========================================================================

describe("getAllTestimonialByOrgId", () => {
  test("joins through the team to the caller's org", async () => {
    await getAllTestimonialByOrgId(ORG);

    expect(db.testimonial.findMany.mock.calls[0][0].where).toEqual({
      surveyResponse: { surveyTeamMap: { team: { orgId: ORG } } },
    });
  });

  test("the handler takes the org from the session, not the request", async () => {
    await getAllTestimonialByOrgHandler({ user: { orgId: ORG } } as never, reply());

    expect(
      db.testimonial.findMany.mock.calls[0][0].where.surveyResponse.surveyTeamMap.team.orgId,
    ).toBe(ORG);
  });

  // NOTE: this read names the fields it wants and reshapes the result, in
  // contrast with the by-survey read beside it.
  test("selects named fields rather than the whole row", async () => {
    await getAllTestimonialByOrgId(ORG);

    expect(db.testimonial.findMany.mock.calls[0][0].select).toEqual({
      id: true,
      createdAt: true,
      testimonial: true,
      surveyResponse: {
        select: { surveyTeamMap: { select: { survey: true, team: true } } },
      },
    });
  });

  test("flattens each row to id, content, team and survey", async () => {
    db.testimonial.findMany.mockResolvedValueOnce([
      {
        id: "t-1",
        createdAt: new Date(2026, 0, 1),
        testimonial: { name: "Ann" },
        surveyResponse: {
          surveyTeamMap: {
            survey: { id: "s-1", title: "NPS", description: "internal" },
            team: { id: "team-1", orgId: ORG, code: "OPS" },
          },
        },
      },
    ]);

    const rows = await getAllTestimonialByOrgId(ORG);

    expect(rows[0]).toEqual({
      id: "t-1",
      createdAt: new Date(2026, 0, 1),
      testimonial: { name: "Ann" },
      teamId: "team-1",
      survey: { id: "s-1", name: "NPS" },
    });
  });

  test("skips a row with no survey mapping rather than throwing", async () => {
    db.testimonial.findMany.mockResolvedValueOnce([
      { id: "t-1", createdAt: new Date(), testimonial: {}, surveyResponse: null },
      {
        id: "t-2",
        createdAt: new Date(2026, 0, 1),
        testimonial: { name: "Ann" },
        surveyResponse: {
          surveyTeamMap: { survey: { id: "s-1", title: "NPS" }, team: { id: "team-1" } },
        },
      },
    ]);

    const rows = await getAllTestimonialByOrgId(ORG);

    expect(rows.map((r) => r.id)).toEqual(["t-2"]);
  });
});

// ===========================================================================
// createTestimonial
// ===========================================================================

describe("createTestimonial", () => {
  test("does nothing when the response has no testimonial answer", async () => {
    await createTestimonial(
      { responses: [{ questionId: "q-1", type: QuestionType.CustomNPS, response: {} }] } as never,
      RESPONSE,
    );

    expect(db.testimonial.createMany).not.toHaveBeenCalled();
  });

  test("writes one row per testimonial answer", async () => {
    await createTestimonial(
      {
        responses: [
          testimonialAnswer(),
          { questionId: "q-2", type: QuestionType.CustomNPS, response: {} },
          testimonialAnswer({ questionId: "q-3" }),
        ],
      } as never,
      RESPONSE,
    );

    expect(db.testimonial.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  test("copies the respondent's fields into the stored blob", async () => {
    await createTestimonial({ responses: [testimonialAnswer()] } as never, RESPONSE);

    expect(db.testimonial.createMany.mock.calls[0][0].data[0]).toEqual({
      responseId: RESPONSE,
      testimonial: {
        questionId: "q-1",
        name: "Ann Smith",
        jobTitle: "Head of Ops",
        testimonial: "They were excellent",
        rating: 5,
        photo: "https://cdn.test/ann.png",
      },
    });
  });

  test("skips an answer shaped differently rather than storing a hollow row", async () => {
    await createTestimonial(
      { responses: [{ questionId: "q-1", type: QuestionType.Testimonial, response: {} }] } as never,
      RESPONSE,
    );

    expect(db.testimonial.createMany).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  test("keeps the valid answers when one of several is malformed", async () => {
    await createTestimonial(
      {
        responses: [
          { questionId: "q-1", type: QuestionType.Testimonial, response: {} },
          testimonialAnswer({ questionId: "q-2" }),
        ],
      } as never,
      RESPONSE,
    );

    const data = db.testimonial.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0].testimonial.questionId).toBe("q-2");
  });

  // createTestimonialSchama describes exactly this payload and used to have no
  // importer anywhere in src — validation written for this data and never wired
  // up. It is now the filter.
  test("the schema that describes the row is the one applied", async () => {
    expect(
      createTestimonialSchama.safeParse({
        responseId: RESPONSE,
        testimonial: { questionId: "q-1", testimonial: "x" },
      }).success,
    ).toBe(true);
    expect(
      createTestimonialSchama.safeParse({
        responseId: RESPONSE,
        testimonial: { questionId: "q-1" },
      }).success,
    ).toBe(false);
  });

  test("puts no bound on the respondent-supplied text or photo", async () => {
    await createTestimonial(
      {
        responses: [
          testimonialAnswer({
            response: {
              [QuestionType.Testimonial]: {
                testimonial: "x".repeat(100_000),
                photo: "javascript:alert(1)",
              },
            },
          }),
        ],
      } as never,
      RESPONSE,
    );

    const stored = db.testimonial.createMany.mock.calls[0][0].data[0].testimonial;
    expect(stored.testimonial).toHaveLength(100_000);
    expect(stored.photo).toBe("javascript:alert(1)");
  });

  test("skips duplicates", async () => {
    await createTestimonial({ responses: [testimonialAnswer()] } as never, RESPONSE);

    expect(db.testimonial.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  });

  // The call site is one element of the response handler's post-processing
  // batch, which is now Promise.allSettled — a rejection here is logged against
  // the response id rather than abandoning the other five operations.
  test("propagates a constraint failure to its caller", async () => {
    db.testimonial.createMany.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(
      createTestimonial({ responses: [testimonialAnswer()] } as never, RESPONSE),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  test("throws on a responses array that is absent", async () => {
    await expect(createTestimonial({} as never, RESPONSE)).rejects.toThrow(TypeError);
  });
});

// ===========================================================================
// The handlers' shape
// ===========================================================================

describe("the handlers", () => {
  test("both GETs answer 200", async () => {
    const a = reply();
    const b = reply();

    await getAllTestimonialBySurveyIdHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      a,
    );
    await getAllTestimonialByOrgHandler({ user: { orgId: ORG } } as never, b);

    expect(answer(a).code).toBe(200);
    expect(answer(b).code).toBe(200);
  });

  // `"Failed" + error` concatenated the caught value onto a string with no
  // separator and sent it to the caller — the model name and the query shape,
  // from an ordinary authenticated request — and neither handler logged
  // anything, so the only record of the failure was the caller's response.
  test("both send a fixed message and log the error", async () => {
    db.testimonial.findMany.mockRejectedValue(
      new Error("Invalid `prisma.testimonial.findMany()` invocation"),
    );
    const a = reply();
    const b = reply();

    await getAllTestimonialBySurveyIdHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      a,
    );
    await getAllTestimonialByOrgHandler({ user: { orgId: ORG } } as never, b);

    expect(answer(a)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    expect(answer(b)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    expect(log.error).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("testimonialRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("declares session access for the tree and nothing else", async () => {
    const { srv, hooks, routes } = fakeServer();

    await testimonialRoutes(srv);

    expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
    const probe: any = { method: "GET", url: "/x", config: {} };
    hooks[0].fn(probe);
    expect(probe.config).toEqual({ access: "session" });
    for (const r of routes) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });

  test("registers the two reads", async () => {
    const { srv, routes } = fakeServer();

    await testimonialRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual(["GET /:surveyId", "GET /"]);
  });

  // NOTE: /:surveyId is registered before /, and the parametric route sits at
  // the root of the tree — so it matches any single path segment under
  // /api/testimonials.
  test("the parameterised route is registered first", async () => {
    const { srv, routes } = fakeServer();

    await testimonialRoutes(srv);

    expect(routes[0].url).toBe("/:surveyId");
  });

  test("neither read declares a response schema", async () => {
    const { srv, routes } = fakeServer();

    await testimonialRoutes(srv);

    for (const r of routes) {
      expect(r.opts?.schema?.response).toBeUndefined();
    }
  });
});
