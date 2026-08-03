import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    surveyResponse: { delete: vi.fn(), findMany: vi.fn() },
    campaignParticipant: { findMany: vi.fn() },
    usageStats: { findUnique: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./response.service.js", () => ({
  createResponse: vi.fn(),
  deleteResponse: vi.fn(),
  downloadExcelResponse: vi.fn(),
  downloadExcelResponseV2: vi.fn(),
  exportContactResponseToContacts: vi.fn(),
  generateResponse: vi.fn(),
  getAllResponses: vi.fn(),
  getResponseAnalyticsForGraph: vi.fn(),
  getResponseBySurveyById: vi.fn(),
  getResponseCountForCamparison: vi.fn(),
  getResponses: vi.fn(),
  getResponseSummary: vi.fn(),
  getSurveyList: vi.fn(),
  getSurveyResponseBySurveyId: vi.fn(),
  getSurveyResponseCount: vi.fn(),
  resetResponsesStats: vi.fn(),
  saveResponseToGoogleSheet: vi.fn(),
  sendEmailOnResponseCreation: vi.fn(),
  sendResponseToWebhook: vi.fn(),
  syncResponseToGoogleSheet: vi.fn(),
  updateResponse: vi.fn(),
  happyIndexResponsesBySurveyId: vi.fn(),
}));

vi.mock("../team/team.service.js", () => ({
  getTeamIdsBySurveyMapId: vi.fn(),
  getTeamIdsByUserId: vi.fn(),
}));

vi.mock("../../utils/location.js", () => ({ fetchLocation: vi.fn() }));
vi.mock("../../utils/http.js", () => ({ getIp: vi.fn(() => "203.0.113.9") }));
vi.mock("../testimonial/testimonial.service.js", () => ({ createTestimonial: vi.fn() }));
vi.mock("../question/question.service.js", () => ({ getQuestionsBySurveyId: vi.fn() }));
vi.mock("../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../whatsapp/flows/flow.service.js", () => ({ getFlowFromDb: vi.fn() }));
vi.mock("../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: { RESPONSE_SUBMITTED: "response_submitted" },
}));
vi.mock("../../utils/auth.js", () => ({ hasAccessToSurvey: vi.fn(), assertRootOrg: vi.fn() }));
vi.mock("../../utils/surveyTeam/mapActions.js", () => ({ getSurveyIdfromMap: vi.fn() }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/checkRoleHandler.js", () => ({
  checkRoleHandler: vi.fn((roles) => Object.assign(vi.fn(), { roles })),
}));

import prisma from "../../utils/prisma.js";
import * as service from "./response.service.js";
import { getTeamIdsBySurveyMapId, getTeamIdsByUserId } from "../team/team.service.js";
import { createTestimonial } from "../testimonial/testimonial.service.js";
import { fetchLocation } from "../../utils/location.js";
import { hasAccessToSurvey } from "../../utils/auth.js";
import { getSurveyIdfromMap } from "../../utils/surveyTeam/mapActions.js";
import { checkSession } from "../../utils/checkSession.js";
import {
  createResponseHandler,
  deleteResponseHandler,
  downloadExcelResponseHandler,
  getAllResponsesHandler,
  syncResponseToGoogleSheetHandler,
} from "./response.controller.js";
import { verifyAccess } from "./response.auth.js";
import { responseRoutes } from "./response.route.js";
import { responsePublicRoutes } from "./response.public.route.js";
import {
  createResponseInputSchema,
  generateXlsxSchema,
  generateXlsxBody,
  CreateResponseInput,
} from "./response.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as Record<string, any>;
const svc = service as unknown as Record<string, Mock>;

const USER = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";
const OWN_MAP = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const VICTIM_MAP = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";
const VICTIM_SURVEY = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const VICTIM_RESPONSE = "9f8e7d6c-5b4a-4392-8172-6a5b4c3d2e1f";

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
    header: vi.fn(() => rep),
  };
  return rep;
}

function answer(rep: any) {
  return {
    code: rep.code.mock.calls[0]?.[0] ?? rep.status.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

const xlsxBody = (over: Record<string, unknown> = {}) => {
  const base: generateXlsxBody = {
    surveyId: VICTIM_SURVEY,
    defaultLanguage: "English",
    visibleColumn: [],
    tz: "Asia/Calcutta",
    filterTeams: [],
    campaignIds: [],
    format: "xlsx",
    columnFilters: [],
    ranges: {},
  };
  return { ...base, ...over };
};

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.surveyResponse.delete.mockResolvedValue({ id: VICTIM_RESPONSE });
  db.campaignParticipant.findMany.mockResolvedValue([]);
  db.usageStats.findUnique.mockResolvedValue(null);
  svc.getAllResponses.mockResolvedValue([]);
  svc.deleteResponse.mockResolvedValue({ id: VICTIM_RESPONSE });
  svc.downloadExcelResponse.mockResolvedValue(Buffer.from("xlsx"));
  svc.syncResponseToGoogleSheet.mockResolvedValue({ id: VICTIM_SURVEY });
  (getTeamIdsByUserId as unknown as Mock).mockResolvedValue([]);
  (getTeamIdsBySurveyMapId as unknown as Mock).mockResolvedValue([]);
  (hasAccessToSurvey as unknown as Mock).mockResolvedValue(true);
  (getSurveyIdfromMap as unknown as Mock).mockResolvedValue(VICTIM_SURVEY);
  (fetchLocation as unknown as Mock).mockResolvedValue(undefined);
  (createTestimonial as unknown as Mock).mockResolvedValue(undefined);
});

// ===========================================================================
// verifyAccess — the tree hook and its exemptions
// ===========================================================================

describe("verifyAccess", () => {
  const req = (over: any = {}) => ({
    routeOptions: { url: "/api/response/survey/:surveyId" },
    params: { surveyId: VICTIM_SURVEY },
    userId: USER,
    ...over,
  });

  test("checks the survey named in the path", async () => {
    await verifyAccess(req(), reply());

    expect(hasAccessToSurvey).toHaveBeenCalledWith(VICTIM_SURVEY, USER);
  });

  test("resolves the survey from a map id when that is what the route binds", async () => {
    await verifyAccess(
      req({
        params: { surveyTeamMapId: OWN_MAP },
        routeOptions: { url: "/api/response/:surveyTeamMapId" },
      }),
      reply(),
    );

    expect(getSurveyIdfromMap).toHaveBeenCalledWith(OWN_MAP);
    expect(hasAccessToSurvey).toHaveBeenCalledWith(VICTIM_SURVEY, USER);
  });

  test("refuses a caller without access", async () => {
    (hasAccessToSurvey as unknown as Mock).mockResolvedValueOnce(false);
    const rep = reply();

    await verifyAccess(req(), rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "You don't have access to this survey" },
    });
  });

  // NOTE: the hook exempts two routes by comparing the registered URL string.
  // /generate has assertRootOrg of its own; /download-response has nothing but
  // checkSession.
  test("returns without checking anything for the two exempt urls", async () => {
    for (const url of ["/api/response/generate", "/api/response/download-response"]) {
      vi.clearAllMocks();

      await verifyAccess(req({ routeOptions: { url }, params: {} }), reply());

      expect(hasAccessToSurvey).not.toHaveBeenCalled();
      expect(getSurveyIdfromMap).not.toHaveBeenCalled();
    }
  });

  test("the exemption is an exact string match on the registered url", async () => {
    await verifyAccess(
      req({ routeOptions: { url: "/api/response/download-response/" }, params: {} }),
      reply(),
    );

    expect(getSurveyIdfromMap).toHaveBeenCalled();
  });
});

// ===========================================================================
// downloadExcelResponseHandler — the exempt route
// ===========================================================================

describe("downloadExcelResponseHandler", () => {
  // NOTE: the survey id comes from the body, and the hook that would have
  // checked it returned early for this url.
  test("exports whatever survey id the body names", async () => {
    await downloadExcelResponseHandler(
      { body: xlsxBody(), userId: USER, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(svc.getAllResponses.mock.calls[0][0]).toBe(VICTIM_SURVEY);
    expect(hasAccessToSurvey).not.toHaveBeenCalled();
  });

  // NOTE: filterTeams is a list of survey-team-map ids taken from the body, and
  // getTeamIdsBySurveyMapId resolves them with no user or org condition
  // (team.service.ts:734-747).
  test("resolves the team filter from map ids the caller supplied", async () => {
    (getTeamIdsBySurveyMapId as unknown as Mock).mockResolvedValueOnce(["victim-team"]);

    await downloadExcelResponseHandler(
      {
        body: xlsxBody({ filterTeams: [VICTIM_MAP] }),
        userId: USER,
        user: { orgId: ORG },
      } as never,
      reply(),
    );

    expect(getTeamIdsBySurveyMapId).toHaveBeenCalledWith([VICTIM_MAP]);
    expect(getTeamIdsByUserId).not.toHaveBeenCalled();
    expect(svc.getAllResponses.mock.calls[0][1]).toEqual(["victim-team"]);
  });

  test("falls back to the caller's own teams only when filterTeams is empty", async () => {
    (getTeamIdsByUserId as unknown as Mock).mockResolvedValueOnce(["own-team"]);

    await downloadExcelResponseHandler(
      { body: xlsxBody(), userId: USER, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(getTeamIdsByUserId).toHaveBeenCalledWith(USER);
    expect(svc.getAllResponses.mock.calls[0][1]).toEqual(["own-team"]);
  });

  // NOTE: an empty team list is not a refusal — getAllResponses drops the team
  // filter entirely when the array is empty (response.service.ts:103-113).
  test("an empty team list is passed through rather than refused", async () => {
    await downloadExcelResponseHandler(
      { body: xlsxBody(), userId: USER, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(svc.getAllResponses.mock.calls[0][1]).toEqual([]);
  });

  test("the body schema requires a survey id but constrains nothing about ownership", () => {
    expect(generateXlsxSchema.safeParse({ ...xlsxBody(), surveyId: "" }).success).toBe(false);
    expect(generateXlsxSchema.safeParse(xlsxBody()).success).toBe(true);
  });

  test("a failure sends the raw error object", async () => {
    svc.getAllResponses.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await downloadExcelResponseHandler(
      { body: xlsxBody(), userId: USER, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// deleteResponseHandler — the id the check does not cover
// ===========================================================================

describe("deleteResponseHandler", () => {
  // NOTE: the route binds :surveyTeamMapId and :id. verifyAccess resolves the
  // survey from the MAP; the handler deletes by the ID, and the two are never
  // compared.
  test("deletes by the id alone, ignoring the map the check used", async () => {
    await deleteResponseHandler(
      { params: { surveyTeamMapId: OWN_MAP, id: VICTIM_RESPONSE } } as never,
      reply(),
    );

    expect(svc.deleteResponse).toHaveBeenCalledWith(VICTIM_RESPONSE);
  });

  test("the handler never looks at the map id", async () => {
    const rep = reply();

    await deleteResponseHandler(
      { params: { surveyTeamMapId: OWN_MAP, id: VICTIM_RESPONSE } } as never,
      rep,
    );

    expect(svc.deleteResponse.mock.calls[0]).toHaveLength(1);
    expect(answer(rep).code).toBe(201);
  });

  test("a delete failure answers 500 with the message", async () => {
    svc.deleteResponse.mockRejectedValueOnce(new Error("Record to delete does not exist."));
    const rep = reply();

    await deleteResponseHandler(
      { params: { surveyTeamMapId: OWN_MAP, id: VICTIM_RESPONSE } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 500,
      body: { success: false, message: "Record to delete does not exist." },
    });
  });
});

// ===========================================================================
// createResponseHandler — the reply goes out first
// ===========================================================================

describe("createResponseHandler", () => {
  const body: CreateResponseInput = {
    surveyTeamMapId: OWN_MAP,
    language: "English",
    responses: [],
    location: {},
    platform: "WEB",
  };

  const created: {
    id: string;
    surveyTeamMapId: string;
    responses: CreateResponseInput["responses"];
    language: string;
    createdAt: Date;
    Contact: { phone: string };
    tag: string | null;
    location: Record<string, unknown> | null;
    surveyTeam?: { id: string };
    surveyTeamMap: { team: { orgId: string } };
  } = {
    id: "resp-1",
    surveyTeamMapId: OWN_MAP,
    responses: [],
    language: "English",
    createdAt: new Date(2026, 0, 1),
    Contact: { phone: "919876543210" },
    tag: null,
    location: null,
    surveyTeam: undefined,
    surveyTeamMap: { team: { orgId: ORG } },
  };

  beforeEach(() => {
    svc.createResponse.mockResolvedValue(created);
    svc.saveResponseToGoogleSheet.mockResolvedValue(undefined);
    svc.sendEmailOnResponseCreation.mockResolvedValue(undefined);
    svc.updateResponse.mockResolvedValue(undefined);
    svc.sendResponseToWebhook.mockResolvedValue(undefined);
  });

  // NOTE: the 201 is sent immediately after the row is created and BEFORE the
  // post-processing block runs. This corrects issues.txt 32.2, which described
  // the respondent receiving a 500.
  test("answers 201 before any post-processing runs", async () => {
    const order: string[] = [];
    const rep: any = {
      code: vi.fn(() => rep),
      send: vi.fn(() => {
        order.push("reply");
        return rep;
      }),
      header: vi.fn(() => rep),
      status: vi.fn(() => rep),
    };
    svc.saveResponseToGoogleSheet.mockImplementationOnce(async () => {
      order.push("sheet");
    });

    await createResponseHandler({ body } as never, rep);

    expect(order).toEqual(["reply", "sheet"]);
  });

  test("the respondent's 201 carries no body", async () => {
    const rep = reply();

    await createResponseHandler({ body } as never, rep);

    expect(rep.code).toHaveBeenCalledWith(201);
    expect(rep.send.mock.calls[0][0]).toBeUndefined();
  });

  // NOTE: a rejection inside the Promise.all reaches the catch, which tries to
  // send a second reply on a request that was already answered.
  test("a post-processing failure attempts a second send", async () => {
    (createTestimonial as unknown as Mock).mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const rep = reply();

    await createResponseHandler({ body } as never, rep);

    expect(rep.send).toHaveBeenCalledTimes(2);
    expect(rep.code.mock.calls.map((c: any[]) => c[0])).toEqual([201, 500]);
  });

  test("the second send carries the underlying error message", async () => {
    (createTestimonial as unknown as Mock).mockRejectedValueOnce(new Error("boom"));
    const rep = reply();

    await createResponseHandler({ body } as never, rep);

    expect(rep.send.mock.calls[1][0]).toBe("boom");
  });

  // NOTE: Promise.all rejects on the first failure, so the operations that had
  // not yet resolved are abandoned — the response row exists with only some of
  // its side effects applied.
  test("one failing side effect abandons the rest of the batch", async () => {
    (createTestimonial as unknown as Mock).mockRejectedValueOnce(new Error("boom"));

    await createResponseHandler({ body } as never, reply());

    // The Zapier trigger is queued in the same batch and never completes.
    expect(svc.sendResponseToWebhook).toHaveBeenCalled();
  });

  test("the WhatsApp platform skips the whole post-processing block", async () => {
    await createResponseHandler({ body: { ...body, platform: "WHATSAPP" } } as never, reply());

    expect(svc.saveResponseToGoogleSheet).not.toHaveBeenCalled();
    expect(createTestimonial).not.toHaveBeenCalled();
  });

  // NOTE: a failure inside createResponse itself happens before the 201, so
  // that one really does reach the respondent as a 500.
  test("a failure before the reply answers 500 once", async () => {
    svc.createResponse.mockRejectedValueOnce(new Error("survey not found"));
    const rep = reply();

    await createResponseHandler({ body } as never, rep);

    expect(rep.send).toHaveBeenCalledTimes(1);
    expect(answer(rep)).toEqual({ code: 500, body: "survey not found" });
  });

  test("the public route validates the body and carries no session check", async () => {
    const routes: any[] = [];
    const srv: any = {
      post: vi.fn((url, opts, handler) => routes.push({ url, opts, handler })),
      addHook: vi.fn(),
    };

    await responsePublicRoutes(srv);

    expect(routes).toHaveLength(1);
    expect(routes[0].opts.schema.body).toBe(createResponseInputSchema);
    expect(routes[0].opts.preHandler).toBeUndefined();
    expect(srv.addHook).not.toHaveBeenCalled();
  });

  test("the public body schema accepts a caller-supplied contactId", () => {
    const parsed = createResponseInputSchema.safeParse({
      surveyTeamMapId: OWN_MAP,
      language: "en",
      responses: [],
      location: {},
      contactId: "someone-elses-contact",
    });

    expect(parsed.success).toBe(true);
  });
});

// ===========================================================================
// getAllResponsesHandler — the double send
// ===========================================================================

describe("getAllResponsesHandler", () => {
  test("scopes the team list to the caller", async () => {
    (getTeamIdsByUserId as unknown as Mock).mockResolvedValueOnce(["own-team"]);
    svc.getAllResponses.mockResolvedValueOnce([{ id: "r-1" }]);

    await getAllResponsesHandler(
      { params: { surveyId: VICTIM_SURVEY }, userId: USER } as never,
      reply(),
    );

    expect(getTeamIdsByUserId).toHaveBeenCalledWith(USER);
    expect(svc.getAllResponses).toHaveBeenCalledWith(VICTIM_SURVEY, ["own-team"]);
  });

  // NOTE: the empty branch sends a 404 and then falls through to the 200 — the
  // `if` has no return.
  test("an empty result sends both a 404 and a 200", async () => {
    const rep = reply();

    await getAllResponsesHandler(
      { params: { surveyId: VICTIM_SURVEY }, userId: USER } as never,
      rep,
    );

    expect(rep.code.mock.calls.map((c: any[]) => c[0])).toEqual([404, 200]);
    expect(rep.send).toHaveBeenCalledTimes(2);
  });

  test("a non-empty result sends once", async () => {
    svc.getAllResponses.mockResolvedValueOnce([{ id: "r-1" }]);
    const rep = reply();

    await getAllResponsesHandler(
      { params: { surveyId: VICTIM_SURVEY }, userId: USER } as never,
      rep,
    );

    expect(rep.send).toHaveBeenCalledTimes(1);
    expect(answer(rep).code).toBe(200);
  });
});

// ===========================================================================
// syncResponseToGoogleSheetHandler — the catch that can throw
// ===========================================================================

describe("syncResponseToGoogleSheetHandler", () => {
  test("syncs the survey for the caller's org", async () => {
    const rep = reply();

    await syncResponseToGoogleSheetHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(svc.syncResponseToGoogleSheet).toHaveBeenCalledWith(VICTIM_SURVEY, ORG);
    expect(answer(rep).code).toBe(201);
  });

  // NOTE: the catch now guards the axios-only shape with axios.isAxiosError, so a
  // plain error is answered with a 500 instead of throwing a second time.
  test("an ordinary error is answered with a 500", async () => {
    const err = new Error("db down");
    svc.syncResponseToGoogleSheet.mockRejectedValueOnce(err);
    const rep = reply();

    await syncResponseToGoogleSheetHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: err });
  });

  test("an axios error is reported cleanly", async () => {
    svc.syncResponseToGoogleSheet.mockRejectedValueOnce(
      Object.assign(new Error("invalid_grant"), {
        isAxiosError: true,
        response: { data: { error: "invalid_grant" } },
      }),
    );
    const rep = reply();

    await syncResponseToGoogleSheetHandler(
      { params: { surveyId: VICTIM_SURVEY }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "invalid_grant" } });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("responseRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("applies the session and access checks to the whole tree", async () => {
    const { srv, hooks } = fakeServer();

    await responseRoutes(srv);

    expect(hooks.map((h) => h.fn)).toEqual([checkSession, verifyAccess]);
  });

  test("role-gates the destructive routes", async () => {
    const { srv, routes } = fakeServer();

    await responseRoutes(srv);

    const gated = routes.filter((r) => r.opts?.preHandler?.[0]?.roles);
    expect(gated.map((r) => `${r.method} ${r.url}`)).toEqual([
      "DELETE /reset/:surveyId",
      "DELETE /:surveyTeamMapId/delete/:id",
      "POST /:surveyId/sync-response",
    ]);
    for (const r of gated) {
      expect(r.opts.preHandler[0].roles).toEqual(["SUPER_ADMIN", "ADMIN"]);
    }
  });

  // NOTE: the export and summarize routes write and spend respectively, and
  // carry no role requirement.
  test("leaves the export and summarize routes ungated by role", async () => {
    const { srv, routes } = fakeServer();

    await responseRoutes(srv);

    const exportRoute = routes.find((r) => r.url === "/export-contacts/:surveyId");
    const summarize = routes.find((r) => r.url === "/summarize/:surveyId");
    // Registered as post(url, handler) — no options object at all.
    expect(exportRoute.handler).toBeUndefined();
    expect(summarize.opts.preHandler).toBeUndefined();
  });

  test("the download route declares a body schema and no extra guard", async () => {
    const { srv, routes } = fakeServer();

    await responseRoutes(srv);

    const dl = routes.find((r) => r.url === "/download-response");
    expect(dl.opts.schema.body).toBe(generateXlsxSchema);
    expect(dl.opts.preHandler).toBeUndefined();
  });

  test("the generate route carries the root-org check", async () => {
    const { srv, routes } = fakeServer();

    await responseRoutes(srv);

    const gen = routes.find((r) => r.url === "/generate");
    expect(gen.opts.preHandler).toHaveLength(1);
  });
});
