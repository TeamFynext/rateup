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

  // NOTE: the new order is mapped over, not merged — anything absent from the
  // array is not carried across, so a short list deletes the rest.
  test("a partial order silently drops every question it omits", async () => {
    await reorderQuestions(SURVEY, ["a"]);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written.map((x: any) => x.id)).toEqual(["a"]);
  });

  test("an empty order empties the survey", async () => {
    await reorderQuestions(SURVEY, []);

    expect(db.survey.update.mock.calls[0][0].data.questions).toEqual([]);
  });

  // NOTE: an id that matches nothing becomes undefined in the array. The write
  // happens FIRST (question.service.ts:144) and the ticket-flag loop below it
  // then dereferences that undefined — so the corrupt array is persisted and
  // the function throws afterwards.
  test("an unknown id is persisted as an undefined entry and then throws", async () => {
    await expect(reorderQuestions(SURVEY, ["a", "does-not-exist", "b"])).rejects.toThrow(TypeError);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written).toHaveLength(3);
    expect(written[1]).toBeUndefined();
  });

  test("and the survey variables are never rewritten after that throw", async () => {
    await reorderQuestions(SURVEY, ["a", "does-not-exist"]).catch(() => {});

    expect(db.survey.update).toHaveBeenCalledOnce();
    expect(updateSurveyVariables).not.toHaveBeenCalled();
  });

  test("a duplicated id is stored twice", async () => {
    await reorderQuestions(SURVEY, ["a", "a"]);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written.map((x: any) => x.id)).toEqual(["a", "a"]);
  });

  // NOTE: the body schema is a bare array of strings — nothing requires it to
  // be a permutation of the survey's current question ids.
  test("the body schema accepts any array of strings, including empty", () => {
    expect(updateQuestionsOrderRequestSchema.safeParse([]).success).toBe(true);
    expect(updateQuestionsOrderRequestSchema.safeParse(["not-an-id"]).success).toBe(true);
    expect(updateQuestionsOrderRequestSchema.safeParse(["a", "a"]).success).toBe(true);
  });

  test("the survey variables are rewritten from the same truncated list", async () => {
    await reorderQuestions(SURVEY, ["a"]);

    expect((updateSurveyVariables as unknown as Mock).mock.calls[0][1]).toHaveLength(1);
  });

  test("the handler passes the body straight through", async () => {
    await reorderQuestionsHandler({ params: { surveyId: SURVEY }, body: [] } as never, reply());

    expect(db.survey.update.mock.calls[0][0].data.questions).toEqual([]);
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

  // NOTE: the route is registered with no schema, so the body is unvalidated —
  // an absent questions key writes undefined over the survey's questions.
  test("an absent questions key is written through as undefined", async () => {
    await replaceQuestionsHandler({ params: { surveyId: SURVEY }, body: {} } as never, reply());

    expect(db.survey.update.mock.calls[0][0].data.questions).toBeUndefined();
  });

  test("the route declares neither a body nor a params schema", async () => {
    const { routes } = await collectRoutes();

    const replace = routes.find((r) => r.url === "/replace");
    // Registered as put(url, handler) — no options object, so nowhere a schema
    // could be declared.
    expect(replace.opts).toBe(replaceQuestionsHandler);
    expect(replace.handler).toBeUndefined();
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
  // NOTE: reply.code() sets the status and returns the reply; it does not send.
  // These handlers then resolve undefined.
  test("the delete answers nothing on the success path", async () => {
    const rep = reply();

    await deleteQuestionByIdHandler({ params: { surveyId: SURVEY, id: "a" } } as never, rep);

    expect(db.survey.update).toHaveBeenCalled();
    expect(rep.send).not.toHaveBeenCalled();
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("the delete answers nothing for a question that does not exist either", async () => {
    const rep = reply();

    await deleteQuestionByIdHandler({ params: { surveyId: SURVEY, id: "missing" } } as never, rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("the by-id read sets 404 without sending", async () => {
    const rep = reply();

    await getQuestionByIdHandler({ params: { surveyId: SURVEY, id: "missing" } } as never, rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("the by-id read does send when the question exists", async () => {
    const rep = reply();

    await getQuestionByIdHandler({ params: { surveyId: SURVEY, id: "a" } } as never, rep);

    expect(rep.send).toHaveBeenCalledOnce();
  });

  test("every error path sets 500 without sending", async () => {
    db.survey.findUnique.mockResolvedValue(null);

    for (const [handler, req] of [
      [getQuestionsBySurveyIdHandler, { params: { surveyId: SURVEY } }],
      [getQuestionByIdHandler, { params: { surveyId: SURVEY, id: "a" } }],
      [reorderQuestionsHandler, { params: { surveyId: SURVEY }, body: [] }],
    ] as const) {
      const rep = reply();

      await (handler as any)(req, rep);

      expect(rep.code).toHaveBeenCalledWith(500);
      expect(rep.send).not.toHaveBeenCalled();
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

  // NOTE: any question carrying a ticketIssue key turns enableTickets on, and
  // nothing anywhere turns it off — removing the question leaves the survey
  // raising tickets.
  test("a ticketIssue key switches tickets on", async () => {
    await updateQuestionsOnSurvey(SURVEY, [q("a", { ticketIssue: "something" })] as never);

    expect(db.survey.update).toHaveBeenCalledTimes(2);
    expect(db.survey.update.mock.calls[1][0].data).toEqual({ enableTickets: true });
  });

  test("removing the last such question does not switch it back", async () => {
    await updateQuestionsOnSurvey(SURVEY, [q("a")] as never);

    expect(db.survey.update).toHaveBeenCalledOnce();
    expect(db.survey.update.mock.calls[0][0].data).not.toHaveProperty("enableTickets");
  });

  test("the switch fires once however many questions carry the key", async () => {
    await updateQuestionsOnSurvey(SURVEY, [
      q("a", { ticketIssue: "x" }),
      q("b", { ticketIssue: "y" }),
    ] as never);

    expect(db.survey.update).toHaveBeenCalledTimes(2);
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
  test("an explicit position of zero appends instead of prepending", async () => {
    await createQuestion(SURVEY, { position: 0, title: { English: "New" } } as never);

    const written = db.survey.update.mock.calls[0][0].data.questions;
    expect(written[0].id).toBe("a");
    expect(written).toHaveLength(4);
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

  // NOTE: the pruning loop assumes every value is an array of objects each
  // carrying a conditions array.
  test("a logic jump entry with no conditions throws", async () => {
    db.waFlow.findFirst.mockResolvedValueOnce({
      dbFlowId: "flow-1",
      logicJumps: { "screen-1": [{}] },
    });

    await expect(deleteQuestionById(SURVEY, "b")).rejects.toThrow(TypeError);
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

  // NOTE: the whole import is abandoned on the first row that fails the
  // pattern — there is no per-row reporting and no partial result.
  test("one bad row discards the entire file", async () => {
    await expect(
      getAllowedEmailsFromFile(csv("email\nann@example.test\nnot-an-email") as never),
    ).rejects.toThrow("Invalid Email");
  });

  test("a file with no usable rows is refused", async () => {
    await expect(getAllowedEmailsFromFile(csv("email") as never)).rejects.toThrow(
      "No email IDs found",
    );
  });

  test("a missing email column fails on the first row", async () => {
    await expect(getAllowedEmailsFromFile(csv("name\nAnn") as never)).rejects.toThrow(
      "Invalid Email",
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
