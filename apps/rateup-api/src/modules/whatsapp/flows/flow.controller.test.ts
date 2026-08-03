import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./flow.service.js", () => ({
  cloneFlow: vi.fn(),
  cloneFlowInWa: vi.fn(),
  createFlowCopyInDb: vi.fn(),
  createFlowInWa: vi.fn(),
  deleteFlowInDb: vi.fn(),
  deleteFlowInWa: vi.fn(),
  deprecateFlowInWa: vi.fn(),
  getFlowFromDb: vi.fn(),
  getFlowFromWa: vi.fn(),
  getFlowJsonFromWa: vi.fn(),
  getFlowPreview: vi.fn(),
  getFlowsFromDb: vi.fn(),
  getFlowsFromWa: vi.fn(),
  getFlowWithSurveyTeamMapIds: vi.fn(),
  getUnsyncedFlows: vi.fn(),
  publishFlowInWa: vi.fn(),
  sendFlow: vi.fn(),
  syncLocalFlowToWhatsapp: vi.fn(),
  updateFlowIdAndStatusInDb: vi.fn(),
  updateFlowInDb: vi.fn(),
  updateFlowMetaDataInWa: vi.fn(),
}));
vi.mock("./flow.utils.js", () => ({ createSurveyFromFlow: vi.fn() }));
vi.mock("../../survey/survey.service.js", () => ({
  createSurvey: vi.fn(),
  deleteSurveyById: vi.fn(),
}));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../settings/wa_settings.service.js", () => ({ getWaSettings: vi.fn() }));
vi.mock("../wa_error_handler.js", () => ({ getGraphApiErrorMessage: vi.fn() }));
vi.mock("../../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({ validateSession: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  cloneFlow,
  cloneFlowInWa,
  createFlowCopyInDb,
  createFlowInWa,
  deleteFlowInDb,
  deleteFlowInWa,
  deprecateFlowInWa,
  getFlowFromDb,
  getFlowFromWa,
  getFlowJsonFromWa,
  getFlowsFromDb,
  getFlowsFromWa,
  getFlowWithSurveyTeamMapIds,
  publishFlowInWa,
  sendFlow,
  syncLocalFlowToWhatsapp,
  updateFlowIdAndStatusInDb,
  updateFlowInDb,
  updateFlowMetaDataInWa,
} from "./flow.service.js";
import { createSurveyFromFlow } from "./flow.utils.js";
import { createSurvey, deleteSurveyById } from "../../survey/survey.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { createSession, deleteSession, getSession } from "../whatsappSurvey/wasurvey.service.js";
import { validateSession } from "../whatsappSurvey/wasurvey.utils.js";
import { QuestionType, WaFlowStatus } from "../../../types/enums.js";
import {
  cloneFlowHandler,
  createFlowHandler,
  deleteFlowHandler,
  deprecateFlowHandler,
  getFlowHandler,
  getFlowMetricsHandler,
  getFlowsHandler,
  importFlowsHandler,
  publishFlowHandler,
  saveFlowJsonToWhatsappHandler,
  sendFlowHandler,
  updateFlowHandler,
  updateFlowMetaDataHandler,
} from "./flow.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  cloneFlow: cloneFlow as unknown as Mock,
  cloneFlowInWa: cloneFlowInWa as unknown as Mock,
  createFlowCopyInDb: createFlowCopyInDb as unknown as Mock,
  createFlowInWa: createFlowInWa as unknown as Mock,
  createSurvey: createSurvey as unknown as Mock,
  createSurveyFromFlow: createSurveyFromFlow as unknown as Mock,
  createSession: createSession as unknown as Mock,
  callMetaApi: callMetaApi as unknown as Mock,
  deleteFlowInDb: deleteFlowInDb as unknown as Mock,
  deleteFlowInWa: deleteFlowInWa as unknown as Mock,
  deleteSession: deleteSession as unknown as Mock,
  deleteSurveyById: deleteSurveyById as unknown as Mock,
  deprecateFlowInWa: deprecateFlowInWa as unknown as Mock,
  getFlowFromDb: getFlowFromDb as unknown as Mock,
  getFlowFromWa: getFlowFromWa as unknown as Mock,
  getFlowJsonFromWa: getFlowJsonFromWa as unknown as Mock,
  getFlowsFromDb: getFlowsFromDb as unknown as Mock,
  getFlowsFromWa: getFlowsFromWa as unknown as Mock,
  getFlowWithSurveyTeamMapIds: getFlowWithSurveyTeamMapIds as unknown as Mock,
  getGraphApiErrorMessage: getGraphApiErrorMessage as unknown as Mock,
  getSession: getSession as unknown as Mock,
  getWaSettings: getWaSettings as unknown as Mock,
  publishFlowInWa: publishFlowInWa as unknown as Mock,
  sendFlow: sendFlow as unknown as Mock,
  syncLocalFlowToWhatsapp: syncLocalFlowToWhatsapp as unknown as Mock,
  updateFlowIdAndStatusInDb: updateFlowIdAndStatusInDb as unknown as Mock,
  updateFlowInDb: updateFlowInDb as unknown as Mock,
  updateFlowMetaDataInWa: updateFlowMetaDataInWa as unknown as Mock,
  updateMonthlyStat: updateMonthlyStat as unknown as Mock,
  validateSession: validateSession as unknown as Mock,
};

const ORG_A = "org-a";
const ORG_B = "org-b";
const DB_FLOW_ID = "dbflow-1";

/** A stored flow row of the shape the handlers read. */
function flowRow(overrides: Record<string, unknown> = {}): any {
  return {
    dbFlowId: DB_FLOW_ID,
    flowId: "wa-flow-1",
    orgId: ORG_A,
    surveyId: "survey-1",
    name: "Feedback",
    status: WaFlowStatus.DRAFT,
    logicJumps: {},
    survey: { questions: [] },
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG_A, userId: "user-1" },
    userId: "user-1",
    params: { dbFlowId: DB_FLOW_ID },
    body: {},
    query: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
  };
  return rep;
}

beforeEach(() => {
  // clearAllMocks keeps implementations, so every mock a test overrides with a
  // rejection has to be handed a fresh resolution here.
  vi.clearAllMocks();
  for (const mock of [
    m.createSession,
    m.deleteFlowInDb,
    m.deleteFlowInWa,
    m.deleteSession,
    m.deleteSurveyById,
    m.deprecateFlowInWa,
    m.getFlowJsonFromWa,
    m.publishFlowInWa,
    m.syncLocalFlowToWhatsapp,
    m.updateFlowMetaDataInWa,
    m.updateMonthlyStat,
  ]) {
    mock.mockResolvedValue(undefined);
  }
  m.getFlowFromDb.mockResolvedValue(flowRow());
  m.updateFlowInDb.mockResolvedValue(flowRow());
  m.getWaSettings.mockResolvedValue({ accessToken: "token-abc", wabaId: "waba-1" });
  m.callMetaApi.mockResolvedValue({ data: { success: true } });
  m.getFlowFromWa.mockResolvedValue({ categories: ["SURVEY"], name: "Feedback", status: "DRAFT" });
  m.cloneFlowInWa.mockResolvedValue({ id: "wa-flow-2" });
  m.createFlowInWa.mockResolvedValue({ id: "wa-flow-1" });
  m.createSurvey.mockResolvedValue({ id: "survey-1" });
  m.createSurveyFromFlow.mockResolvedValue({ survey: { id: "survey-1" }, flowMap: {} });
  m.createFlowCopyInDb.mockResolvedValue({ dbFlowId: DB_FLOW_ID });
  m.cloneFlow.mockResolvedValue({ id: "survey-2" });
  m.sendFlow.mockResolvedValue(true);
  m.getFlowWithSurveyTeamMapIds.mockResolvedValue({
    survey: { languages: ["en"], teams: [{ id: "stm-1", teamId: "team-1" }] },
  });
  m.getSession.mockResolvedValue({ surveyTeamMapId: "stm-1" });
  m.validateSession.mockReturnValue(true);
  process.env.API_URL = "https://api.example.com";
});

describe("getFlowsHandler", () => {
  test("lists the flows Meta holds when asked for the WhatsApp source", async () => {
    m.getFlowsFromWa.mockResolvedValue([{ id: "wa-flow-1" }]);
    const rep = reply();

    await getFlowsHandler(request({ query: { source: "wa" } }), rep);

    expect(rep.send).toHaveBeenCalledWith([{ id: "wa-flow-1" }]);
  });

  test("lists our own flows when asked for the database source", async () => {
    m.getFlowsFromDb.mockResolvedValue([{ dbFlowId: DB_FLOW_ID }]);
    const rep = reply();

    await getFlowsHandler(request({ query: { source: "db" } }), rep);

    expect(m.getFlowsFromDb).toHaveBeenCalledWith(ORG_A, "user-1");
    expect(rep.send).toHaveBeenCalledWith([{ dbFlowId: DB_FLOW_ID }]);
  });

  // NOTE: pins current behaviour. Neither branch matches, so the handler resolves
  // without ever touching the reply. Unreachable through the route today because
  // the querystring schema is an enum defaulting to "wa". See issues.txt 11.13.
  test("answers nothing at all for a source it does not recognise", async () => {
    const rep = reply();

    await getFlowsHandler(request({ query: { source: "somewhere-else" } }), rep);

    expect(rep.send).not.toHaveBeenCalled();
  });
});

describe("getFlowHandler", () => {
  test("returns the flow that was asked for", async () => {
    const rep = reply();

    await getFlowHandler(request({ params: { waFlowId: DB_FLOW_ID } }), rep);

    expect(rep.send).toHaveBeenCalledWith(flowRow());
  });

  // NOTE: pins current behaviour. getFlowFromDb takes no org and the handler never
  // compares the result's orgId to req.user.orgId, so any authenticated user can
  // read any flow — including its full json, map and logic jumps — given its id.
  // See issues.txt 11.1.
  test("returns a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ orgId: ORG_B }));
    const rep = reply();

    await getFlowHandler(request({ params: { waFlowId: DB_FLOW_ID } }), rep);

    expect(rep.send.mock.calls[0][0].orgId).toBe(ORG_B);
  });
});

describe("getFlowMetricsHandler", () => {
  test("asks Meta for the flow's lifetime endpoint request count", async () => {
    m.callMetaApi.mockResolvedValue({ data: { metric: {} } });
    const rep = reply();

    await getFlowMetricsHandler(request({ params: { waFlowId: "wa-flow-1" } }), rep);

    expect(m.callMetaApi.mock.calls[0][0]).toContain("ENDPOINT_REQUEST_COUNT");
    expect(rep.send).toHaveBeenCalledWith({ metric: {} });
  });

  test("answers 500 when Meta cannot be reached", async () => {
    m.callMetaApi.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await getFlowMetricsHandler(request({ params: { waFlowId: "wa-flow-1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("updateFlowHandler", () => {
  test("saves the edit and marks the flow as having unsaved changes", async () => {
    const rep = reply();

    await updateFlowHandler(request({ body: { name: "Renamed" } }), rep);

    expect(m.updateFlowInDb).toHaveBeenCalledWith(ORG_A, DB_FLOW_ID, {
      name: "Renamed",
      pendingSave: true,
    });
    expect(rep.status).toHaveBeenCalledWith(201);
  });

  test("registers the endpoint uri the first time the flow gains logic jumps", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ logicJumps: {} }));
    m.updateFlowInDb.mockResolvedValue(flowRow({ logicJumps: { S1: [{}] } }));

    await updateFlowHandler(request({ body: { logicJumps: { S1: [{}] } } }), reply());

    expect(m.updateFlowMetaDataInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1", {
      endpoint_uri: `https://api.example.com/api/wa/endpoint/${ORG_A}/${DB_FLOW_ID}`,
    });
  });

  test("leaves the endpoint uri alone when the flow already had logic jumps", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ logicJumps: { S1: [{}] } }));
    m.updateFlowInDb.mockResolvedValue(flowRow({ logicJumps: { S1: [{}, {}] } }));

    await updateFlowHandler(request({ body: {} }), reply());

    expect(m.updateFlowMetaDataInWa).not.toHaveBeenCalled();
  });

  test("registers the endpoint uri when a date question gains a WhatsApp app action", async () => {
    m.updateFlowInDb.mockResolvedValue(
      flowRow({
        survey: {
          questions: [{ type: QuestionType.Date, onSelectAction: "slots", waAppName: "amelia" }],
        },
      }),
    );

    await updateFlowHandler(request({ body: {} }), reply());

    expect(m.updateFlowMetaDataInWa).toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The org is handed to updateFlowInDb, which
  // ignores it (see flow.service.test.ts), and nothing here checks that the flow
  // being edited belongs to req.user.orgId. See issues.txt 11.1.
  test("edits a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ orgId: ORG_B }));
    const rep = reply();

    await updateFlowHandler(request({ body: { name: "Renamed by a stranger" } }), rep);

    expect(m.updateFlowInDb).toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(201);
  });

  // NOTE: pins current behaviour. The handler has no try/catch at all, unlike its
  // neighbours in the same file, so a service failure escapes to Fastify's default
  // error handler instead of becoming a controlled reply. Same family as
  // issues.txt 3.5. See issues.txt 11.4.
  test("lets a save failure propagate", async () => {
    m.updateFlowInDb.mockRejectedValue(new Error("db down"));

    await expect(updateFlowHandler(request({ body: {} }), reply())).rejects.toThrow("db down");
  });

  test("throws a descriptive error rather than a raw TypeError for a flow that does not exist", async () => {
    m.getFlowFromDb.mockResolvedValue(null);

    await expect(updateFlowHandler(request({ body: {} }), reply())).rejects.toThrow(
      "Flow not found",
    );
  });
});

describe("saveFlowJsonToWhatsappHandler", () => {
  test("answers 200 once the flow has been pushed to WhatsApp", async () => {
    const rep = reply();

    await saveFlowJsonToWhatsappHandler(request(), rep);

    expect(m.syncLocalFlowToWhatsapp).toHaveBeenCalledWith(ORG_A, DB_FLOW_ID);
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("answers 500 with the reason when the push fails", async () => {
    m.syncLocalFlowToWhatsapp.mockRejectedValue(new Error("meta rejected the asset"));
    const rep = reply();

    await saveFlowJsonToWhatsappHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(rep.send).toHaveBeenCalledWith("meta rejected the asset");
  });
});

describe("updateFlowMetaDataHandler", () => {
  test("records the change locally and then at Meta", async () => {
    const rep = reply();

    await updateFlowMetaDataHandler(request({ body: { name: "Renamed" } }), rep);

    expect(m.updateFlowInDb).toHaveBeenCalledWith(ORG_A, DB_FLOW_ID, { name: "Renamed" });
    expect(m.callMetaApi.mock.calls[0].slice(0, 2)).toEqual(["/wa-flow-1", "POST"]);
    expect(rep.status).toHaveBeenCalledWith(204);
  });

  // NOTE: pins current behaviour. Our copy is written first, so when Meta refuses,
  // the local row already carries the new name while WhatsApp still has the old
  // one — and the 500 gives the caller no way to tell which half took.
  // See issues.txt 11.14.
  test("has already renamed our copy when Meta refuses the rename", async () => {
    m.callMetaApi.mockResolvedValue({ data: { success: false } });
    const rep = reply();

    await updateFlowMetaDataHandler(request({ body: { name: "Renamed" } }), rep);

    expect(m.updateFlowInDb).toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour. `res.status(500).send(error)` hands Fastify an
  // Error, whose own properties are non-enumerable, so the client receives {}.
  // See issues.txt 11.14.
  test("sends the failure as a body that carries no information", async () => {
    m.callMetaApi.mockResolvedValue({ data: { success: false } });
    const rep = reply();

    await updateFlowMetaDataHandler(request({ body: {} }), rep);

    expect(JSON.stringify(rep.send.mock.calls[0][0])).toBe("{}");
  });
});

describe("cloneFlowHandler", () => {
  test("clones at Meta and then clones the survey and flow locally", async () => {
    const rep = reply();

    await cloneFlowHandler(request({ body: { teamId: "team-1" } }), rep);

    expect(m.cloneFlowInWa.mock.calls[0][1].clone_flow_id).toBe("wa-flow-1");
    expect(m.cloneFlow).toHaveBeenCalledWith(flowRow(), "wa-flow-2", "user-1", "team-1");
    expect(rep.status).toHaveBeenCalledWith(201);
  });

  test("reports the reason when the flow's survey is gone", async () => {
    m.cloneFlow.mockResolvedValue("Survey not found to duplicate");
    const rep = reply();

    await cloneFlowHandler(request({ body: { teamId: "team-1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith({ message: "Survey not found to duplicate" });
  });

  // NOTE: pins current behaviour. The Meta clone happens before anything checks
  // that the local survey can be duplicated, so the 400 path leaves a flow behind
  // in the org's WhatsApp account with nothing pointing at it. Same shape as
  // issues.txt 9.6. See issues.txt 11.14.
  test("has already created the Meta clone when the local clone is refused", async () => {
    m.cloneFlow.mockResolvedValue("Survey not found to duplicate");

    await cloneFlowHandler(request({ body: { teamId: "team-1" } }), reply());

    expect(m.cloneFlowInWa).toHaveBeenCalled();
  });
});

describe("deleteFlowHandler", () => {
  test("removes the survey, which takes the flow with it", async () => {
    const rep = reply();

    await deleteFlowHandler(request(), rep);

    expect(m.deleteFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1");
    expect(m.deleteSurveyById).toHaveBeenCalledWith("survey-1");
    expect(m.deleteFlowInDb).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(204);
  });

  test("removes the flow directly when it has no survey behind it", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ surveyId: null }));

    await deleteFlowHandler(request(), reply());

    expect(m.deleteFlowInDb).toHaveBeenCalledWith(DB_FLOW_ID);
  });

  test("still deletes locally when Meta refuses to delete its copy", async () => {
    m.deleteFlowInWa.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await deleteFlowHandler(request(), rep);

    expect(m.deleteSurveyById).toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(204);
  });

  test("skips the Meta call for a flow that was never created there", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ flowId: null }));

    await deleteFlowHandler(request(), reply());

    expect(m.deleteFlowInWa).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The refusal is a bare `throw` outside any
  // try/catch, so the caller gets Fastify's default 500 rather than a 409 or 400
  // carrying the explanation. Same family as issues.txt 3.5. See issues.txt 11.4.
  test("throws rather than refusing politely for a published flow", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));

    await expect(deleteFlowHandler(request(), reply())).rejects.toThrow(
      "Cannot delete a published flow. Deprecate it instead.",
    );
  });

  // NOTE: pins current behaviour. Nothing compares flow.orgId to req.user.orgId,
  // so a draft flow belonging to another org is deleted on request — along with
  // its survey and every response attached to it. See issues.txt 11.1.
  test("deletes a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ orgId: ORG_B }));
    const rep = reply();

    await deleteFlowHandler(request(), rep);

    expect(m.deleteSurveyById).toHaveBeenCalledWith("survey-1");
    expect(rep.status).toHaveBeenCalledWith(204);
  });
});

describe("deprecateFlowHandler", () => {
  test("deprecates at Meta and removes the survey behind it", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));

    await deprecateFlowHandler(request(), reply());

    expect(m.deprecateFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1");
    expect(m.deleteSurveyById).toHaveBeenCalledWith("survey-1");
  });

  test("throws rather than refusing politely for a draft flow", async () => {
    await expect(deprecateFlowHandler(request(), reply())).rejects.toThrow(
      "Cannot deprecate a draft flow. Delete it instead.",
    );
  });

  test("still removes the survey when Meta refuses to deprecate", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));
    m.deprecateFlowInWa.mockRejectedValue(new Error("graph is down"));

    await deprecateFlowHandler(request(), reply());

    expect(m.deleteSurveyById).toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The handler never touches the reply, so Fastify
  // falls back to sending an empty 200 rather than the 204 its sibling
  // deleteFlowHandler sends for the same kind of work. See issues.txt 11.13.
  test("sends no status of its own", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));
    const rep = reply();

    await deprecateFlowHandler(request(), rep);

    expect(rep.status).not.toHaveBeenCalled();
    expect(rep.code).not.toHaveBeenCalled();
    expect(rep.send).not.toHaveBeenCalled();
  });
});

describe("publishFlowHandler", () => {
  test("publishes at Meta and then records the flow as published", async () => {
    await publishFlowHandler(request(), reply());

    expect(m.publishFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1");
    expect(m.updateFlowInDb).toHaveBeenCalledWith(ORG_A, DB_FLOW_ID, {
      status: WaFlowStatus.PUBLISHED,
    });
  });

  test("does not record the flow as published when Meta refuses", async () => {
    m.publishFlowInWa.mockRejectedValue(new Error("validation errors"));

    await expect(publishFlowHandler(request(), reply())).rejects.toThrow("validation errors");
    expect(m.updateFlowInDb).not.toHaveBeenCalled();
  });

  // NOTE: same as deprecateFlowHandler above. See issues.txt 11.13.
  test("sends no status of its own", async () => {
    const rep = reply();

    await publishFlowHandler(request(), rep);

    expect(rep.send).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. Another org's flow is published on request, and
  // updateFlowInDb then flips its survey to isPublished. See issues.txt 11.1.
  test("publishes a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ orgId: ORG_B }));

    await publishFlowHandler(request(), reply());

    expect(m.publishFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1");
  });
});

describe("sendFlowHandler", () => {
  function sendRequest(body: Record<string, unknown> = {}) {
    return request({
      body: { phone: "15550001", teamId: "team-1", flowId: "wa-flow-1", ...body },
    });
  }

  test("sends the flow and answers 201", async () => {
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(m.sendFlow).toHaveBeenCalledWith({
      orgId: ORG_A,
      dbFlowId: DB_FLOW_ID,
      phone: "15550001",
      userId: "user-1",
      whatsappSettingsPhoneId: undefined,
    });
    expect(rep.status).toHaveBeenCalledWith(201);
  });

  test("keeps an existing session that already belongs to this survey and team", async () => {
    await sendFlowHandler(sendRequest(), reply());

    expect(m.createSession).not.toHaveBeenCalled();
    expect(m.deleteSession).not.toHaveBeenCalled();
  });

  test("starts a fresh session when the old one has expired", async () => {
    m.validateSession.mockReturnValue(false);

    await sendFlowHandler(sendRequest(), reply());

    expect(m.deleteSession).toHaveBeenCalledWith(ORG_A, "15550001");
    expect(m.createSession).toHaveBeenCalledWith({
      phone: "15550001",
      orgId: ORG_A,
      surveyTeamMapId: "stm-1",
      language: "en",
    });
  });

  test("starts a fresh session when the old one belongs to a different survey", async () => {
    m.getSession.mockResolvedValue({ surveyTeamMapId: "stm-other" });

    await sendFlowHandler(sendRequest(), reply());

    expect(m.createSession).toHaveBeenCalled();
  });

  test("answers 500 when setting the session up fails", async () => {
    m.getSession.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour. sendFlow catches its own failures and returns
  // false (see flow.service.ts:446-449); the handler discards that boolean and
  // answers 201 regardless. The user is told the flow went out when it did not.
  // Same family as issues.txt 3.1. See issues.txt 11.4.
  test("answers 201 even when the flow was never sent", async () => {
    m.sendFlow.mockResolvedValue(false);
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(rep.status).toHaveBeenCalledWith(201);
    expect(rep.status).not.toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour. The session is set up from body.flowId (the Meta
  // flow id) while the flow actually sent comes from params.dbFlowId. Nothing
  // checks the two name the same flow, so a mismatched pair opens a session against
  // one survey and sends a different flow. See issues.txt 11.15.
  test("takes the session's flow and the sent flow from two different identifiers", async () => {
    await sendFlowHandler(sendRequest({ flowId: "wa-flow-for-a-different-survey" }), reply());

    expect(m.getFlowWithSurveyTeamMapIds).toHaveBeenCalledWith(
      ORG_A,
      "wa-flow-for-a-different-survey",
    );
    expect(m.sendFlow.mock.calls[0][0].dbFlowId).toBe(DB_FLOW_ID);
  });

  // NOTE: pins current behaviour. updateMonthlyStat is called without await, so a
  // failure counting the message becomes an unhandled promise rejection instead of
  // a failed request. Same family as issues.txt 3.9. See issues.txt 11.15.
  test("counts the message without waiting for the count to be recorded", async () => {
    // A stat call that never settles on its own. If the handler awaited it, this
    // test would hang rather than reach its assertions.
    let releaseStat: () => void;
    m.updateMonthlyStat.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseStat = resolve;
      }),
    );
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(m.updateMonthlyStat).toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(201);
    releaseStat!();
  });
});

describe("createFlowHandler", () => {
  const body = { name: "Feedback", categories: ["SURVEY"], teamIds: ["team-1"] };

  test("creates the flow at Meta, then the survey, then our own copy", async () => {
    const rep = reply();

    await createFlowHandler(request({ body }), rep);

    expect(m.createFlowInWa).toHaveBeenCalledWith(ORG_A, {
      name: "Feedback",
      categories: ["SURVEY"],
    });
    expect(m.createFlowCopyInDb.mock.calls[0][0]).toMatchObject({
      orgId: ORG_A,
      flowId: "wa-flow-1",
      surveyId: "survey-1",
      status: WaFlowStatus.DRAFT,
    });
    expect(rep.send).toHaveBeenCalledWith(DB_FLOW_ID);
  });

  test("starts a flow with no json as an empty version 7.2 flow", async () => {
    await createFlowHandler(request({ body }), reply());

    expect(m.createFlowCopyInDb.mock.calls[0][0].json).toEqual({ version: "7.2", screens: [] });
  });

  test("reports Meta's own words when Meta refuses to create the flow", async () => {
    m.createFlowInWa.mockRejectedValue(new GraphApiError("boom" as any));
    m.getGraphApiErrorMessage.mockReturnValue("Flow name already taken");
    const rep = reply();

    await createFlowHandler(request({ body }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith("Flow name already taken");
  });

  // NOTE: pins current behaviour. Any non-Graph failure is flattened to the string
  // "Creating flow Error" and answered as a 400, so a database outage is reported
  // to the user as a bad request with nothing to act on. See issues.txt 11.14.
  test("reports a database failure as a bad request with a generic message", async () => {
    m.createFlowCopyInDb.mockRejectedValue(new Error("connection terminated"));
    const rep = reply();

    await createFlowHandler(request({ body }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith("Creating flow Error");
  });

  // NOTE: pins current behaviour. The Meta flow is created first and nothing rolls
  // it back, so every failure after that point leaves a flow in the org's WhatsApp
  // account that nothing in our database points at. Same shape as issues.txt 9.6.
  // See issues.txt 11.14.
  test("leaves the Meta flow behind when the local half fails", async () => {
    m.createSurvey.mockRejectedValue(new Error("survey limit reached"));

    await createFlowHandler(request({ body }), reply());

    expect(m.createFlowInWa).toHaveBeenCalled();
    expect(m.createFlowCopyInDb).not.toHaveBeenCalled();
  });
});

describe("importFlowsHandler", () => {
  const body = { waFlowIds: ["wa-flow-1", "wa-flow-2"], mapData: {}, teamIds: ["team-1"] };

  test("imports each flow named, building a survey for it", async () => {
    m.getFlowJsonFromWa.mockResolvedValue({ screens: [] });

    await importFlowsHandler(request({ body }), reply());

    expect(m.getFlowFromWa).toHaveBeenCalledTimes(2);
    expect(m.createFlowCopyInDb).toHaveBeenCalledTimes(2);
  });

  // NOTE: pins current behaviour, and the source already says so — "TODO: convert
  // to prisma transaction". A failure on the second flow leaves the first one
  // imported, and the caller has no way to tell which. See issues.txt 11.14.
  test("keeps the flows it already imported when a later one fails", async () => {
    m.getFlowJsonFromWa
      .mockResolvedValueOnce({ screens: [] })
      .mockRejectedValueOnce(new Error("asset download failed"));

    await expect(importFlowsHandler(request({ body }), reply())).rejects.toThrow(
      "asset download failed",
    );

    expect(m.createFlowCopyInDb).toHaveBeenCalledTimes(1);
  });
});
