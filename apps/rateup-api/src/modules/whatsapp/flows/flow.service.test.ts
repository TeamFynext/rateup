import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waFlow: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    survey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  getWaSettingsById: vi.fn(),
}));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("./flow.utils.js", () => ({
  convertHeaderToNewQuestion: vi.fn((json) => json),
  generateFlowMessageData: vi.fn(() => ({ type: "interactive" })),
  generateQuestionResponsesFromFlowResponse: vi.fn(() => []),
  getFlowFormElementNameFromQuestionId: vi.fn(),
  getFlowJsonWithTitleAndDescription: vi.fn((json) => json),
  injectIdToFlowJson: vi.fn((json) => json),
  parseFlowResponse: vi.fn(),
  parseFlowResponseV2: vi.fn(),
  parseResponseFromCurrentScreenResponse: vi.fn(() => []),
  parseResponseFromCurrentScreenResponseV2: vi.fn(() => []),
  removeEmptyStrings: vi.fn(),
  removeIdFromFlowJson: vi.fn((json) => json),
  sanitizeScreenData: vi.fn(),
  transformFlowAndLogicJumps: vi.fn(),
}));
vi.mock("../../survey/survey.service.js", () => ({
  getGoogleUrlBySurveyTeamMapId: vi.fn(),
  getSurveyById: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({
  saveResponses: vi.fn(),
  sendMessage: vi.fn(),
  shouldShowGoogleReview: vi.fn(),
  shouldShowGoogleReviewV2: vi.fn(),
}));
vi.mock("../../question/question.utils.js", () => ({
  validateLogic: vi.fn(),
  validateLogicV2: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({
  createCTAButtonMessage: vi.fn(() => ({ type: "cta" })),
  parseMessage: vi.fn(),
}));
vi.mock("../../loyalty/feedback/feedback.completion.js", () => ({
  onFeedbackFlowCompleted: vi.fn(),
}));
vi.mock("../../../utils/commonUtils.js", () => ({
  getShortUrlId: vi.fn(() => "short-1"),
  shortIdUniqueConstraintErrHandler: vi.fn((fn) => fn()),
}));
vi.mock("../../integrations/amelia/amelia.js", () => ({
  getAmeliaSlots: vi.fn(),
}));
vi.mock("../../team/team.service.js", () => ({ getTeamIdsByUserId: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.controller.js", () => ({ processNextNode: vi.fn() }));
vi.mock("../whatsappSurvey/automation-logger.utils.js", () => ({
  findRecentAutomation: vi.fn(),
  logFlowCompletion: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { getWaSettings, getWaSettingsById } from "../settings/wa_settings.service.js";
import { callMetaApi } from "../wa_axios.js";
import { generateFlowMessageData } from "./flow.utils.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import { WaFlowStatus } from "../../../types/enums.js";
import {
  cloneFlow,
  createFlowCopyInDb,
  deleteFlowInDb,
  deleteFlowInWa,
  deprecateFlowInWa,
  getFlowBySurveyId,
  getFlowFromDb,
  getFlowFromDbByFlowId,
  getFlowPreview,
  getFlowPreviewFromDb,
  getFlowsFromDb,
  getUnsyncedFlows,
  publishFlowInWa,
  removeDuplicateResponses,
  sendFlow,
  syncLocalFlowToWhatsapp,
  updateFlowIdAndStatusInDb,
  updateFlowInDb,
  updateFlowJsonInWa,
} from "./flow.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waFlow: Record<"create" | "delete" | "findFirst" | "findMany" | "update", Mock>;
  survey: Record<"create" | "findFirst" | "findMany" | "update", Mock>;
};
const axiosMock = axios as unknown as { get: Mock; post: Mock };
const getWaSettingsMock = getWaSettings as unknown as Mock;
const getWaSettingsByIdMock = getWaSettingsById as unknown as Mock;
const callMetaApiMock = callMetaApi as unknown as Mock;
const generateFlowMessageDataMock = generateFlowMessageData as unknown as Mock;
const sendMessageMock = sendMessage as unknown as Mock;
const getTeamIdsMock = getTeamIdsByUserId as unknown as Mock;

const ORG_A = "org-a";
const ORG_B = "org-b";
const DB_FLOW_ID = "dbflow-1";

const WA_SETTINGS_ID = "wa-settings-1";
const SETTINGS = {
  id: WA_SETTINGS_ID,
  phoneId: "phone-1",
  wabaId: "waba-1",
  accessToken: "token-abc",
};
/** The org's other number, on a business account of its own. */
const OTHER_SETTINGS = {
  id: "wa-settings-2",
  phoneId: "phone-2",
  wabaId: "waba-2",
  accessToken: "token-xyz",
};

/** A stored flow row, owned by org A unless told otherwise. */
function flowRow(overrides: Record<string, unknown> = {}): any {
  return {
    dbFlowId: DB_FLOW_ID,
    flowId: "wa-flow-1",
    orgId: ORG_A,
    surveyId: "survey-1",
    name: "Feedback",
    status: WaFlowStatus.DRAFT,
    version: 1,
    json: { screens: [{ id: "S1", layout: { children: [] } }] },
    map: {},
    logicJumps: {},
    templateMessage: { body: "b", cta: "c" },
    survey: { id: "survey-1", questions: [] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getWaSettingsMock.mockResolvedValue(SETTINGS);
  getWaSettingsByIdMock.mockResolvedValue(SETTINGS);
  callMetaApiMock.mockResolvedValue({ data: { data: [] } });
  axiosMock.post.mockResolvedValue({ data: {} });
  axiosMock.get.mockResolvedValue({ data: {} });
  getTeamIdsMock.mockResolvedValue(["team-1"]);
  db.waFlow.findFirst.mockResolvedValue(flowRow());
  db.waFlow.findMany.mockResolvedValue([]);
  db.waFlow.update.mockResolvedValue(flowRow());
  db.waFlow.create.mockResolvedValue(flowRow());
  db.waFlow.delete.mockResolvedValue(flowRow());
  db.survey.update.mockResolvedValue({});
  db.survey.findMany.mockResolvedValue([]);
});

describe("reading a flow - who is allowed to see it", () => {
  test("scopes the lookup to the org asking", async () => {
    await getFlowFromDb(DB_FLOW_ID, ORG_A);

    expect(db.waFlow.findFirst.mock.calls[0][0]).toEqual({
      where: { dbFlowId: DB_FLOW_ID, orgId: ORG_A },
    });
  });

  test("reports nothing for a flow belonging to another org", async () => {
    // The scoped findFirst matches no row for a flow the caller does not own.
    db.waFlow.findFirst.mockResolvedValue(null);

    await expect(getFlowFromDb(DB_FLOW_ID, ORG_B)).resolves.toBeNull();
  });

  test("scopes a lookup by Meta flow id to the caller's org, as it should", async () => {
    await getFlowFromDbByFlowId(ORG_A, "wa-flow-1");

    expect(db.waFlow.findFirst.mock.calls[0][0]).toEqual({
      where: { flowId: "wa-flow-1", orgId: ORG_A },
    });
  });

  test("lists only the flows of the caller's org, and only their own teams'", async () => {
    await getFlowsFromDb(ORG_A, "user-1");

    const { where } = db.waFlow.findMany.mock.calls[0][0];
    expect(where.orgId).toBe(ORG_A);
    expect(where.survey.teams.some.teamId).toEqual({ in: ["team-1"] });
  });

  // Meta scopes flow ids to a WABA, so a caller that will use a flow on one number
  // asks for that number's flows only.
  test("narrows the list to one channel when asked to", async () => {
    getWaSettingsMock.mockResolvedValue(SETTINGS);

    await getFlowsFromDb(ORG_A, "user-1", OTHER_SETTINGS.id);

    const { where } = db.waFlow.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([{ whatsappSettingsId: OTHER_SETTINGS.id }]);
  });

  // Flows created before the channel was recorded carry null and belong to the org
  // default, so filtering by that channel has to keep them.
  test("keeps the flows that predate the channel column on the default channel", async () => {
    await getFlowsFromDb(ORG_A, "user-1", WA_SETTINGS_ID);

    const { where } = db.waFlow.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { whatsappSettingsId: WA_SETTINGS_ID },
      { whatsappSettingsId: null },
    ]);
  });

  // The flow cards sum each team's completed count into the "N responses" line,
  // so the list has to carry the stats rather than just the team ids.
  test("carries each team's completed count on the list", async () => {
    await getFlowsFromDb(ORG_A, "user-1");

    const { select } = db.waFlow.findMany.mock.calls[0][0];
    expect(select.survey.select.teams.select.surveyStats).toEqual({
      select: { completed: true },
    });
  });

  test("scopes a lookup by survey id to the caller's org", async () => {
    await getFlowBySurveyId("survey-1", ORG_A);

    expect(db.waFlow.findFirst.mock.calls[0][0]).toEqual({
      where: { surveyId: "survey-1", orgId: ORG_A },
    });
  });
});

describe("updateFlowInDb", () => {
  test("trims the name it is given", async () => {
    await updateFlowInDb(ORG_A, DB_FLOW_ID, { name: "  Feedback  " });

    expect(db.waFlow.update.mock.calls[0][0].data.name).toBe("Feedback");
  });

  test("renames the survey alongside the flow", async () => {
    db.waFlow.update.mockResolvedValue(flowRow({ surveyId: "survey-1" }));

    await updateFlowInDb(ORG_A, DB_FLOW_ID, { name: "New name" });

    expect(db.survey.update.mock.calls[0][0]).toEqual({
      where: { id: "survey-1", orgId: ORG_A },
      data: { title: "New name", isPublished: undefined },
    });
  });

  test("publishes the survey when the flow is published", async () => {
    await updateFlowInDb(ORG_A, DB_FLOW_ID, { status: WaFlowStatus.PUBLISHED });

    expect(db.survey.update.mock.calls[0][0].data.isPublished).toBe(true);
  });

  test("leaves the survey alone for an edit that touches neither name nor status", async () => {
    await updateFlowInDb(ORG_A, DB_FLOW_ID, { pendingSave: true });

    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("scopes the update to the org it is handed", async () => {
    await updateFlowInDb(ORG_A, DB_FLOW_ID, { name: "Renamed" });

    expect(db.waFlow.update.mock.calls[0][0].where).toEqual({
      dbFlowId: DB_FLOW_ID,
      orgId: ORG_A,
    });
  });

  test("scopes the delete to the caller's org", async () => {
    await deleteFlowInDb(DB_FLOW_ID, ORG_A);

    expect(db.waFlow.delete.mock.calls[0][0]).toEqual({
      where: { dbFlowId: DB_FLOW_ID, orgId: ORG_A },
    });
  });
});

describe("syncLocalFlowToWhatsapp", () => {
  test("uploads the json and then publishes the flow", async () => {
    await syncLocalFlowToWhatsapp(ORG_A, DB_FLOW_ID);

    expect(axiosMock.post.mock.calls[0][0]).toContain("/wa-flow-1/assets");
    expect(callMetaApiMock.mock.calls[0][0]).toBe("/wa-flow-1/publish");
  });

  test("records the flow as published and no longer pending", async () => {
    await syncLocalFlowToWhatsapp(ORG_A, DB_FLOW_ID);

    expect(db.waFlow.update.mock.calls[0][0].data).toMatchObject({
      pendingSave: false,
      status: WaFlowStatus.PUBLISHED,
    });
  });

  test("neither publishes nor marks the flow saved when the upload to Meta failed", async () => {
    axiosMock.post.mockRejectedValue(new Error("meta rejected the asset"));

    await expect(syncLocalFlowToWhatsapp(ORG_A, DB_FLOW_ID)).rejects.toThrow(
      "meta rejected the asset",
    );

    expect(callMetaApiMock).not.toHaveBeenCalled();
    expect(db.waFlow.update).not.toHaveBeenCalled();
  });

  test("loads the flow to sync scoped to the org syncing it", async () => {
    await syncLocalFlowToWhatsapp(ORG_A, DB_FLOW_ID);

    expect(db.waFlow.findFirst.mock.calls[0][0].where).toEqual({
      dbFlowId: DB_FLOW_ID,
      orgId: ORG_A,
    });
    expect(getWaSettingsMock).toHaveBeenCalledWith(ORG_A);
  });

  test("refuses a flow that does not belong to the org syncing it", async () => {
    db.waFlow.findFirst.mockResolvedValue(null);

    await expect(syncLocalFlowToWhatsapp(ORG_B, DB_FLOW_ID)).rejects.toThrow("Flow not found");
  });
});

describe("updateFlowJsonInWa", () => {
  test("uploads the json to Meta as a flow.json asset", async () => {
    await updateFlowJsonInWa(ORG_A, "wa-flow-1", { screens: [] } as any);

    const [url, , config] = axiosMock.post.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v25.0/wa-flow-1/assets");
    expect(config.headers.Authorization).toBe("Bearer token-abc");
  });

  test("lets a rejected upload reach the caller", async () => {
    axiosMock.post.mockRejectedValue(new Error("meta rejected the asset"));

    await expect(updateFlowJsonInWa(ORG_A, "wa-flow-1", { screens: [] } as any)).rejects.toThrow(
      "meta rejected the asset",
    );
  });
});

describe("cloneFlow", () => {
  const SURVEY = {
    id: "survey-1",
    orgId: ORG_A,
    title: "Feedback",
    spreadSheetId: "sheet-1",
    isPublished: true,
  };

  beforeEach(() => {
    db.survey.findFirst.mockResolvedValue(SURVEY);
    db.survey.create.mockResolvedValue({ id: "survey-2", title: "Feedback Copy 1" });
  });

  test("refuses when the flow's survey is gone", async () => {
    db.survey.findFirst.mockResolvedValue(null);

    await expect(cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1")).resolves.toBe(
      "Survey not found to duplicate",
    );
  });

  test("names the copy after the original", async () => {
    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    expect(db.survey.create.mock.calls[0][0].data.title).toBe("Feedback Copy 1");
  });

  test("numbers the next copy past the highest one that already exists", async () => {
    db.survey.findMany.mockResolvedValue([
      { title: "Feedback" },
      { title: "Feedback Copy 1" },
      { title: "Feedback Copy 4" },
    ]);

    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    expect(db.survey.create.mock.calls[0][0].data.title).toBe("Feedback Copy 5");
  });

  test("starts the copy unpublished and credited to whoever cloned it", async () => {
    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    const { data } = db.survey.create.mock.calls[0][0];
    expect(data.isPublished).toBe(false);
    expect(data.createdBy).toBe("user-1");
    expect(data).not.toHaveProperty("spreadSheetId");
  });

  test("lets the copy take a fresh id instead of the original's", async () => {
    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    // Spreading the source row used to carry `id` through, and the insert died with
    // "Unique constraint failed on the fields: (`id`)".
    expect(db.survey.create.mock.calls[0][0].data).not.toHaveProperty("id");
  });

  test("creates the cloned flow as a draft against the new survey", async () => {
    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    expect(db.waFlow.create.mock.calls[0][0].data).toMatchObject({
      flowId: "wa-flow-2",
      status: WaFlowStatus.DRAFT,
      surveyId: "survey-2",
    });
  });

  test("counts existing copies only within the survey's own org", async () => {
    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    expect(db.survey.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      title: { startsWith: "Feedback" },
    });
  });

  test("scopes the survey it clones to the flow's own org", async () => {
    await cloneFlow(flowRow(), "wa-flow-2", "user-1", "team-1");

    expect(db.survey.findFirst.mock.calls[0][0]).toEqual({
      where: { id: "survey-1", orgId: ORG_A },
    });
  });
});

describe("createFlowCopyInDb", () => {
  test("defaults a new flow to version 2 with a starter template message", async () => {
    await createFlowCopyInDb({
      orgId: ORG_A,
      flowId: "wa-flow-1",
      json: { screens: [] } as any,
      flowMap: {},
      surveyId: "survey-1",
      status: WaFlowStatus.DRAFT,
      name: "Feedback",
    });

    expect(db.waFlow.create.mock.calls[0][0].data).toMatchObject({
      version: 2,
      logicJumps: {},
      templateMessage: { body: "Would you like to start survey?", cta: "Open" },
    });
  });
});

describe("the Meta-side flow operations", () => {
  test("publishes with the org's own credentials", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    await expect(publishFlowInWa(ORG_A, "wa-flow-1")).resolves.toEqual({ success: true });
    expect(callMetaApiMock.mock.calls[0].slice(0, 3)).toEqual([
      "/wa-flow-1/publish",
      "POST",
      "token-abc",
    ]);
  });

  test("deprecates through the dedicated endpoint", async () => {
    await deprecateFlowInWa(ORG_A, "wa-flow-1");

    expect(callMetaApiMock.mock.calls[0].slice(0, 2)).toEqual(["/wa-flow-1/deprecate", "POST"]);
  });

  test("deletes through a DELETE on the flow itself", async () => {
    await deleteFlowInWa(ORG_A, "wa-flow-1");

    expect(callMetaApiMock.mock.calls[0].slice(0, 2)).toEqual(["/wa-flow-1", "DELETE"]);
  });

  test("passes a Meta failure on to the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(publishFlowInWa(ORG_A, "wa-flow-1")).rejects.toThrow("graph is down");
  });
});

describe("getUnsyncedFlows", () => {
  test("reports the flows Meta knows about that we have never imported", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-flow-1" }, { id: "wa-flow-2" }] },
    });
    db.waFlow.findMany.mockResolvedValue([{ flowId: "wa-flow-1" }]);

    await expect(getUnsyncedFlows(ORG_A, "user-1")).resolves.toEqual([{ id: "wa-flow-2" }]);
  });

  test("reports nothing when everything is already imported", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "wa-flow-1" }] } });
    db.waFlow.findMany.mockResolvedValue([{ flowId: "wa-flow-1" }]);

    await expect(getUnsyncedFlows(ORG_A, "user-1")).resolves.toEqual([]);
  });
});

describe("updateFlowIdAndStatusInDb", () => {
  test("points the flow at its new Meta id and takes the survey back to draft", async () => {
    await updateFlowIdAndStatusInDb(DB_FLOW_ID, "wa-flow-2", "survey-1", ORG_A);

    expect(db.waFlow.update.mock.calls[0][0]).toEqual({
      where: { dbFlowId: DB_FLOW_ID, orgId: ORG_A },
      data: { flowId: "wa-flow-2", status: WaFlowStatus.DRAFT },
    });
    expect(db.survey.update.mock.calls[0][0]).toEqual({
      where: { id: "survey-1", orgId: ORG_A },
      data: { isPublished: false },
    });
  });
});

describe("getFlowPreview", () => {
  const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  test("reuses a cached preview that has not expired", async () => {
    db.waFlow.findFirst.mockResolvedValue(flowRow({ preview: { expires_at: FUTURE, url: "u" } }));

    await expect(getFlowPreview(ORG_A, DB_FLOW_ID)).resolves.toEqual({
      expires_at: FUTURE,
      url: "u",
    });
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("fetches a fresh preview once the cached one has expired, and stores it", async () => {
    db.waFlow.findFirst.mockResolvedValue(flowRow({ preview: { expires_at: PAST } }));
    callMetaApiMock.mockResolvedValue({ data: { preview: { url: "fresh" } } });

    await expect(getFlowPreview(ORG_A, DB_FLOW_ID)).resolves.toEqual({ url: "fresh" });
    expect(callMetaApiMock.mock.calls[0][0]).toBe("/wa-flow-1?fields=preview");
    expect(db.waFlow.update.mock.calls[0][0]).toEqual({
      where: { dbFlowId: DB_FLOW_ID, orgId: ORG_A },
      data: { preview: { url: "fresh" } },
    });
  });

  test("fetches a preview for a flow that has never had one", async () => {
    callMetaApiMock.mockResolvedValue({ data: { preview: { url: "fresh" } } });

    await expect(getFlowPreview(ORG_A, DB_FLOW_ID)).resolves.toEqual({ url: "fresh" });
  });

  test("reports nothing for a flow id that matches nothing", async () => {
    db.waFlow.findFirst.mockResolvedValue(null);

    await expect(getFlowPreviewFromDb("nope", ORG_A)).resolves.toBeUndefined();
  });
});

describe("sendFlow", () => {
  test("builds the flow message and sends it to the given number", async () => {
    generateFlowMessageDataMock.mockReturnValue({ type: "interactive" });

    await expect(
      sendFlow({ orgId: ORG_A, dbFlowId: DB_FLOW_ID, phone: "15550001", userId: "user-1" }),
    ).resolves.toBe(true);

    expect(sendMessageMock.mock.calls[0][1]).toEqual({ type: "interactive", to: "15550001" });
  });

  test("sends through the phone number the caller asked for", async () => {
    await sendFlow({
      orgId: ORG_A,
      dbFlowId: DB_FLOW_ID,
      phone: "15550001",
      whatsappSettingsPhoneId: "phone-2",
    });

    expect(sendMessageMock.mock.calls[0][4]).toBe("phone-2");
  });

  // Sending a flow from a number on another WABA is rejected by Meta, so with no
  // number given the flow goes out through the channel it was created on.
  test("sends through the flow's own number when the caller names none", async () => {
    db.waFlow.findFirst.mockResolvedValue(flowRow({ whatsappSettingsId: OTHER_SETTINGS.id }));
    getWaSettingsByIdMock.mockResolvedValue(OTHER_SETTINGS);

    await sendFlow({ orgId: ORG_A, dbFlowId: DB_FLOW_ID, phone: "15550001" });

    expect(sendMessageMock.mock.calls[0][4]).toBe(OTHER_SETTINGS.phoneId);
  });

  test("refuses to send a flow from a number on another business account", async () => {
    db.waFlow.findFirst.mockResolvedValue(flowRow({ whatsappSettingsId: WA_SETTINGS_ID }));
    getWaSettingsByIdMock.mockResolvedValue(SETTINGS);
    getWaSettingsMock.mockResolvedValue(OTHER_SETTINGS);

    await expect(
      sendFlow({
        orgId: ORG_A,
        dbFlowId: DB_FLOW_ID,
        phone: "15550001",
        whatsappSettingsPhoneId: OTHER_SETTINGS.phoneId,
      }),
    ).resolves.toBe(false);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test("reports failure rather than throwing when the send fails", async () => {
    sendMessageMock.mockRejectedValue(new Error("whatsapp is down"));

    await expect(sendFlow({ orgId: ORG_A, dbFlowId: DB_FLOW_ID, phone: "15550001" })).resolves.toBe(
      false,
    );
  });

  test("reports failure when the flow cannot be turned into a message", async () => {
    generateFlowMessageDataMock.mockImplementation(() => {
      throw new Error("Flow has no screens");
    });

    await expect(sendFlow({ orgId: ORG_A, dbFlowId: DB_FLOW_ID, phone: "15550001" })).resolves.toBe(
      false,
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});

describe("removeDuplicateResponses", () => {
  test("keeps the last answer given to each question", () => {
    const result = removeDuplicateResponses([
      { questionId: "q1", response: "first" },
      { questionId: "q2", response: "only" },
      { questionId: "q1", response: "corrected" },
    ] as any);

    expect(result).toEqual([
      { questionId: "q1", response: "corrected" },
      { questionId: "q2", response: "only" },
    ]);
  });

  test("keeps the questions in the order they were first answered", () => {
    const result = removeDuplicateResponses([
      { questionId: "q2", response: "b" },
      { questionId: "q1", response: "a" },
    ] as any);

    expect(result.map((r) => r.questionId)).toEqual(["q2", "q1"]);
  });

  test("copes with nothing to deduplicate", () => {
    expect(removeDuplicateResponses([])).toEqual([]);
  });

  test("leaves the array it was handed in the order it arrived", () => {
    const input: any = [
      { questionId: "q1", response: "a" },
      { questionId: "q2", response: "b" },
    ];

    removeDuplicateResponses(input);

    expect(input.map((r: any) => r.questionId)).toEqual(["q1", "q2"]);
  });
});
