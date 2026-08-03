import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    survey: { findUnique: vi.fn(), update: vi.fn() },
    waFlow: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../survey/survey.service.js", () => ({
  updateSurveyVariables: vi.fn(),
  getSurveyById: vi.fn(),
}));
vi.mock("../survey/survey.utils.js", () => ({
  createSurveyDefaultVariableForQuestion: vi.fn(),
}));
vi.mock("./question.utils.js", async () => {
  const actual = await vi.importActual<any>("./question.utils.js");
  return {
    emailPattern: actual.emailPattern,
    getQuestionsArrUpdatedGRTypeQuestion: vi.fn(async (questions: unknown) => questions),
  };
});
vi.mock("../../utils/auth.js", () => ({ hasAccessToSurvey: vi.fn() }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { hasAccessToSurvey } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { updateSurveyVariables, getSurveyById } from "../survey/survey.service.js";
import {
  createQuestion,
  deleteQuestionById,
  getAllowedEmailsFromFile,
  getQuestionById,
  getQuestionsBySurveyId,
  QuestionOrderError,
  reorderQuestions,
  updateQuestion,
  updateQuestionsOnSurvey,
} from "./question.service.js";
import {
  deleteQuestionByIdHandler,
  getQuestionByIdHandler,
  getQuestionsBySurveyIdHandler,
  reorderQuestionsHandler,
  replaceQuestionsHandler,
  updateQuestionHandler,
} from "./question.controller.js";
import { verifySurveyAccess } from "./question.auth.js";
import { questionRoutes } from "./question.route.js";
import {
  questionsRouteParamsSchema,
  replaceQuestionsRequestSchema,
  updateQuestionRequestSchema,
  updateQuestionsOrderRequestSchema,
} from "./question.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  survey: Record<string, Mock>;
  waFlow: Record<string, Mock>;
};

const USER = "11111111-1111-1111-1111-111111111111";
const SURVEY = "22222222-2222-2222-2222-222222222222";

const q = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  type: "Text",
  title: { English: `Question ${id}` },
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
  // clearAllMocks keeps implementations but drops queued values.
  db.survey.findUnique.mockResolvedValue({ questions: [q("a"), q("b"), q("c")] });
  db.survey.update.mockResolvedValue({ id: SURVEY });
  db.waFlow.findFirst.mockResolvedValue(null);
  db.waFlow.update.mockResolvedValue({});
  (hasAccessToSurvey as unknown as Mock).mockResolvedValue(true);
  (updateSurveyVariables as unknown as Mock).mockResolvedValue(undefined);
  (getSurveyById as unknown as Mock).mockResolvedValue({ languages: ["English"] });
});

// ===========================================================================
// reorderQuestions — the array IS the survey
// ===========================================================================

describe("reorderQuestions", () => {
  test("rewrites the questions in the order it was given", async () => {
    await reorderQuestions(SURVEY, ["c", "a", "b"]);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written.map((x: any) => x.id)).toEqual(["c", "a", "b"]);
  });

  // The new order was MAPPED over rather than merged, so anything absent from
  // the array was not carried across and a short list deleted the rest —
  // reachable by ordinary use, not just by abuse: a client computing the order
  // from a stale view of the questions sends a short array and truncates the
  // survey. The questions column IS the survey; there is no soft delete.
  test("a partial order is refused rather than dropping the questions it omits", async () => {
    await expect(reorderQuestions(SURVEY, ["a"])).rejects.toBeInstanceOf(QuestionOrderError);

    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("an empty order no longer empties the survey", async () => {
    await expect(reorderQuestions(SURVEY, [])).rejects.toBeInstanceOf(QuestionOrderError);

    expect(db.survey.update).not.toHaveBeenCalled();
  });

  // An id that matched nothing became `undefined` in the array — and
  // updateQuestionsOnSurvey wrote the array FIRST and only then dereferenced it,
  // so the corrupt array was already persisted when the request failed, the
  // survey variables were never rewritten, and the caller got a 500 that read
  // like nothing had happened. Nothing is written unless the whole order
  // resolves.
  test("an unknown id is refused before anything is written", async () => {
    await expect(reorderQuestions(SURVEY, ["a", "does-not-exist", "b"])).rejects.toBeInstanceOf(
      QuestionOrderError,
    );

    expect(db.survey.update).not.toHaveBeenCalled();
    expect(updateSurveyVariables).not.toHaveBeenCalled();
  });

  test("a duplicated id is refused", async () => {
    await expect(reorderQuestions(SURVEY, ["a", "a"])).rejects.toBeInstanceOf(QuestionOrderError);

    expect(db.survey.update).not.toHaveBeenCalled();
  });

  // The body schema is still a bare array of strings — being a permutation of
  // the survey's current ids is not a shape the schema can express, so the
  // service checks it.
  test("the body schema accepts any array of strings; the service is the check", () => {
    expect(updateQuestionsOrderRequestSchema.safeParse([]).success).toBe(true);
    expect(updateQuestionsOrderRequestSchema.safeParse(["not-an-id"]).success).toBe(true);
    expect(updateQuestionsOrderRequestSchema.safeParse(["a", "a"]).success).toBe(true);
  });

  test("the survey variables are rewritten from the full list", async () => {
    await reorderQuestions(SURVEY, ["c", "a", "b"]);

    expect((updateSurveyVariables as unknown as Mock).mock.calls[0][1]).toHaveLength(3);
  });

  test("the handler answers 400 for an order that is not a permutation", async () => {
    const rep = reply();

    await reorderQuestionsHandler({ params: { surveyId: SURVEY }, body: [] } as never, rep);

    expect(answer(rep).code).toBe(400);
    expect(db.survey.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// replaceQuestionsHandler — no schema at all
// ===========================================================================

describe("replaceQuestionsHandler", () => {
  test("writes whatever array the body carried", async () => {
    const rep = reply();

    await replaceQuestionsHandler(
      { params: { surveyId: SURVEY }, body: { questions: [q("z")] } } as never,
      rep,
    );

    expect(db.survey.update.mock.calls[0][0].data.questions).toEqual([q("z")]);
    expect(answer(rep).code).toBe(200);
  });

  // The route was registered with no schema at all, so the body was unvalidated
  // — and an absent `questions` key was `undefined`, which Prisma writes as a
  // JSON null over the ENTIRE question set. The most destructive endpoint in the
  // module was the only one that validated nothing.
  test("the body schema refuses an absent questions key", () => {
    expect(replaceQuestionsRequestSchema.safeParse({}).success).toBe(false);
    expect(replaceQuestionsRequestSchema.safeParse({ questions: null }).success).toBe(false);
    expect(replaceQuestionsRequestSchema.safeParse({ questions: [null] }).success).toBe(false);
    expect(replaceQuestionsRequestSchema.safeParse({ questions: [{}] }).success).toBe(false);
    expect(replaceQuestionsRequestSchema.safeParse({ questions: [] }).success).toBe(true);
  });

  // looseObject, so the flow builder's evolving question shape passes through —
  // what is required is that each entry is an object carrying an id.
  test("the body schema keeps the question fields it does not know about", () => {
    const parsed = replaceQuestionsRequestSchema.parse({
      questions: [{ id: "z", type: "Text", title: { English: "Hi" } }],
    });

    expect(parsed.questions[0]).toMatchObject({ id: "z", type: "Text" });
  });

  test("the route declares both a body and a params schema", async () => {
    const { routes } = await collectRoutes();

    const replace = routes.find((r) => r.url === "/replace");
    expect(replace.handler).toBe(replaceQuestionsHandler);
    expect(replace.opts.schema.body).toBe(replaceQuestionsRequestSchema);
    expect(replace.opts.schema.params).toBe(questionsRouteParamsSchema);
  });

  test("a screenId additionally rewrites the flow's logic jumps", async () => {
    db.waFlow.findFirst.mockResolvedValueOnce({
      dbFlowId: "flow-1",
      logicJumps: { "screen-1": [], "screen-2": [] },
    });

    await replaceQuestionsHandler(
      { params: { surveyId: SURVEY }, body: { questions: [], screenId: "screen-1" } } as never,
      reply(),
    );

    expect(db.waFlow.update.mock.calls[0][0].data.logicJumps).toEqual({ "screen-2": [] });
  });
});

// ===========================================================================
// The handlers that set a status and never send
// ===========================================================================

describe("the reply completion", () => {
  // reply.code() sets the status and returns the reply for chaining; it does not
  // send. These are async handlers that then resolve undefined, which Fastify
  // treats as a promise to answer later — so none of these paths answered, they
  // held the connection until something timed it out. The delete was the worst
  // case: NEITHER branch sent, so it never responded even when it succeeded, and
  // a client retrying on timeout deletes the next thing it names.
  test("the delete answers 200 on the success path", async () => {
    const rep = reply();

    await deleteQuestionByIdHandler({ params: { surveyId: SURVEY, id: "a" } } as never, rep);

    expect(db.survey.update).toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 200, body: { success: true } });
  });

  test("the delete answers 404 for a question that does not exist", async () => {
    const rep = reply();

    await deleteQuestionByIdHandler({ params: { surveyId: SURVEY, id: "missing" } } as never, rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Question not found" } });
  });

  test("the by-id read sends its 404", async () => {
    const rep = reply();

    await getQuestionByIdHandler({ params: { surveyId: SURVEY, id: "missing" } } as never, rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Question not found" } });
  });

  test("the by-id read does send when the question exists", async () => {
    const rep = reply();

    await getQuestionByIdHandler({ params: { surveyId: SURVEY, id: "a" } } as never, rep);

    expect(rep.send).toHaveBeenCalledOnce();
  });

  test("every error path sends its 500", async () => {
    db.survey.findUnique.mockResolvedValue(null);

    for (const [handler, req] of [
      [getQuestionsBySurveyIdHandler, { params: { surveyId: SURVEY } }],
      [getQuestionByIdHandler, { params: { surveyId: SURVEY, id: "a" } }],
      [reorderQuestionsHandler, { params: { surveyId: SURVEY }, body: [] }],
    ] as const) {
      const rep = reply();

      await (handler as any)(req, rep);

      expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    }
  });

  test("the update does send on its success path", async () => {
    const rep = reply();

    await updateQuestionHandler(
      { params: { surveyId: SURVEY, id: "a" }, body: { required: true } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(200);
    expect(rep.send).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// updateQuestion
// ===========================================================================

describe("updateQuestion", () => {
  test("merges the body over the existing question", async () => {
    await updateQuestion(SURVEY, "b", { required: true } as never);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written[1]).toMatchObject({ id: "b", required: true });
    expect(written).toHaveLength(3);
  });

  // NOTE: the schema refuses to change a question's type, which would orphan
  // the responses already recorded against it.
  test("the schema refuses a type change", () => {
    expect(updateQuestionRequestSchema.safeParse({ type: "Text" }).success).toBe(false);
    expect(updateQuestionRequestSchema.safeParse({ required: true }).success).toBe(true);
  });

  // NOTE: findIndex returns -1 for an unknown id, and questions[-1] = {...}
  // sets a non-index property that JSON serialisation discards — so the write
  // happens and changes nothing. The handlers check first, so this is only
  // reachable by calling the exported service directly.
  test("an unknown question id writes the array back unchanged", async () => {
    await updateQuestion(SURVEY, "does-not-exist", { required: true } as never);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written).toHaveLength(3);
    expect(written.map((x: any) => x.id)).toEqual(["a", "b", "c"]);
    expect(JSON.parse(JSON.stringify(written))).toHaveLength(3);
  });

  test("a review page option turns kiosk mode off", async () => {
    db.survey.findUnique.mockResolvedValueOnce({
      questions: [q("a", { reviewPageOptions: { url: "https://g.page" } })],
    });

    await updateQuestion(SURVEY, "a", { required: true } as never);

    expect(db.survey.update.mock.calls[0][0].data).toEqual({ kioskMode: false });
  });
});

// ===========================================================================
// updateQuestionsOnSurvey — the one-way ticket switch
// ===========================================================================

describe("updateQuestionsOnSurvey", () => {
  test("writes the questions array to the survey", async () => {
    await updateQuestionsOnSurvey(SURVEY, [q("a")] as never);

    expect(db.survey.update.mock.calls[0][0]).toEqual({
      where: { id: SURVEY },
      data: { questions: [q("a")] },
    });
  });

  // The flag used to be written by a SECOND prisma.survey.update issued after the
  // first, so a failure between them left the questions written and the flag not.
  // It rides along with the questions now.
  test("a ticketIssue switches tickets on in the same update as the questions", async () => {
    await updateQuestionsOnSurvey(SURVEY, [q("a", { ticketIssue: "something" })] as never);

    expect(db.survey.update).toHaveBeenCalledOnce();
    expect(db.survey.update.mock.calls[0][0].data).toEqual({
      questions: [q("a", { ticketIssue: "something" })],
      enableTickets: true,
    });
  });

  // The condition was `!== undefined`, so a question carrying `ticketIssue: null`
  // — which is what the editor writes when the field is cleared — switched ticket
  // creation on.
  test("a null or absent ticketIssue does not switch it on", async () => {
    await updateQuestionsOnSurvey(SURVEY, [q("a", { ticketIssue: null })] as never);
    expect(db.survey.update.mock.calls[0][0].data).not.toHaveProperty("enableTickets");

    db.survey.update.mockClear();
    await updateQuestionsOnSurvey(SURVEY, [q("a")] as never);
    expect(db.survey.update.mock.calls[0][0].data).not.toHaveProperty("enableTickets");
  });

  // STILL OPEN: the flag is only ever set TRUE here. Removing
  // the last question with a ticket issue leaves the survey raising tickets for
  // responses that no longer have a rule behind them. Setting it both ways would
  // silently override the operator's own toggle — enableTickets is also a field
  // of the survey update endpoint — so which writer wins is a decision, not a fix.
  test("removing the last such question still does not switch it back", async () => {
    await updateQuestionsOnSurvey(SURVEY, [q("a")] as never);

    expect(db.survey.update.mock.calls[0][0].data).not.toHaveProperty("enableTickets");
  });

  test("the flag is written once however many questions carry the key", async () => {
    await updateQuestionsOnSurvey(SURVEY, [
      q("a", { ticketIssue: "x" }),
      q("b", { ticketIssue: "y" }),
    ] as never);

    expect(db.survey.update).toHaveBeenCalledOnce();
    expect(db.survey.update.mock.calls[0][0].data.enableTickets).toBe(true);
  });
});

// ===========================================================================
// createQuestion and the reads
// ===========================================================================

describe("createQuestion", () => {
  test("appends when no position is given", async () => {
    const created = await createQuestion(SURVEY, { title: { English: "New" } } as never);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written).toHaveLength(4);
    expect(written[3].id).toBe(created.id);
  });

  test("inserts at the requested position", async () => {
    await createQuestion(SURVEY, { position: 1, title: { English: "New" } } as never);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written.map((x: any) => x.id).slice(0, 2)).toEqual(["a", expect.any(String)]);
  });

  test("refuses a position outside the current range", async () => {
    await expect(
      createQuestion(SURVEY, { position: 9, title: { English: "New" } } as never),
    ).rejects.toThrow("must be between 0 and the number of questions");
  });

  test("refuses a question with no title", async () => {
    await expect(createQuestion(SURVEY, { title: {} } as never)).rejects.toThrow(
      "'title' property is required",
    );
  });

  // NOTE: position 0 is falsy, so an explicit 0 is replaced by the append
  // position rather than inserting at the front.
  // `if (!position)` treated an explicit 0 — the front of the survey, the
  // question respondents see first — as "not given", so the question was
  // appended, with a 201 and no indication the position was ignored. The bounds
  // check two lines below explicitly allows 0.
  test("an explicit position of zero prepends", async () => {
    const created = await createQuestion(SURVEY, {
      position: 0,
      title: { English: "New" },
    } as never);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written[0].id).toBe(created.id);
    expect(written.map((x: any) => x.id).slice(1)).toEqual(["a", "b", "c"]);
  });

  test("gives the new question a random uuid", async () => {
    const created = await createQuestion(SURVEY, { title: { English: "New" } } as never);

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("the reads", () => {
  test("questions come from the survey row", async () => {
    await getQuestionsBySurveyId(SURVEY);

    expect(db.survey.findUnique).toHaveBeenCalledWith({
      where: { id: SURVEY },
      select: { questions: true },
    });
  });

  test("a survey that does not exist throws", async () => {
    db.survey.findUnique.mockResolvedValueOnce(null);

    await expect(getQuestionsBySurveyId(SURVEY)).rejects.toThrow("Could not find survey");
  });

  test("by-id searches the array in memory", async () => {
    await expect(getQuestionById(SURVEY, "b")).resolves.toMatchObject({ id: "b" });
    await expect(getQuestionById(SURVEY, "zz")).resolves.toBeUndefined();
  });
});

// ===========================================================================
// deleteQuestionById
// ===========================================================================

describe("deleteQuestionById", () => {
  test("removes the question and rewrites the variables", async () => {
    await deleteQuestionById(SURVEY, "b");

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written.map((x: any) => x.id)).toEqual(["a", "c"]);
    expect(updateSurveyVariables).toHaveBeenCalledOnce();
  });

  test("prunes logic jumps that referenced the deleted question", async () => {
    db.waFlow.findFirst.mockResolvedValueOnce({
      dbFlowId: "flow-1",
      logicJumps: {
        "screen-1": [{ conditions: [{ questionId: "b" }] }, { conditions: [{ questionId: "a" }] }],
      },
    });

    await deleteQuestionById(SURVEY, "b");

    expect(db.waFlow.update.mock.calls[0][0].data.logicJumps).toEqual({
      "screen-1": [{ conditions: [{ questionId: "a" }] }],
    });
  });

  // The pruning loop assumed every value was an array of objects each carrying a
  // conditions array, so one malformed entry threw a TypeError — by which point
  // the questions had already been rewritten and the survey variables updated,
  // leaving the survey half-migrated with the flow untouched.
  test("a logic jump entry with no conditions is kept rather than throwing", async () => {
    db.waFlow.findFirst.mockResolvedValueOnce({
      dbFlowId: "flow-1",
      logicJumps: { "screen-1": [{}, { conditions: [{ questionId: "b" }] }] },
    });

    await expect(deleteQuestionById(SURVEY, "b")).resolves.toBeUndefined();
    expect(db.waFlow.update.mock.calls[0][0].data.logicJumps).toEqual({ "screen-1": [{}] });
  });

  test("a logicJumps value that is not an array is left alone", async () => {
    db.waFlow.findFirst.mockResolvedValueOnce({
      dbFlowId: "flow-1",
      logicJumps: { "screen-1": null },
    });

    await expect(deleteQuestionById(SURVEY, "b")).resolves.toBeUndefined();
    expect(db.waFlow.update.mock.calls[0][0].data.logicJumps).toEqual({ "screen-1": null });
  });

  test("no flow means no pruning", async () => {
    await deleteQuestionById(SURVEY, "b");

    expect(db.waFlow.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// getAllowedEmailsFromFile
// ===========================================================================

describe("getAllowedEmailsFromFile", () => {
  const csv = (body: string) => ({
    mimetype: "text/csv",
    toBuffer: async () => Buffer.from(body),
  });

  test("reads the email column from a csv", async () => {
    const emails = await getAllowedEmailsFromFile(
      csv("email\nann@example.test\nbob@example.test") as never,
    );

    expect(emails).toEqual(["ann@example.test", "bob@example.test"]);
  });

  test("normalises the header casing and whitespace", async () => {
    const emails = await getAllowedEmailsFromFile(csv("  EMAIL \nann@example.test") as never);

    expect(emails).toEqual(["ann@example.test"]);
  });

  // The whole import was abandoned on the first row that failed the pattern,
  // with a bare "Invalid Email" — no row number, no count, no partial result — so
  // finding the offending row in a few thousand addresses meant bisecting the
  // spreadsheet by hand.
  test("a bad row is reported with its row number", async () => {
    await expect(
      getAllowedEmailsFromFile(csv("email\nann@example.test\nnot-an-email") as never),
    ).rejects.toThrow(/row 3 \(not-an-email\)/);
  });

  test("every bad row is collected rather than only the first", async () => {
    await expect(
      getAllowedEmailsFromFile(csv("email\nnope\nann@example.test\nalso-nope") as never),
    ).rejects.toThrow(/row 2 \(nope\), row 4 \(also-nope\)/);
  });

  test("a file with no usable rows is refused", async () => {
    await expect(getAllowedEmailsFromFile(csv("email") as never)).rejects.toThrow(
      "No email IDs found",
    );
  });

  // A file with no `email` column used to fail on its first row with the same
  // "Invalid Email" as a genuinely malformed address — two different problems
  // that looked identical to the person uploading.
  test("a missing email column says so", async () => {
    await expect(getAllowedEmailsFromFile(csv("name\nAnn") as never)).rejects.toThrow(
      "The file has no 'email' column",
    );
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

async function collectRoutes() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    register: vi.fn(),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  await questionRoutes(srv);
  return { srv, routes, hooks };
}

describe("questionRoutes", () => {
  test("guards the whole tree with the session and survey checks", async () => {
    const { hooks } = await collectRoutes();

    expect(hooks.map((h) => h.fn)).toEqual([checkSession, verifySurveyAccess]);
  });

  test("the access check resolves the survey from the route prefix", async () => {
    await verifySurveyAccess({ params: { surveyId: SURVEY }, userId: USER } as never, reply());

    expect(hasAccessToSurvey).toHaveBeenCalledWith(SURVEY, USER);
  });

  test("it refuses a caller without access", async () => {
    (hasAccessToSurvey as unknown as Mock).mockResolvedValueOnce(false);
    const rep = reply();

    await verifySurveyAccess({ params: { surveyId: SURVEY }, userId: USER } as never, rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "You don't have access to this survey" },
    });
  });

  test("registers eight routes", async () => {
    const { routes } = await collectRoutes();

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /",
      "GET /:id",
      "GET /",
      "DELETE /:id",
      "PUT /reorder",
      "PUT /:id",
      "PUT /replace",
      "POST /import-emails/:id",
    ]);
  });

  test("bounds uploads at ten megabytes", async () => {
    const { srv } = await collectRoutes();

    expect(srv.register.mock.calls[0][1]).toEqual({
      limits: { fileSize: 1048576 * 10 },
      throwFileSizeLimit: true,
    });
  });

  test("no route declares a role requirement", async () => {
    const { routes } = await collectRoutes();

    for (const r of routes) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });
});
