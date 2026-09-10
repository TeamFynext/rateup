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
  getFlowFromDbByFlowId: vi.fn(),
  getFlowFromWa: vi.fn(),
  getFlowJsonFromWa: vi.fn(),
  getFlowPreview: vi.fn(),
  getFlowsFromDb: vi.fn(),
  getFlowsFromWa: vi.fn(),
  getFlowWithSurveyTeamMapIdsWithDbFlowId: vi.fn(),
  getUnsyncedFlows: vi.fn(),
  getWaSettingsForFlow: vi.fn(),
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
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
// Flow templates look up the org's loyalty programme for the suggestion / business name.
vi.mock("../../../utils/prisma.js", () => ({
  default: { loyaltyProgram: { findUnique: vi.fn(async () => null) } },
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
  getFlowFromDbByFlowId,
  getFlowFromWa,
  getFlowJsonFromWa,
  getFlowsFromDb,
  getFlowsFromWa,
  getFlowWithSurveyTeamMapIdsWithDbFlowId,
  getWaSettingsForFlow,
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
  callMetaApi: callMetaApi as unknown as Mock,
  deleteFlowInDb: deleteFlowInDb as unknown as Mock,
  deleteFlowInWa: deleteFlowInWa as unknown as Mock,
  deleteSurveyById: deleteSurveyById as unknown as Mock,
  deprecateFlowInWa: deprecateFlowInWa as unknown as Mock,
  getFlowFromDb: getFlowFromDb as unknown as Mock,
  getFlowFromDbByFlowId: getFlowFromDbByFlowId as unknown as Mock,
  getFlowFromWa: getFlowFromWa as unknown as Mock,
  getFlowJsonFromWa: getFlowJsonFromWa as unknown as Mock,
  getFlowsFromDb: getFlowsFromDb as unknown as Mock,
  getFlowsFromWa: getFlowsFromWa as unknown as Mock,
  getFlowWithSurveyTeamMapIds: getFlowWithSurveyTeamMapIdsWithDbFlowId as unknown as Mock,
  getGraphApiErrorMessage: getGraphApiErrorMessage as unknown as Mock,
  getWaSettings: getWaSettings as unknown as Mock,
  getWaSettingsForFlow: getWaSettingsForFlow as unknown as Mock,
  publishFlowInWa: publishFlowInWa as unknown as Mock,
  sendFlow: sendFlow as unknown as Mock,
  syncLocalFlowToWhatsapp: syncLocalFlowToWhatsapp as unknown as Mock,
  updateFlowIdAndStatusInDb: updateFlowIdAndStatusInDb as unknown as Mock,
  updateFlowInDb: updateFlowInDb as unknown as Mock,
  updateFlowMetaDataInWa: updateFlowMetaDataInWa as unknown as Mock,
  updateMonthlyStat: updateMonthlyStat as unknown as Mock,
};

const ORG_A = "org-a";
const DB_FLOW_ID = "dbflow-1";
const WA_SETTINGS_ID = "wa-settings-1";
const PHONE_ID = "phone-1";

/** A stored flow row of the shape the handlers read. */
function flowRow(overrides: Record<string, unknown> = {}): any {
  return {
    dbFlowId: DB_FLOW_ID,
    flowId: "wa-flow-1",
    orgId: ORG_A,
    surveyId: "survey-1",
    name: "Feedback",
    status: WaFlowStatus.DRAFT,
    whatsappSettingsId: WA_SETTINGS_ID,
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
    m.deleteFlowInDb,
    m.deleteFlowInWa,
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
  m.getFlowFromDbByFlowId.mockResolvedValue(flowRow());
  m.updateFlowInDb.mockResolvedValue(flowRow());
  m.getWaSettings.mockResolvedValue({
    id: WA_SETTINGS_ID,
    phoneId: PHONE_ID,
    accessToken: "token-abc",
    wabaId: "waba-1",
  });
  m.getWaSettingsForFlow.mockResolvedValue({
    id: WA_SETTINGS_ID,
    phoneId: PHONE_ID,
    accessToken: "token-abc",
    wabaId: "waba-1",
  });
  m.callMetaApi.mockResolvedValue({ data: { success: true } });
  m.getFlowFromWa.mockResolvedValue({ categories: ["SURVEY"], name: "Feedback", status: "DRAFT" });
  m.cloneFlowInWa.mockResolvedValue({ id: "wa-flow-2", whatsappSettingsId: WA_SETTINGS_ID });
  m.createFlowInWa.mockResolvedValue({ id: "wa-flow-1", whatsappSettingsId: WA_SETTINGS_ID });
  m.createSurvey.mockResolvedValue({ id: "survey-1" });
  m.createSurveyFromFlow.mockResolvedValue({ survey: { id: "survey-1" }, flowMap: {} });
  m.createFlowCopyInDb.mockResolvedValue({ dbFlowId: DB_FLOW_ID });
  m.cloneFlow.mockResolvedValue({ id: "survey-2" });
  m.sendFlow.mockResolvedValue(true);
  m.getFlowWithSurveyTeamMapIds.mockResolvedValue({
    survey: { languages: ["en"], teams: [{ id: "stm-1", teamId: "team-1" }] },
  });
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

    expect(m.getFlowsFromDb).toHaveBeenCalledWith(ORG_A, "user-1", undefined);
    expect(rep.send).toHaveBeenCalledWith([{ dbFlowId: DB_FLOW_ID }]);
  });

  test("narrows the list to the flows on the number that was asked for", async () => {
    m.getWaSettings.mockResolvedValue({ id: "wa-settings-2", wabaId: "waba-2" });
    m.getFlowsFromDb.mockResolvedValue([]);

    await getFlowsHandler(
      request({ query: { source: "db", whatsappSettingsPhoneId: PHONE_ID } }),
      reply(),
    );

    expect(m.getWaSettings).toHaveBeenCalledWith(ORG_A, PHONE_ID);
    expect(m.getFlowsFromDb).toHaveBeenCalledWith(ORG_A, "user-1", "wa-settings-2");
  });

  // Silently falling back to the org default would answer with another number's
  // flows, which is the mix-up this filter exists to prevent.
  test("answers 404 for a number the org does not have", async () => {
    m.getWaSettings.mockResolvedValue(null);
    const rep = reply();

    await getFlowsHandler(
      request({ query: { source: "db", whatsappSettingsPhoneId: "phone-elsewhere" } }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(m.getFlowsFromDb).not.toHaveBeenCalled();
  });

  test("refuses a source it does not recognise", async () => {
    const rep = reply();

    await getFlowsHandler(request({ query: { source: "somewhere-else" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(rep.send.mock.calls[0][0].message).toContain("somewhere-else");
  });
});

describe("getFlowHandler", () => {
  test("returns the flow that was asked for", async () => {
    const rep = reply();

    await getFlowHandler(request({ params: { waFlowId: DB_FLOW_ID } }), rep);

    expect(rep.send).toHaveBeenCalledWith(flowRow());
  });

  test("looks the flow up scoped to the caller's org", async () => {
    await getFlowHandler(request({ params: { waFlowId: DB_FLOW_ID } }), reply());

    expect(m.getFlowFromDb).toHaveBeenCalledWith(DB_FLOW_ID, ORG_A);
  });

  // 404 rather than 403: a flow owned by another org is indistinguishable from
  // one that never existed, so this cannot be used to probe for flow ids.
  test("answers 404 for a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(null);
    const rep = reply();

    await getFlowHandler(request({ params: { waFlowId: DB_FLOW_ID } }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
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

    expect(m.updateFlowMetaDataInWa).toHaveBeenCalledWith(
      ORG_A,
      "wa-flow-1",
      {
        endpoint_uri: `https://api.example.com/api/wa/endpoint/${ORG_A}/${DB_FLOW_ID}`,
      },
      WA_SETTINGS_ID,
    );
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

  test("refuses to edit a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(null);
    const rep = reply();

    await updateFlowHandler(request({ body: { name: "Renamed by a stranger" } }), rep);

    expect(m.getFlowFromDb).toHaveBeenCalledWith(DB_FLOW_ID, ORG_A);
    expect(m.updateFlowInDb).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(404);
  });

  test("answers 500 with the reason when the save fails", async () => {
    m.updateFlowInDb.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await updateFlowHandler(request({ body: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(rep.send.mock.calls[0][0]).toEqual({ message: "db down" });
  });

  test("answers 404 for a flow that does not exist", async () => {
    m.getFlowFromDb.mockResolvedValue(null);
    const rep = reply();

    await updateFlowHandler(request({ body: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
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

  test("leaves our copy alone when Meta refuses the rename", async () => {
    m.callMetaApi.mockResolvedValue({ data: { success: false } });
    const rep = reply();

    await updateFlowMetaDataHandler(request({ body: { name: "Renamed" } }), rep);

    expect(m.updateFlowInDb).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(500);
  });

  test("sends the reason for the failure, not an empty body", async () => {
    m.callMetaApi.mockResolvedValue({ data: { success: false } });
    const rep = reply();

    await updateFlowMetaDataHandler(request({ body: {} }), rep);

    expect(rep.send.mock.calls[0][0]).toEqual({ message: "Flow Not updated in whatsapp" });
  });

  test("answers 404 for a flow belonging to another org", async () => {
    m.getFlowFromDb.mockResolvedValue(null);
    const rep = reply();

    await updateFlowMetaDataHandler(request({ body: { name: "Renamed" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(m.callMetaApi).not.toHaveBeenCalled();
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

  test("removes the Meta clone again when the local clone is refused", async () => {
    m.cloneFlow.mockResolvedValue("Survey not found to duplicate");

    await cloneFlowHandler(request({ body: { teamId: "team-1" } }), reply());

    expect(m.cloneFlowInWa).toHaveBeenCalled();
    expect(m.deleteFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-2", WA_SETTINGS_ID);
  });

  // The rollback is best-effort: the caller is already being told why the clone
  // failed, and an orphan is better than replacing that with a cleanup error.
  test("still reports the original refusal when the rollback itself fails", async () => {
    m.cloneFlow.mockResolvedValue("Survey not found to duplicate");
    m.deleteFlowInWa.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await cloneFlowHandler(request({ body: { teamId: "team-1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith({ message: "Survey not found to duplicate" });
  });
});

describe("deleteFlowHandler", () => {
  test("removes the survey, which takes the flow with it", async () => {
    const rep = reply();

    await deleteFlowHandler(request(), rep);

    expect(m.deleteFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1", WA_SETTINGS_ID);
    expect(m.deleteSurveyById).toHaveBeenCalledWith("survey-1");
    expect(m.deleteFlowInDb).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(204);
  });

  test("removes the flow directly when it has no survey behind it", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ surveyId: null }));

    await deleteFlowHandler(request(), reply());

    expect(m.deleteFlowInDb).toHaveBeenCalledWith(DB_FLOW_ID, ORG_A);
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

  test("refuses a published flow with a 409 and the reason", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));
    const rep = reply();

    await deleteFlowHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(409);
    expect(rep.send.mock.calls[0][0].message).toBe(
      "Cannot delete a published flow. Deprecate it instead.",
    );
    expect(m.deleteSurveyById).not.toHaveBeenCalled();
  });

  test("answers 404 for a flow belonging to another org, deleting nothing", async () => {
    m.getFlowFromDb.mockResolvedValue(null);
    const rep = reply();

    await deleteFlowHandler(request(), rep);

    expect(m.getFlowFromDb).toHaveBeenCalledWith(DB_FLOW_ID, ORG_A);
    expect(m.deleteSurveyById).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(404);
  });
});

describe("deprecateFlowHandler", () => {
  test("deprecates at Meta and removes the survey behind it", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));

    await deprecateFlowHandler(request(), reply());

    expect(m.deprecateFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1", WA_SETTINGS_ID);
    expect(m.deleteSurveyById).toHaveBeenCalledWith("survey-1");
  });

  test("refuses a draft flow with a 409 and the reason", async () => {
    const rep = reply();

    await deprecateFlowHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(409);
    expect(rep.send.mock.calls[0][0].message).toBe(
      "Cannot deprecate a draft flow. Delete it instead.",
    );
  });

  test("still removes the survey when Meta refuses to deprecate", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));
    m.deprecateFlowInWa.mockRejectedValue(new Error("graph is down"));

    await deprecateFlowHandler(request(), reply());

    expect(m.deleteSurveyById).toHaveBeenCalled();
  });

  test("answers 204, as deleteFlowHandler does", async () => {
    m.getFlowFromDb.mockResolvedValue(flowRow({ status: WaFlowStatus.PUBLISHED }));
    const rep = reply();

    await deprecateFlowHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(204);
  });
});

describe("publishFlowHandler", () => {
  test("publishes at Meta and then records the flow as published", async () => {
    await publishFlowHandler(request(), reply());

    expect(m.publishFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1", WA_SETTINGS_ID);
    expect(m.updateFlowInDb).toHaveBeenCalledWith(ORG_A, DB_FLOW_ID, {
      status: WaFlowStatus.PUBLISHED,
    });
  });

  test("does not record the flow as published when Meta refuses", async () => {
    m.publishFlowInWa.mockRejectedValue(new Error("validation errors"));

    await expect(publishFlowHandler(request(), reply())).rejects.toThrow("validation errors");
    expect(m.updateFlowInDb).not.toHaveBeenCalled();
  });

  test("answers 204", async () => {
    const rep = reply();

    await publishFlowHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(204);
  });

  test("answers 404 for a flow belonging to another org, publishing nothing", async () => {
    m.getFlowFromDb.mockResolvedValue(null);
    const rep = reply();

    await publishFlowHandler(request(), rep);

    expect(m.publishFlowInWa).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(404);
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
      // Carried into the flow token so the reply can be attributed.
      context: { surveyTeamMapId: "stm-1", language: "en" },
    });
    expect(rep.status).toHaveBeenCalledWith(201);
  });

  test("answers 500 when the flow lookup fails", async () => {
    m.getFlowWithSurveyTeamMapIds.mockRejectedValue(new Error("db is down"));
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });

  test("reports a failure rather than 201 when the flow was never sent", async () => {
    m.sendFlow.mockResolvedValue(false);
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(rep.status).toHaveBeenCalledWith(502);
    expect(rep.status).not.toHaveBeenCalledWith(201);
  });

  test("takes the session and the sent flow from the same identifier", async () => {
    await sendFlowHandler(sendRequest({ flowId: "wa-flow-for-a-different-survey" }), reply());

    expect(m.getFlowWithSurveyTeamMapIds).toHaveBeenCalledWith(DB_FLOW_ID, ORG_A);
    expect(m.sendFlow.mock.calls[0][0].dbFlowId).toBe(DB_FLOW_ID);
  });

  test("answers 404 for a flow belonging to another org", async () => {
    m.getFlowWithSurveyTeamMapIds.mockResolvedValue(null);
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(m.sendFlow).not.toHaveBeenCalled();
  });

  test("waits for the message to be counted", async () => {
    m.updateMonthlyStat.mockRejectedValue(new Error("stats store is down"));
    const rep = reply();

    await sendFlowHandler(sendRequest(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(m.sendFlow).not.toHaveBeenCalled();
  });
});

describe("createFlowHandler", () => {
  const body = { name: "Feedback", categories: ["SURVEY"], teamIds: ["team-1"] };

  test("creates the flow at Meta, then the survey, then our own copy", async () => {
    const rep = reply();

    await createFlowHandler(request({ body }), rep);

    expect(m.createFlowInWa).toHaveBeenCalledWith(
      ORG_A,
      {
        name: "Feedback",
        categories: ["SURVEY"],
      },
      undefined,
    );
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

  test("stores the categories as given but sends Meta only its own", async () => {
    await createFlowHandler(
      request({ body: { ...body, categories: ["LOYALTY_FEEDBACK"], templateKey: "restaurant" } }),
      reply(),
    );

    // LOYALTY_FEEDBACK is ours; Meta would reject it, so it travels as SURVEY.
    expect(m.createFlowInWa.mock.calls[0][1]).toEqual({ name: "Feedback", categories: ["SURVEY"] });
    const stored = m.createFlowCopyInDb.mock.calls[0][0];
    expect(stored.categories).toEqual(["LOYALTY_FEEDBACK"]);
    // The template supplies the questions, including the rating that gates the review.
    const children = stored.json.screens[0].layout.children;
    expect(children.find((c: { name?: string }) => c.name === "overall_rating")).toMatchObject({
      metaType: "Rating",
      googleReview: { minRating: 4 },
    });
    expect(stored.templateMessage.cta).toBe("Share feedback");
  });

  test("refuses an unknown template before touching Meta", async () => {
    const rep = reply();

    await createFlowHandler(
      request({ body: { ...body, categories: ["LOYALTY_FEEDBACK"], templateKey: "nope" } }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(m.createFlowInWa).not.toHaveBeenCalled();
  });

  test("reports Meta's own words when Meta refuses to create the flow", async () => {
    m.createFlowInWa.mockRejectedValue(new GraphApiError("boom" as any));
    m.getGraphApiErrorMessage.mockReturnValue("Flow name already taken");
    const rep = reply();

    await createFlowHandler(request({ body }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith("Flow name already taken");
  });

  test("reports a database failure as our own, with the reason", async () => {
    m.createFlowCopyInDb.mockRejectedValue(new Error("connection terminated"));
    const rep = reply();

    await createFlowHandler(request({ body }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(rep.send).toHaveBeenCalledWith("connection terminated");
  });

  test("removes the Meta flow again when the local half fails", async () => {
    m.createSurvey.mockRejectedValue(new Error("survey limit reached"));

    await createFlowHandler(request({ body }), reply());

    expect(m.createFlowCopyInDb).not.toHaveBeenCalled();
    expect(m.deleteFlowInWa).toHaveBeenCalledWith(ORG_A, "wa-flow-1", WA_SETTINGS_ID);
  });

  test("creates the flow on the number the caller picked, and records it", async () => {
    m.getWaSettings.mockResolvedValue({ id: "wa-settings-2", wabaId: "waba-2" });
    m.createFlowInWa.mockResolvedValue({ id: "wa-flow-1", whatsappSettingsId: "wa-settings-2" });

    await createFlowHandler(
      request({ body: { ...body, whatsappSettingsPhoneId: PHONE_ID } }),
      reply(),
    );

    expect(m.createFlowInWa).toHaveBeenCalledWith(ORG_A, expect.anything(), "wa-settings-2");
    expect(m.createFlowCopyInDb.mock.calls[0][0]).toMatchObject({
      whatsappSettingsId: "wa-settings-2",
    });
  });

  test("answers 404 for a number the org does not have", async () => {
    m.getWaSettings.mockResolvedValue(null);
    const rep = reply();

    await createFlowHandler(
      request({ body: { ...body, whatsappSettingsPhoneId: "phone-elsewhere" } }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(m.createFlowInWa).not.toHaveBeenCalled();
  });

  test("has nothing to roll back when Meta refuses to create the flow", async () => {
    m.createFlowInWa.mockRejectedValue(new GraphApiError("boom" as any));

    await createFlowHandler(request({ body }), reply());

    expect(m.deleteFlowInWa).not.toHaveBeenCalled();
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

  test("answers 201 once the flows are imported", async () => {
    m.getFlowJsonFromWa.mockResolvedValue({ screens: [] });
    const rep = reply();

    await importFlowsHandler(request({ body }), rep);

    expect(rep.status).toHaveBeenCalledWith(201);
  });

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
