import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./campaign.service.js", async () => ({
  // The error class is real; every function around it is a mock.
  CampaignNotFoundError: (
    await vi.importActual<typeof import("./campaign.service.js")>("./campaign.service.js")
  ).CampaignNotFoundError,
  createCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  deleteCampaignParticipantsByCampaignId: vi.fn(),
  enqueueCampaignMessage: vi.fn(),
  getCampaginStatsById: vi.fn(),
  getCampaignById: vi.fn(),
  getCampaignFilterForFlows: vi.fn(),
  getCampaignParticipantCountByStatuses: vi.fn(),
  getCampaignsByOrgId: vi.fn(),
  getCampaignsByTeamId: vi.fn(),
  getResponseByCampaignById: vi.fn(),
  getResponseExcelByCampaignById: vi.fn(),
  updateCampaign: vi.fn(),
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  CampaignNotFoundError,
  createCampaign,
  deleteCampaign,
  deleteCampaignParticipantsByCampaignId,
  enqueueCampaignMessage,
  getCampaginStatsById,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaignParticipantCountByStatuses,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  getResponseByCampaignById,
  getResponseExcelByCampaignById,
  updateCampaign,
} from "./campaign.service.js";
import { CampaignStatus, CampaignType, SentCampaignEnum } from "../../types/enums.js";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignFilterForFlowsHandler,
  getCampaignsHandler,
  getCampaignStatsHandler,
  getResponseByCampaignByIdHandler,
  getResponseExcelByCampaignByIdHandler,
  sendCampaignHandler,
  updateCampaignByIdHandler,
} from "./campaign.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  create: createCampaign as unknown as Mock,
  delete: deleteCampaign as unknown as Mock,
  dequeue: deleteCampaignParticipantsByCampaignId as unknown as Mock,
  enqueue: enqueueCampaignMessage as unknown as Mock,
  stats: getCampaginStatsById as unknown as Mock,
  byId: getCampaignById as unknown as Mock,
  filterForFlows: getCampaignFilterForFlows as unknown as Mock,
  countByStatuses: getCampaignParticipantCountByStatuses as unknown as Mock,
  byOrg: getCampaignsByOrgId as unknown as Mock,
  byTeam: getCampaignsByTeamId as unknown as Mock,
  responses: getResponseByCampaignById as unknown as Mock,
  excel: getResponseExcelByCampaignById as unknown as Mock,
  update: updateCampaign as unknown as Mock,
};

const ORG_A = "org-a";
const CAMPAIGN_ID = "camp-1";

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG_A, userId: "user-1", role: "ADMIN" },
    userId: "user-1",
    params: { campaignId: CAMPAIGN_ID },
    query: {},
    body: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
    header: vi.fn(() => rep),
    type: vi.fn(() => rep),
  };
  return rep;
}

function sent(rep: any, index = 0) {
  return rep.send.mock.calls[index][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.create.mockResolvedValue({ id: CAMPAIGN_ID });
  m.update.mockResolvedValue({ id: CAMPAIGN_ID });
  m.delete.mockResolvedValue({ id: CAMPAIGN_ID });
  m.byId.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.ACTIVE, orgId: ORG_A });
  m.byTeam.mockResolvedValue([{ id: CAMPAIGN_ID }]);
  m.byOrg.mockResolvedValue([{ id: CAMPAIGN_ID }]);
  m.countByStatuses.mockResolvedValue(5);
  m.enqueue.mockResolvedValue({ status: true, message: "ok" });
  m.dequeue.mockResolvedValue({ status: true, message: "ok" });
  m.stats.mockResolvedValue({ countSent: 10 });
  m.responses.mockResolvedValue([{ id: "resp-1" }]);
  m.excel.mockResolvedValue({ title: "March push", data: Buffer.from("wb") });
  m.filterForFlows.mockResolvedValue([{ id: CAMPAIGN_ID, name: "March push" }]);
});

describe("createCampaignHandler", () => {
  test("creates the campaign from the body and answers 201", async () => {
    const rep = reply();
    const body = { name: "March push", type: "REGULAR", teamId: "team-1" };

    await createCampaignHandler(request({ body }), rep);

    expect(m.create).toHaveBeenCalledWith(body, ORG_A);
    expect(rep.status).toHaveBeenCalledWith(201);
    expect(sent(rep)).toEqual({ id: CAMPAIGN_ID });
  });

  test("refuses to create a campaign under a team belonging to another org", async () => {
    m.create.mockRejectedValue(new CampaignNotFoundError("Team not found"));
    const rep = reply();

    await createCampaignHandler(
      request({ body: { name: "planted", type: "REGULAR", teamId: "another-orgs-team" } }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(sent(rep).code).toBe("CAMPAIGN_NOT_FOUND");
  });

  test("answers 500 for a creation failure, rather than letting it escape", async () => {
    m.create.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await createCampaignHandler(request({ body: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep).message).toBe("db down");
  });
});

describe("getCampaignsHandler", () => {
  test("returns one campaign when a campaign id is named", async () => {
    const rep = reply();

    await getCampaignsHandler(request({ query: { campaignId: CAMPAIGN_ID } }), rep);

    expect(m.byId).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A);
    expect(m.byOrg).not.toHaveBeenCalled();
  });

  test("returns a team's campaigns when a team is named", async () => {
    await getCampaignsHandler(request({ query: { teamId: "team-1" } }), reply());

    expect(m.byTeam).toHaveBeenCalledWith("team-1", ORG_A);
  });

  test("falls back to every campaign in the caller's org", async () => {
    await getCampaignsHandler(request({ query: { type: "DRIP" } }), reply());

    expect(m.byOrg).toHaveBeenCalledWith(ORG_A, "DRIP");
  });

  test("prefers the campaign id over the team id when both are given", async () => {
    await getCampaignsHandler(
      request({ query: { campaignId: CAMPAIGN_ID, teamId: "team-1" } }),
      reply(),
    );

    expect(m.byId).toHaveBeenCalled();
    expect(m.byTeam).not.toHaveBeenCalled();
  });

  test("answers 404 for a campaign belonging to another org", async () => {
    m.byId.mockResolvedValue(undefined);
    const rep = reply();

    await getCampaignsHandler(request({ query: { campaignId: CAMPAIGN_ID } }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(sent(rep).code).toBe("CAMPAIGN_NOT_FOUND");
  });

  test("scopes a team listing to the caller's org", async () => {
    const rep = reply();

    await getCampaignsHandler(request({ query: { teamId: "another-orgs-team" } }), rep);

    expect(m.byTeam).toHaveBeenCalledWith("another-orgs-team", ORG_A);
  });
});

describe("updateCampaignByIdHandler and deleteCampaignByIdHandler", () => {
  test("updates the campaign named in the path", async () => {
    const rep = reply();

    await updateCampaignByIdHandler(request({ body: { name: "Renamed" } }), rep);

    expect(m.update).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, { name: "Renamed" });
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("deletes the campaign named in the path", async () => {
    const rep = reply();

    await deleteCampaignByIdHandler(request(), rep);

    expect(m.delete).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A);
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("both handlers carry the caller's org", async () => {
    await updateCampaignByIdHandler(request({ body: {} }), reply());
    await deleteCampaignByIdHandler(request(), reply());

    expect(m.update.mock.calls[0][1]).toBe(ORG_A);
    expect(m.delete.mock.calls[0][1]).toBe(ORG_A);
  });

  test.each([
    ["update", (rep: any) => updateCampaignByIdHandler(request({ body: {} }), rep)],
    ["delete", (rep: any) => deleteCampaignByIdHandler(request(), rep)],
  ])("answers 404 when a %s matched no campaign of the caller's", async (_label, run) => {
    const notFound = Object.assign(new Error("record not found"), { code: "P2025" });
    m.update.mockRejectedValue(notFound);
    m.delete.mockRejectedValue(notFound);
    const rep = reply();

    await run(rep);

    expect(rep.status).toHaveBeenCalledWith(404);
  });

  test("answers 500 for a delete failure, rather than letting it escape", async () => {
    m.delete.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await deleteCampaignByIdHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("sendCampaignHandler", () => {
  function sendBody(overrides: Record<string, unknown> = {}) {
    return { status: CampaignStatus.ACTIVE, sendToStatuses: ["PENDING"], ...overrides };
  }

  test("queues the campaign and reports the request was accepted", async () => {
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.update.mock.calls[0][2]).toMatchObject({ status: CampaignStatus.QUEUING });
    expect(m.enqueue).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      ["PENDING"],
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(sent(rep).code).toBe("ENQUEUE_REQUEST_ACCEPTED");
  });

  test("only flips the status for a drip campaign", async () => {
    const rep = reply();

    await sendCampaignHandler(
      request({ body: sendBody({ type: CampaignType.DRIP, status: CampaignStatus.ACTIVE }) }),
      rep,
    );

    expect(m.enqueue).not.toHaveBeenCalled();
    expect(sent(rep).code).toBe("MSG_SCHEDULED");
  });

  test("asks for a dequeue when the campaign is being switched off", async () => {
    const rep = reply();

    await sendCampaignHandler(
      request({ body: sendBody({ status: CampaignStatus.INACTIVE }) }),
      rep,
    );

    expect(m.update.mock.calls[0][2].status).toBe(CampaignStatus.DEQUEUING);
    expect(m.dequeue).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(sent(rep).code).toBe("MSG_SCHEDULE_CANCEL_REQUESTED");
  });

  test("refuses while a queue or dequeue is already running", async () => {
    m.byId.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.QUEUING });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(sent(rep).code).toBe("CAMPAIGN_ENQUEUE_DEQUEUE_IN_PROGRESS");
  });

  test("refuses when no participant sits in the requested statuses", async () => {
    m.countByStatuses.mockResolvedValue(0);
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(sent(rep).code).toBe("NO_PARTICIPANTS_FOR_CAMPAIGN");
    expect(m.enqueue).not.toHaveBeenCalled();
  });

  test("schedules for later when a send time and the later choice are given", async () => {
    const campaignSentAt = new Date("2026-04-01T09:00:00Z");
    const rep = reply();

    await sendCampaignHandler(
      request({ body: sendBody({ campaignSentAt, sentCampaignChoice: SentCampaignEnum.LATER }) }),
      rep,
    );

    expect(m.update.mock.calls[0][2]).toMatchObject({
      status: CampaignStatus.QUEUING,
      campaignSentAt,
    });
    expect(m.enqueue.mock.calls[0][3]).toBe(campaignSentAt);
    expect(sent(rep).code).toBe("MSG_SCHEDULE_REQUESTED");
  });

  test("carries the daily cap through for a whole-campaign send", async () => {
    await sendCampaignHandler(request({ body: sendBody({ dailySendLimit: 500 }) }), reply());

    expect(m.update.mock.calls[0][2].dailySendLimit).toBe(500);
    expect(m.enqueue.mock.calls[0][5]).toBe(500);
  });

  test("ignores the daily cap when resending to a single participant", async () => {
    await sendCampaignHandler(
      request({ body: sendBody({ dailySendLimit: 500, participantId: "p-1" }) }),
      reply(),
    );

    expect(m.update.mock.calls[0][2]).not.toHaveProperty("dailySendLimit");
    expect(m.enqueue.mock.calls[0][5]).toBeUndefined();
  });

  test("answers 500 when something goes wrong along the way", async () => {
    m.countByStatuses.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep).code).toBe("INTERNAL_SERVER_ERROR");
  });

  test("refuses to fire a campaign belonging to another org", async () => {
    m.byId.mockResolvedValue(undefined);
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.enqueue).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(404);
  });

  test.each([
    ["a drip status change", { type: CampaignType.DRIP, status: CampaignStatus.ACTIVE }],
    ["a cancellation", { status: CampaignStatus.INACTIVE }],
  ])("refuses %s on another org's campaign too", async (_label, overrides) => {
    m.byId.mockResolvedValue(undefined);
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody(overrides) }), rep);

    expect(m.update).not.toHaveBeenCalled();
    expect(m.dequeue).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(404);
  });

  test("resolves the campaign against the caller's org", async () => {
    await sendCampaignHandler(request({ body: sendBody() }), reply());

    expect(m.byId).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A);
  });

  test("reports a failed enqueue, and rolls the campaign back", async () => {
    m.enqueue.mockResolvedValue({ status: false, message: "Campaign not scheduled" });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(502);
    expect(sent(rep).code).toBe("ENQUEUE_FAILED");
    expect(m.update.mock.calls.at(-1)![2]).toMatchObject({ status: CampaignStatus.INACTIVE });
  });

  test("reports a failed dequeue rather than confirming the cancellation", async () => {
    m.dequeue.mockResolvedValue({ status: false, message: "Campaign cancellation not requested" });
    const rep = reply();

    await sendCampaignHandler(
      request({ body: sendBody({ status: CampaignStatus.INACTIVE }) }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(502);
    expect(sent(rep).code).toBe("MSG_SCHEDULE_CANCEL_FAILED");
  });

  test("refuses to switch a campaign off while it is mid-queue", async () => {
    m.byId.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.QUEUING });
    const rep = reply();

    await sendCampaignHandler(
      request({ body: sendBody({ status: CampaignStatus.INACTIVE }) }),
      rep,
    );

    expect(m.dequeue).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(400);
    expect(sent(rep).code).toBe("CAMPAIGN_ENQUEUE_DEQUEUE_IN_PROGRESS");
  });
});

describe("the reporting handlers", () => {
  test("returns a campaign's survey responses", async () => {
    const rep = reply();

    await getResponseByCampaignByIdHandler(request(), rep);

    expect(m.responses).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A);
    expect(sent(rep)).toEqual([{ id: "resp-1" }]);
  });

  test("answers 500 when the responses cannot be read", async () => {
    m.responses.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getResponseByCampaignByIdHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });

  test("streams the export with a filename header the browser can read", async () => {
    const rep = reply();

    await getResponseExcelByCampaignByIdHandler(request({ query: {} }), rep);

    expect(rep.header.mock.calls[0][0]).toBe("filename");
    expect(rep.header.mock.calls[1]).toEqual(["Access-Control-Expose-Headers", "filename"]);
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("refuses an export format it does not support", async () => {
    const rep = reply();

    await getResponseExcelByCampaignByIdHandler(request({ query: { format: "csv" } }), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(m.excel).not.toHaveBeenCalled();
  });

  test("defaults the export to a spreadsheet", async () => {
    await getResponseExcelByCampaignByIdHandler(request({ query: {} }), reply());

    expect(m.excel).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, undefined, "xlsx");
  });

  test("returns a campaign's counters", async () => {
    const rep = reply();

    await getCampaignStatsHandler(request({ query: { selectedDripStage: "stage-1" } }), rep);

    expect(m.stats).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, "stage-1");
    expect(sent(rep)).toEqual({ countSent: 10 });
  });

  test("answers 500 when the counters cannot be read", async () => {
    m.stats.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getCampaignStatsHandler(request({ query: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });

  test("both reporting handlers carry the caller's org", async () => {
    await getResponseExcelByCampaignByIdHandler(request({ query: {} }), reply());
    await getResponseByCampaignByIdHandler(request(), reply());

    expect(m.excel.mock.calls[0][1]).toBe(ORG_A);
    expect(m.responses.mock.calls[0][1]).toBe(ORG_A);
  });

  test("answers 404 when the export names a campaign that is not the caller's", async () => {
    m.excel.mockRejectedValue(new CampaignNotFoundError());
    const rep = reply();

    await getResponseExcelByCampaignByIdHandler(request({ query: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
  });

  test("sends a failure as a body that names what went wrong", async () => {
    m.stats.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getCampaignStatsHandler(request({ query: {} }), rep);

    expect(JSON.parse(JSON.stringify(sent(rep)))).toEqual({
      message: "db down",
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});

describe("getCampaignFilterForFlowsHandler", () => {
  test("lists the campaigns running a survey's flow", async () => {
    const rep = reply();

    await getCampaignFilterForFlowsHandler(request({ query: { surveyId: "survey-1" } }), rep);

    expect(m.filterForFlows).toHaveBeenCalledWith("survey-1", ORG_A);
    expect(sent(rep)).toEqual([{ id: CAMPAIGN_ID, name: "March push" }]);
  });

  test("refuses a request that names no survey", async () => {
    const rep = reply();

    await getCampaignFilterForFlowsHandler(request({ query: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(m.filterForFlows).not.toHaveBeenCalled();
  });
});
