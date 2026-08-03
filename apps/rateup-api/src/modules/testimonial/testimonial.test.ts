import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { testimonial: { createMany: vi.fn(), findMany: vi.fn() } },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { checkSession } from "../../utils/checkSession.js";
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
  // NOTE: the filter walks surveyResponse → surveyTeamMap → surveyId and stops
  // there. getAllTestimonialByOrgId, forty lines below, walks one relation
  // further to team.orgId — so the scoped join exists and is not used here.
  test("filters on the survey id with no org condition", async () => {
    await getAllTestimonialBySurveyId(VICTIM_SURVEY);

    expect(db.testimonial.findMany.mock.calls[0][0].where).toEqual({
      surveyResponse: { surveyTeamMap: { surveyId: VICTIM_SURVEY } },
    });
  });

  test("the handler takes the survey id from the path and reads no session", async () => {
    const req: any = {
      params: { surveyId: VICTIM_SURVEY },
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(getAllTestimonialBySurveyIdHandler(req, reply())).resolves.toBeUndefined();
    expect(
      db.testimonial.findMany.mock.calls[0][0].where.surveyResponse.surveyTeamMap.surveyId,
    ).toBe(VICTIM_SURVEY);
  });

  // NOTE: no select on the model, so every scalar comes back — including the
  // testimonial id, which is the value issues.txt 31.1 needs to republish
  // another org's testimonials at a public URL.
  test("returns the testimonial id and content unprojected", async () => {
    db.testimonial.findMany.mockResolvedValueOnce([
      {
        id: "t-1",
        responseId: RESPONSE,
        testimonial: { name: "Ann", testimonial: "private praise" },
        surveyResponse: {
          surveyTeamMap: { id: "stm-1", surveyId: VICTIM_SURVEY, teamId: "team-1" },
        },
      },
    ]);
    const rep = reply();

    await getAllTestimonialBySurveyIdHandler({ params: { surveyId: VICTIM_SURVEY } } as never, rep);

    expect(answer(rep).body[0].id).toBe("t-1");
    expect(answer(rep).body[0].testimonial.testimonial).toBe("private praise");
    expect(db.testimonial.findMany.mock.calls[0][0].select).toBeUndefined();
  });

  // NOTE: the include pulls the entire SurveyTeamMap row rather than naming
  // fields, so internal ids travel with every testimonial.
  test("includes the whole survey-team mapping row", async () => {
    await getAllTestimonialBySurveyId(VICTIM_SURVEY);

    expect(db.testimonial.findMany.mock.calls[0][0].include).toEqual({
      surveyResponse: { select: { surveyTeamMap: true } },
    });
  });

  test("the params schema accepts any string as a survey id", () => {
    expect(bySurveyIdParamsSchema.safeParse({ surveyId: "not-a-uuid" }).success).toBe(true);
  });

  test("an unknown survey id is an empty list, not an error", async () => {
    const rep = reply();

    await getAllTestimonialBySurveyIdHandler({ params: { surveyId: VICTIM_SURVEY } } as never, rep);

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

  // NOTE: the destructure reaches surveyResponse.surveyTeamMap unguarded, so a
  // testimonial whose response lost its mapping throws rather than being
  // skipped.
  test("throws on a row with no survey mapping", async () => {
    db.testimonial.findMany.mockResolvedValueOnce([
      { id: "t-1", createdAt: new Date(), testimonial: {}, surveyResponse: null },
    ]);

    await expect(getAllTestimonialByOrgId(ORG)).rejects.toThrow(TypeError);
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

  // NOTE: the answer is read as response[type]. Nothing validates that key
  // exists, so a payload shaped differently writes a row whose every field is
  // undefined rather than being rejected.
  test("writes a hollow row when the answer is shaped differently", async () => {
    await createTestimonial(
      { responses: [{ questionId: "q-1", type: QuestionType.Testimonial, response: {} }] } as never,
      RESPONSE,
    );

    expect(db.testimonial.createMany.mock.calls[0][0].data[0].testimonial).toEqual({
      questionId: "q-1",
      name: undefined,
      jobTitle: undefined,
      testimonial: undefined,
      rating: undefined,
      photo: undefined,
    });
  });

  // NOTE: createTestimonialSchama describes exactly this payload and has no
  // importer anywhere in src — nothing validates what is written.
  test("the schema that describes the row is never applied", async () => {
    const parsed = createTestimonialSchama.safeParse({
      responseId: RESPONSE,
      testimonial: { questionId: "q-1", testimonial: "x" },
    });
    expect(parsed.success).toBe(true);

    // The service accepts a payload the schema would reject.
    await createTestimonial(
      { responses: [{ questionId: "q-1", type: QuestionType.Testimonial, response: {} }] } as never,
      RESPONSE,
    );

    expect(db.testimonial.createMany).toHaveBeenCalledOnce();
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

  // NOTE: createMany without skipDuplicates, against a model whose unique key
  // is (testimonial, responseId) — a Json column. Two identical answers in one
  // submission collide.
  test("does not skip duplicates", async () => {
    await createTestimonial({ responses: [testimonialAnswer()] } as never, RESPONSE);

    expect(db.testimonial.createMany.mock.calls[0][0].skipDuplicates).toBeUndefined();
  });

  // NOTE: the only call site is inside a Promise.all in the response handler
  // (response.controller.ts:259-277), after the response row is committed — so
  // a rejection here fails the whole submission with a 500.
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
  // NOTE: both reads answer 201 Created.
  test("both GETs answer 201", async () => {
    const a = reply();
    const b = reply();

    await getAllTestimonialBySurveyIdHandler({ params: { surveyId: VICTIM_SURVEY } } as never, a);
    await getAllTestimonialByOrgHandler({ user: { orgId: ORG } } as never, b);

    expect(answer(a).code).toBe(201);
    expect(answer(b).code).toBe(201);
  });

  // NOTE: "Failed" + error concatenates the caught value onto a string with no
  // separator, and sends it to the caller.
  test("both leak the raw error, unspaced, on failure", async () => {
    db.testimonial.findMany.mockRejectedValue(
      new Error("Invalid `prisma.testimonial.findMany()` invocation"),
    );
    const a = reply();
    const b = reply();

    await getAllTestimonialBySurveyIdHandler({ params: { surveyId: VICTIM_SURVEY } } as never, a);
    await getAllTestimonialByOrgHandler({ user: { orgId: ORG } } as never, b);

    expect(answer(a)).toEqual({
      code: 500,
      body: { message: "FailedError: Invalid `prisma.testimonial.findMany()` invocation" },
    });
    expect(answer(b).body.message).toContain("prisma.testimonial.findMany()");
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

  test("guards the tree with checkSession and nothing else", async () => {
    const { srv, hooks, routes } = fakeServer();

    await testimonialRoutes(srv);

    expect(hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
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
