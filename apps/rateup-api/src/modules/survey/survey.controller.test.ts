import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

vi.mock("./survey.service.js", () => ({
  cloneSurvey: vi.fn(),
  createSurvey: vi.fn(),
  createSurveyVariable: vi.fn(),
  deleteSurveyById: vi.fn(),
  deleteSurveyFromTeam: vi.fn(),
  deleteSurveyVariable: vi.fn(),
  getActiveSurveysSummmaryByUserId: vi.fn(),
  getGoogleUrlBySurveyTeamMapId: vi.fn(),
  getNPSResponsesForGraph: vi.fn(),
  getPhoneBySurveyTeamMapId: vi.fn(),
  getPublicSurveyById: vi.fn(),
  getSurveyById: vi.fn(),
  getSurveyLandingByUserId: vi.fn(),
  getSurveyLanguagesFromTeamId: vi.fn(),
  getSurveyResponseCountForGraph: vi.fn(),
  getSurveysByTeam: vi.fn(),
  getSurveysByUserId: vi.fn(),
  getSurveysSummmaryByUserId: vi.fn(),
  getSurveyStats: vi.fn(),
  getSurveyStatsBySurveyTeamMapId: vi.fn(),
  getSurveyTemplates: vi.fn(),
  getSurveyVariables: vi.fn(),
  getWebSurveysByUserId: vi.fn(),
  getWhatsappSurveysByUserId: vi.fn(),
  updateCompletedSurvey: vi.fn(),
  updateGoogleLink: vi.fn(),
  updateReviewLinkVisitedOnSurvey: vi.fn(),
  updateStartedSurvey: vi.fn(),
  updateSurveyById: vi.fn(),
  updateSurveyPassword: vi.fn(),
  updateSurveyVariable: vi.fn(),
  updateVisitedSurvey: vi.fn(),
  verifySurveyPassword: vi.fn(),
}));

vi.mock("../team/team.service.js", () => ({ getTeamIdsByUserId: vi.fn() }));
vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("../whatsapp/flows/flow.service.js", () => ({
  getFlowBySurveyId: vi.fn(),
  publishFlowInWa: vi.fn(),
  updateFlowInDb: vi.fn(),
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../utils/http.js", () => ({ getIp: vi.fn(() => "1.2.3.4") }));
vi.mock("../response/response.service.js", () => ({ getSurveyResponseByIp: vi.fn() }));

import Session from "supertokens-node/recipe/session/index.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { getTeamIdsByUserId } from "../team/team.service.js";
import { getSurveyResponseByIp } from "../response/response.service.js";
import {
  getFlowBySurveyId,
  publishFlowInWa,
  updateFlowInDb,
} from "../whatsapp/flows/flow.service.js";
import * as service from "./survey.service.js";
import { SurveyType, WaFlowStatus } from "../../types/enums.js";
import {
  cloneSurveyHandler,
  completedSurveyHandler,
  createSurveyHandler,
  createSurveyVariableHandler,
  deleteSurveyByIdHandler,
  deleteSurveyVariableHandler,
  deleteTeamSurveyHandler,
  fetchGoogleUrlBySurveyIdHandler,
  getActiveSurveysSummaryHandler,
  getNPSGraphHandler,
  getPhoneFromSurveyTeamMapIdHandler,
  getPublicSurveyByIdHandler,
  getSurveyByIdHandler,
  getSurveyByTeamHandler,
  getSurveyLanguagesByTeamIdHandler,
  getSurveyResponseCountForGraphHandler,
  getSurveysHandler,
  getSurveysLandingHandler,
  getSurveysSummaryHandler,
  getSurveyStatsBySurveyTeamMapIdHandler,
  getSurveyStatsHandler,
  getSurveysWithQuestionsHandler,
  getSurveyTemplatesHandler,
  getSurveyVariablesHandler,
  getWebSurveysHandler,
  getWhatsappSurveysHandler,
  reviewPageVisitedOnSurveyHandler,
  startedSurveyHandler,
  updateGoogleLinkHandler,
  updateSurveyByIdHandler,
  updateSurveyPasswordHandler,
  updateSurveyVariableHandler,
  verifySurveyPasswordHandler,
  visitedSurveyHandler,
} from "./survey.controller.js";

const svc = service as unknown as Record<string, ReturnType<typeof vi.fn>>;
const getSessionMock = Session.getSession as unknown as ReturnType<typeof vi.fn>;
const getTeamIdsMock = getTeamIdsByUserId as unknown as ReturnType<typeof vi.fn>;
const getResponseByIpMock = getSurveyResponseByIp as unknown as ReturnType<typeof vi.fn>;

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    userId: "user-1",
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  getTeamIdsMock.mockResolvedValue(["team-1"]);
  // Keep the console quiet for handlers that log caught errors.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("createSurveyHandler", () => {
  test("returns 201 with the created survey and injects the caller's org", async () => {
    svc.createSurvey.mockResolvedValue({ id: "s1" });
    const request = makeRequest({ body: { title: "T", teamIds: ["team-1"] } });
    const reply = makeReply();

    await createSurveyHandler(request, reply);

    expect(svc.createSurvey.mock.calls[0][0]).toMatchObject({ title: "T", orgId: "org-1" });
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.payload).toEqual({ id: "s1" });
  });

  test("returns 400 when the service yields a non-object (e.g. an error string)", async () => {
    svc.createSurvey.mockResolvedValue("Survey not found to duplicate");
    const reply = makeReply();

    await createSurveyHandler(makeRequest({ body: { teamIds: [] } }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({ error: "Invalid survey format." });
  });

  test("returns 400 when the service yields null", async () => {
    svc.createSurvey.mockResolvedValue(null);
    const reply = makeReply();

    await createSurveyHandler(makeRequest({ body: { teamIds: [] } }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
  });

  test("returns 500 when creation throws", async () => {
    svc.createSurvey.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await createSurveyHandler(makeRequest({ body: { teamIds: [] } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getSurveyByIdHandler", () => {
  test("scopes the lookup to the session user's teams", async () => {
    getSessionMock.mockResolvedValue({ getUserId: () => "user-1" });
    svc.getSurveyById.mockResolvedValue({ id: "s1" });
    const reply = makeReply();

    await getSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(svc.getSurveyById).toHaveBeenCalledWith("s1", ["team-1"]);
    expect(reply.payload).toEqual({ id: "s1" });
  });

  test("returns 404 when the survey resolves to nothing", async () => {
    getSessionMock.mockResolvedValue({ getUserId: () => "user-1" });
    svc.getSurveyById.mockResolvedValue(null);
    const reply = makeReply();

    await getSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test("returns 500 when the session cannot be resolved", async () => {
    getSessionMock.mockRejectedValue(new Error("no session"));
    const reply = makeReply();

    await getSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getPublicSurveyByIdHandler", () => {
  test("sends the public survey when no device check is requested", async () => {
    svc.getPublicSurveyById.mockResolvedValue({ id: "s1", uniqueDeviceResponse: true });
    const reply = makeReply();

    await getPublicSurveyByIdHandler(makeRequest({ params: { id: "s1" }, query: {} }), reply);

    expect(getResponseByIpMock).not.toHaveBeenCalled();
    expect(reply.payload).toMatchObject({ id: "s1" });
  });

  test("flags ALREADY_SUBMITTED when the device already answered a unique-response survey", async () => {
    svc.getPublicSurveyById.mockResolvedValue({
      id: "s1",
      surveyTeamMapId: "map-1",
      uniqueDeviceResponse: true,
    });
    getResponseByIpMock.mockResolvedValue({ id: "r1" });
    const reply = makeReply();

    await getPublicSurveyByIdHandler(
      makeRequest({ params: { id: "s1" }, query: { checkUniqueDevice: true } }),
      reply,
    );

    expect(getResponseByIpMock).toHaveBeenCalledWith("map-1", "1.2.3.4");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toMatchObject({ message: "ALREADY_SUBMITTED" });
  });

  test("sends the survey normally when the device has not answered yet", async () => {
    svc.getPublicSurveyById.mockResolvedValue({
      id: "s1",
      surveyTeamMapId: "map-1",
      uniqueDeviceResponse: true,
    });
    getResponseByIpMock.mockResolvedValue(null);
    const reply = makeReply();

    await getPublicSurveyByIdHandler(
      makeRequest({ params: { id: "s1" }, query: { checkUniqueDevice: true } }),
      reply,
    );

    expect(reply.payload).not.toHaveProperty("message");
  });

  test("skips the device check when the survey does not enforce unique devices", async () => {
    svc.getPublicSurveyById.mockResolvedValue({ id: "s1", uniqueDeviceResponse: false });
    const reply = makeReply();

    await getPublicSurveyByIdHandler(
      makeRequest({ params: { id: "s1" }, query: { checkUniqueDevice: true } }),
      reply,
    );

    expect(getResponseByIpMock).not.toHaveBeenCalled();
  });

  test("returns 500 when the lookup throws", async () => {
    svc.getPublicSurveyById.mockRejectedValue(new Error("nope"));
    const reply = makeReply();

    await getPublicSurveyByIdHandler(makeRequest({ params: { id: "s1" }, query: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getPhoneFromSurveyTeamMapIdHandler", () => {
  test("wraps the resolved number in a phone envelope", async () => {
    svc.getPhoneBySurveyTeamMapId.mockResolvedValue("+15550001");
    const reply = makeReply();

    await getPhoneFromSurveyTeamMapIdHandler(makeRequest({ params: { id: "map-1" } }), reply);

    expect(reply.payload).toEqual({ phone: "+15550001" });
  });
});

describe("fetchGoogleUrlBySurveyIdHandler", () => {
  test("returns the google url directly", async () => {
    svc.getGoogleUrlBySurveyTeamMapId.mockResolvedValue("https://g");
    const reply = makeReply();

    const res = await fetchGoogleUrlBySurveyIdHandler(
      makeRequest({ params: { surveyTeamMapId: "map-1" } }),
      reply,
    );

    expect(res).toBe("https://g");
  });

  test("returns 500 with the error message on failure", async () => {
    svc.getGoogleUrlBySurveyTeamMapId.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await fetchGoogleUrlBySurveyIdHandler(makeRequest({ params: { surveyTeamMapId: "m" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ success: false, message: "boom" });
  });
});

describe("cloneSurveyHandler", () => {
  test("returns 201 with the cloned survey", async () => {
    svc.cloneSurvey.mockResolvedValue({ id: "clone-1" });
    const reply = makeReply();

    await cloneSurveyHandler(
      makeRequest({ params: { id: "s1" }, body: { teamIds: ["team-1"] } }),
      reply,
    );

    expect(svc.cloneSurvey).toHaveBeenCalledWith("s1", "user-1", ["team-1"]);
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.payload).toEqual({ success: true, data: { id: "clone-1" } });
  });

  test("turns the service's error string into a 400", async () => {
    svc.cloneSurvey.mockResolvedValue("Survey not found to duplicate");
    const reply = makeReply();

    await cloneSurveyHandler(makeRequest({ params: { id: "s1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({
      success: false,
      message: "Survey not found to duplicate",
    });
  });

  test("returns 500 when cloning throws", async () => {
    svc.cloneSurvey.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await cloneSurveyHandler(makeRequest({ params: { id: "s1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ success: false, message: "boom" });
  });
});

describe("survey listing handlers", () => {
  test("getSurveyByTeamHandler sends the team's surveys", async () => {
    svc.getSurveysByTeam.mockResolvedValue([{ id: "s1" }]);
    const reply = makeReply();

    await getSurveyByTeamHandler(makeRequest({ params: { id: "team-1" } }), reply);

    expect(reply.payload).toEqual([{ id: "s1" }]);
  });

  test("getSurveyByTeamHandler returns 404 for a falsy result", async () => {
    svc.getSurveysByTeam.mockResolvedValue(null);
    const reply = makeReply();

    await getSurveyByTeamHandler(makeRequest({ params: { id: "team-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test("getSurveysHandler requests questions and response counts", async () => {
    svc.getSurveysByUserId.mockResolvedValue([]);
    await getSurveysHandler(makeRequest(), makeReply());

    expect(svc.getSurveysByUserId).toHaveBeenCalledWith("user-1", true, true);
  });

  test("getSurveysWithQuestionsHandler requests questions but not counts", async () => {
    svc.getSurveysByUserId.mockResolvedValue([]);
    await getSurveysWithQuestionsHandler(makeRequest(), makeReply());

    expect(svc.getSurveysByUserId).toHaveBeenCalledWith("user-1", true);
  });

  test("getWebSurveysHandler sends the web survey list", async () => {
    svc.getWebSurveysByUserId.mockResolvedValue([{ id: "s1" }]);
    const reply = makeReply();

    await getWebSurveysHandler(makeRequest(), reply);

    expect(reply.payload).toEqual([{ id: "s1" }]);
  });

  test("getWhatsappSurveysHandler asks for the whatsapp type", async () => {
    svc.getWhatsappSurveysByUserId.mockResolvedValue([]);
    await getWhatsappSurveysHandler(makeRequest(), makeReply());

    expect(svc.getWhatsappSurveysByUserId).toHaveBeenCalledWith("user-1", "whatsapp");
  });

  test("getSurveysLandingHandler requires a session before listing", async () => {
    getSessionMock.mockResolvedValue({ getUserId: () => "user-1" });
    svc.getSurveyLandingByUserId.mockResolvedValue([{ id: "l1" }]);
    const reply = makeReply();

    await getSurveysLandingHandler(makeRequest(), reply);

    expect(getSessionMock).toHaveBeenCalled();
    expect(reply.payload).toEqual([{ id: "l1" }]);
  });

  test("getSurveysLandingHandler returns 500 without a session", async () => {
    getSessionMock.mockRejectedValue(new Error("no session"));
    const reply = makeReply();

    await getSurveysLandingHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(svc.getSurveyLandingByUserId).not.toHaveBeenCalled();
  });

  test("getSurveyTemplatesHandler forwards the requested survey type", async () => {
    svc.getSurveyTemplates.mockResolvedValue({});
    await getSurveyTemplatesHandler(makeRequest({ params: { surveyType: "web" } }), makeReply());

    expect(svc.getSurveyTemplates).toHaveBeenCalledWith("web");
  });

  test("getSurveyLanguagesByTeamIdHandler sends the language list", async () => {
    svc.getSurveyLanguagesFromTeamId.mockResolvedValue(["en", "fr"]);
    const reply = makeReply();

    await getSurveyLanguagesByTeamIdHandler(makeRequest({ params: { teamId: "team-1" } }), reply);

    expect(reply.payload).toEqual(["en", "fr"]);
  });

  test.each([
    [
      "getActiveSurveysSummaryHandler",
      getActiveSurveysSummaryHandler,
      "getActiveSurveysSummmaryByUserId",
    ],
    ["getSurveysSummaryHandler", getSurveysSummaryHandler, "getSurveysSummmaryByUserId"],
  ])("%s returns 500 when the service throws", async (_name, handler, serviceFn) => {
    svc[serviceFn].mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await (handler as any)(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  test("getActiveSurveysSummaryHandler sends the summary payload", async () => {
    svc.getActiveSurveysSummmaryByUserId.mockResolvedValue({ activeSurveysCount: 2 });
    const reply = makeReply();

    await getActiveSurveysSummaryHandler(makeRequest(), reply);

    expect(reply.payload).toEqual({ activeSurveysCount: 2 });
  });

  test("getSurveysSummaryHandler sends the summary payload", async () => {
    svc.getSurveysSummmaryByUserId.mockResolvedValue({ totalSurveysCount: 5 });
    const reply = makeReply();

    await getSurveysSummaryHandler(makeRequest(), reply);

    expect(reply.payload).toEqual({ totalSurveysCount: 5 });
  });
});

describe("stats handlers", () => {
  test("getSurveyStatsBySurveyTeamMapIdHandler sends the stats row", async () => {
    svc.getSurveyStatsBySurveyTeamMapId.mockResolvedValue({ visited: 3 });
    const reply = makeReply();

    await getSurveyStatsBySurveyTeamMapIdHandler(
      makeRequest({ params: { surveyTeamMapId: "map-1" } }),
      reply,
    );

    expect(reply.payload).toEqual({ visited: 3 });
  });

  test("getSurveyStatsBySurveyTeamMapIdHandler returns 404 for a missing row", async () => {
    svc.getSurveyStatsBySurveyTeamMapId.mockResolvedValue(null);
    const reply = makeReply();

    await getSurveyStatsBySurveyTeamMapIdHandler(
      makeRequest({ params: { surveyTeamMapId: "map-1" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test("getSurveyStatsHandler scopes stats to the caller's teams", async () => {
    svc.getSurveyStats.mockResolvedValue([{ visited: 1 }]);
    const reply = makeReply();

    await getSurveyStatsHandler(makeRequest({ params: { surveyId: "s1" } }), reply);

    expect(svc.getSurveyStats).toHaveBeenCalledWith("s1", ["team-1"]);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("getSurveyStatsHandler returns 500 on failure", async () => {
    svc.getSurveyStats.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await getSurveyStatsHandler(makeRequest({ params: { surveyId: "s1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteSurveyByIdHandler", () => {
  test("deletes an existing survey", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1" });
    const reply = makeReply();

    await deleteSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(svc.deleteSurveyById).toHaveBeenCalledWith("s1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 404 without deleting when the survey does not exist", async () => {
    svc.getSurveyById.mockResolvedValue(null);
    const reply = makeReply();

    await deleteSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(svc.deleteSurveyById).not.toHaveBeenCalled();
  });

  test("explains the foreign-key failure (P2003) as a 400", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1" });
    svc.deleteSurveyById.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as any)("fk", "P2003"),
    );
    const reply = makeReply();

    await deleteSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload.error).toContain("associated responses");
  });

  test("falls back to 500 for any other error", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1" });
    svc.deleteSurveyById.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await deleteSurveyByIdHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ error: "An unknown error occurred." });
  });
});

describe("deleteTeamSurveyHandler", () => {
  test("reports success with the deletion info", async () => {
    svc.deleteSurveyFromTeam.mockResolvedValue({ id: "map-1" });
    const reply = makeReply();

    await deleteTeamSurveyHandler(
      makeRequest({ params: { id: "s1" }, body: { teamId: "team-1" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ message: "Deleted successfully.", info: { id: "map-1" } });
  });

  test("returns 404 when nothing was deleted", async () => {
    svc.deleteSurveyFromTeam.mockResolvedValue(null);
    const reply = makeReply();

    await deleteTeamSurveyHandler(makeRequest({ params: { id: "s1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test("returns 500 when the service throws", async () => {
    svc.deleteSurveyFromTeam.mockRejectedValue(new Error("has responses"));
    const reply = makeReply();

    await deleteTeamSurveyHandler(makeRequest({ params: { id: "s1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("updateSurveyByIdHandler", () => {
  test("updates a plain survey without touching whatsapp flows", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1", type: SurveyType.Web });
    svc.updateSurveyById.mockResolvedValue({ status: "success" });
    const reply = makeReply();

    await updateSurveyByIdHandler(
      makeRequest({ params: { id: "s1" }, body: { title: "New" } }),
      reply,
    );

    expect(publishFlowInWa).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ status: "success" });
  });

  test("publishes the WhatsApp flow when a WaFlow survey transitions to published", async () => {
    svc.getSurveyById.mockResolvedValue({
      id: "s1",
      type: SurveyType.WaFlow,
      isPublished: false,
    });
    (getFlowBySurveyId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      flowId: "flow-1",
      dbFlowId: "db-1",
    });
    svc.updateSurveyById.mockResolvedValue({ status: "success" });
    const reply = makeReply();

    await updateSurveyByIdHandler(
      makeRequest({ params: { id: "s1" }, body: { isPublished: true } }),
      reply,
    );

    expect(publishFlowInWa).toHaveBeenCalledWith("org-1", "flow-1");
    expect(updateFlowInDb).toHaveBeenCalledWith("org-1", "db-1", {
      status: WaFlowStatus.PUBLISHED,
    });
  });

  test("does not republish a WaFlow survey that is already published", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1", type: SurveyType.WaFlow, isPublished: true });
    svc.updateSurveyById.mockResolvedValue({ status: "success" });

    await updateSurveyByIdHandler(
      makeRequest({ params: { id: "s1" }, body: { isPublished: true } }),
      makeReply(),
    );

    expect(publishFlowInWa).not.toHaveBeenCalled();
  });

  test("returns 500 with the error message when the update fails", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1", type: SurveyType.Web });
    svc.updateSurveyById.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await updateSurveyByIdHandler(makeRequest({ params: { id: "s1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ status: "failed", message: "boom" });
  });
});

describe("password handlers", () => {
  test("updateSurveyPasswordHandler confirms the change and echoes the protection flag", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1" });
    svc.updateSurveyPassword.mockResolvedValue({ isProtected: true });
    const reply = makeReply();

    await updateSurveyPasswordHandler(
      makeRequest({ params: { id: "s1" }, body: { password: "pw" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({
      message: "Password Changes Updated successfully.",
      isProtected: true,
    });
  });

  test("updateSurveyPasswordHandler returns 404 for a missing survey", async () => {
    svc.getSurveyById.mockResolvedValue(null);
    const reply = makeReply();

    await updateSurveyPasswordHandler(makeRequest({ params: { id: "s1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(svc.updateSurveyPassword).not.toHaveBeenCalled();
  });

  test("verifySurveyPasswordHandler returns success on a valid password", async () => {
    svc.verifySurveyPassword.mockResolvedValue("Access granted");
    const reply = makeReply();

    await verifySurveyPasswordHandler(
      makeRequest({ params: { id: "s1" }, body: { password: "pw" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ status: "success", data: "Access granted" });
  });

  test("verifySurveyPasswordHandler surfaces a wrong password as a 500 error payload", async () => {
    svc.verifySurveyPassword.mockRejectedValue(new Error("Password Error"));
    const reply = makeReply();

    await verifySurveyPasswordHandler(
      makeRequest({ params: { id: "s1" }, body: { password: "bad" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ status: "error", message: "Password Error" });
  });
});

describe("funnel handlers", () => {
  const cases: [string, any, string][] = [
    ["visitedSurveyHandler", visitedSurveyHandler, "updateVisitedSurvey"],
    ["startedSurveyHandler", startedSurveyHandler, "updateStartedSurvey"],
    ["completedSurveyHandler", completedSurveyHandler, "updateCompletedSurvey"],
    [
      "reviewPageVisitedOnSurveyHandler",
      reviewPageVisitedOnSurveyHandler,
      "updateReviewLinkVisitedOnSurvey",
    ],
  ];

  test.each(cases)("%s reports success after the counter is bumped", async (_n, handler, fn) => {
    svc[fn].mockResolvedValue({ id: "stats-1" });
    const reply = makeReply();

    await handler(makeRequest({ params: { id: "map-1" } }), reply);

    expect(svc[fn]).toHaveBeenCalledWith("map-1");
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ status: "success" });
  });

  test.each(cases)("%s returns 404 when no stats row comes back", async (_n, handler, fn) => {
    svc[fn].mockResolvedValue(null);
    const reply = makeReply();

    await handler(makeRequest({ params: { id: "map-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  test.each(cases)("%s returns 500 when the update throws", async (_n, handler, fn) => {
    svc[fn].mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await handler(makeRequest({ params: { id: "map-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("updateGoogleLinkHandler", () => {
  test("updates the link for an existing survey", async () => {
    svc.getSurveyById.mockResolvedValue({ id: "s1" });
    const reply = makeReply();

    await updateGoogleLinkHandler(
      makeRequest({ params: { id: "map-1" }, body: { googleLink: "https://g" } }),
      reply,
    );

    expect(svc.updateGoogleLink).toHaveBeenCalledWith("map-1", { googleLink: "https://g" });
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({
      message: "Success",
      data: "Google Link Updated successfully.",
    });
  });

  test("returns 404 when the survey is missing", async () => {
    svc.getSurveyById.mockResolvedValue(null);
    const reply = makeReply();

    await updateGoogleLinkHandler(makeRequest({ params: { id: "map-1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(svc.updateGoogleLink).not.toHaveBeenCalled();
  });

  test("returns 500 when the lookup throws", async () => {
    svc.getSurveyById.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await updateGoogleLinkHandler(makeRequest({ params: { id: "map-1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("survey variable handlers", () => {
  test("createSurveyVariableHandler creates against the survey in the path", async () => {
    svc.createSurveyVariable.mockResolvedValue({ id: "v1" });
    const reply = makeReply();

    await createSurveyVariableHandler(
      makeRequest({ params: { id: "s1" }, body: { name: "V", type: "CUSTOM", value: "x" } }),
      reply,
    );

    expect(svc.createSurveyVariable).toHaveBeenCalledWith("s1", {
      name: "V",
      type: "CUSTOM",
      value: "x",
    });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("getSurveyVariablesHandler lists the survey's variables", async () => {
    svc.getSurveyVariables.mockResolvedValue([{ id: "v1" }]);
    const reply = makeReply();

    await getSurveyVariablesHandler(makeRequest({ params: { id: "s1" } }), reply);

    expect(reply.payload).toEqual([{ id: "v1" }]);
  });

  test("updateSurveyVariableHandler treats the path id as the variable id", async () => {
    svc.updateSurveyVariable.mockResolvedValue({ id: "v1" });
    const reply = makeReply();

    await updateSurveyVariableHandler(
      makeRequest({ params: { id: "v1" }, body: { name: "new" } }),
      reply,
    );

    expect(svc.updateSurveyVariable).toHaveBeenCalledWith("v1", { name: "new" });
  });

  test("deleteSurveyVariableHandler deletes by the path id", async () => {
    svc.deleteSurveyVariable.mockResolvedValue({ id: "v1" });
    const reply = makeReply();

    await deleteSurveyVariableHandler(makeRequest({ params: { id: "v1" } }), reply);

    expect(svc.deleteSurveyVariable).toHaveBeenCalledWith("v1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test.each([
    ["createSurveyVariableHandler", createSurveyVariableHandler, "createSurveyVariable"],
    ["getSurveyVariablesHandler", getSurveyVariablesHandler, "getSurveyVariables"],
    ["updateSurveyVariableHandler", updateSurveyVariableHandler, "updateSurveyVariable"],
    ["deleteSurveyVariableHandler", deleteSurveyVariableHandler, "deleteSurveyVariable"],
  ])("%s returns 500 with the error message on failure", async (_n, handler, fn) => {
    svc[fn].mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await (handler as any)(makeRequest({ params: { id: "x" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ error: "boom" });
  });
});

describe("graph handlers", () => {
  test("getSurveyResponseCountForGraphHandler splits the comma-separated teamMapIds", async () => {
    svc.getSurveyResponseCountForGraph.mockResolvedValue([]);
    const reply = makeReply();

    await getSurveyResponseCountForGraphHandler(
      makeRequest({
        query: {
          userTimeZone: "UTC",
          timePeriod: "daily",
          surveyId: "s1",
          teamMapIds: "map-1,map-2",
        },
      }),
      reply,
    );

    expect(svc.getSurveyResponseCountForGraph).toHaveBeenCalledWith("org-1", "UTC", "daily", "s1", [
      "map-1",
      "map-2",
    ]);
  });

  test("getSurveyResponseCountForGraphHandler passes an empty list when teamMapIds is absent", async () => {
    svc.getSurveyResponseCountForGraph.mockResolvedValue([]);

    await getSurveyResponseCountForGraphHandler(
      makeRequest({ query: { userTimeZone: "UTC", timePeriod: "daily", surveyId: "s1" } }),
      makeReply(),
    );

    expect(svc.getSurveyResponseCountForGraph.mock.calls[0][4]).toEqual([]);
  });

  test("getSurveyResponseCountForGraphHandler returns 500 on failure", async () => {
    svc.getSurveyResponseCountForGraph.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await getSurveyResponseCountForGraphHandler(makeRequest({ query: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  test("getNPSGraphHandler also passes the caller's team ids", async () => {
    svc.getNPSResponsesForGraph.mockResolvedValue([]);
    const reply = makeReply();

    await getNPSGraphHandler(
      makeRequest({
        query: { userTimeZone: "UTC", timePeriod: "weekly", surveyId: "s1", teamMapIds: "map-1" },
      }),
      reply,
    );

    expect(svc.getNPSResponsesForGraph).toHaveBeenCalledWith(
      "org-1",
      "UTC",
      "weekly",
      "s1",
      ["map-1"],
      ["team-1"],
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("getNPSGraphHandler returns 500 on failure", async () => {
    svc.getNPSResponsesForGraph.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await getNPSGraphHandler(makeRequest({ query: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});
