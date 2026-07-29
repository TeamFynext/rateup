import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./campaign.service.js", () => ({
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
const ORG_B = "org-b";
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
  m.dequeue.mockResolvedValue(undefined);
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

    expect(m.create).toHaveBeenCalledWith(body);
    expect(rep.status).toHaveBeenCalledWith(201);
    expect(sent(rep)).toEqual({ id: CAMPAIGN_ID });
  });

  // NOTE: pins current behaviour. teamId comes straight from the body and nothing
  // checks it belongs to the caller's org — the handler never reads request.user at
  // all. So a campaign can be created under another org's team, which then owns it
  // for every other endpoint in this module. See issues.txt 17.3.
  test("creates a campaign under a team belonging to another org", async () => {
    const rep = reply();

    await createCampaignHandler(
      request({ body: { name: "planted", type: "REGULAR", teamId: "another-orgs-team" } }),
      rep,
    );

    expect(m.create.mock.calls[0][0].teamId).toBe("another-orgs-team");
    expect(rep.status).toHaveBeenCalledWith(201);
  });

  // NOTE: no try/catch, unlike sendCampaignHandler in the same file — a service
  // failure escapes to fastify's default handler. Same family as issues.txt 3.5.
  // See issues.txt 17.6.
  test("lets a creation failure propagate", async () => {
    m.create.mockRejectedValue(new Error("db down"));

    await expect(createCampaignHandler(request({ body: {} }), reply())).rejects.toThrow("db down");
  });
});

describe("getCampaignsHandler", () => {
  test("returns one campaign when a campaign id is named", async () => {
    const rep = reply();

    await getCampaignsHandler(request({ query: { campaignId: CAMPAIGN_ID } }), rep);

    expect(m.byId).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(m.byOrg).not.toHaveBeenCalled();
  });

  test("returns a team's campaigns when a team is named", async () => {
    await getCampaignsHandler(request({ query: { teamId: "team-1" } }), reply());

    expect(m.byTeam).toHaveBeenCalledWith("team-1");
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

  // NOTE: pins current behaviour. Only the third branch uses request.user.orgId.
  // Naming a campaign id returns that campaign whoever owns it — template body
  // included — and naming a team id returns that team's campaigns. See
  // issues.txt 17.3.
  test("returns another org's campaign when its id is named", async () => {
    m.byId.mockResolvedValue({ id: CAMPAIGN_ID, orgId: ORG_B, templateData: { name: "theirs" } });
    const rep = reply();

    await getCampaignsHandler(request({ query: { campaignId: CAMPAIGN_ID } }), rep);

    expect(sent(rep).orgId).toBe(ORG_B);
  });

  test("returns another org's team's campaigns when its team id is named", async () => {
    const rep = reply();

    await getCampaignsHandler(request({ query: { teamId: "another-orgs-team" } }), rep);

    expect(m.byTeam).toHaveBeenCalledWith("another-orgs-team");
    expect(rep.code).toHaveBeenCalledWith(200);
  });
});

describe("updateCampaignByIdHandler and deleteCampaignByIdHandler", () => {
  test("updates the campaign named in the path", async () => {
    const rep = reply();

    await updateCampaignByIdHandler(request({ body: { name: "Renamed" } }), rep);

    expect(m.update).toHaveBeenCalledWith(CAMPAIGN_ID, { name: "Renamed" });
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("deletes the campaign named in the path", async () => {
    const rep = reply();

    await deleteCampaignByIdHandler(request(), rep);

    expect(m.delete).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  // NOTE: neither handler reads request.user, so neither can be checking ownership.
  // A campaign id is all it takes to rewrite or delete another org's campaign.
  // See issues.txt 17.3.
  test("neither handler consults who is asking", async () => {
    await updateCampaignByIdHandler(request({ body: {} }), reply());
    await deleteCampaignByIdHandler(request(), reply());

    expect(m.update.mock.calls[0]).not.toContain(ORG_A);
    expect(m.delete.mock.calls[0]).not.toContain(ORG_A);
  });

  // NOTE: no try/catch on either. See issues.txt 17.6.
  test("lets a delete failure propagate", async () => {
    m.delete.mockRejectedValue(new Error("db down"));

    await expect(deleteCampaignByIdHandler(request(), reply())).rejects.toThrow("db down");
  });
});

describe("sendCampaignHandler", () => {
  function sendBody(overrides: Record<string, unknown> = {}) {
    return { status: CampaignStatus.ACTIVE, sendToStatuses: ["PENDING"], ...overrides };
  }

  test("queues the campaign and reports the request was accepted", async () => {
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.update.mock.calls[0][1]).toMatchObject({ status: CampaignStatus.QUEUING });
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

    expect(m.update.mock.calls[0][1].status).toBe(CampaignStatus.DEQUEUING);
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

    expect(m.update.mock.calls[0][1]).toMatchObject({
      status: CampaignStatus.QUEUING,
      campaignSentAt,
    });
    expect(m.enqueue.mock.calls[0][3]).toBe(campaignSentAt);
    expect(sent(rep).code).toBe("MSG_SCHEDULE_REQUESTED");
  });

  test("carries the daily cap through for a whole-campaign send", async () => {
    await sendCampaignHandler(request({ body: sendBody({ dailySendLimit: 500 }) }), reply());

    expect(m.update.mock.calls[0][1].dailySendLimit).toBe(500);
    expect(m.enqueue.mock.calls[0][5]).toBe(500);
  });

  test("ignores the daily cap when resending to a single participant", async () => {
    await sendCampaignHandler(
      request({ body: sendBody({ dailySendLimit: 500, participantId: "p-1" }) }),
      reply(),
    );

    expect(m.update.mock.calls[0][1]).not.toHaveProperty("dailySendLimit");
    expect(m.enqueue.mock.calls[0][5]).toBeUndefined();
  });

  test("answers 500 when something goes wrong along the way", async () => {
    m.countByStatuses.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(sent(rep).code).toBe("INTERNAL_SERVER_ERROR");
  });

  // NOTE: pins current behaviour. Nothing here compares the campaign to the
  // caller's org — getCampaignById is unscoped and its result is only read for a
  // status check. So a campaign id is all it takes to fire another org's campaign
  // at their contacts, from their WhatsApp number, on their bill. Of everything in
  // this module this is the one that acts rather than reads. See issues.txt 17.3.
  test("fires a campaign belonging to another org", async () => {
    m.byId.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.ACTIVE, orgId: ORG_B });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.enqueue).toHaveBeenCalled();
    expect(sent(rep).code).toBe("ENQUEUE_REQUEST_ACCEPTED");
  });

  // NOTE: enqueueCampaignMessage returns { status, message } and the handler
  // discards it, answering "request accepted" either way. Since that function
  // reports success without awaiting the queue anyway (see campaign.service.test.ts),
  // there is nothing along this path that could report a failed enqueue.
  // See issues.txt 17.4.
  test("reports the request accepted even when the enqueue reports failure", async () => {
    m.enqueue.mockResolvedValue({ status: false, message: "Campaign not scheduled" });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(sent(rep).code).toBe("ENQUEUE_REQUEST_ACCEPTED");
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  // NOTE: the campaign is marked DEQUEUING and the dequeue requested before
  // anything checks whether a queue or dequeue is already in progress — that guard
  // sits below, after the INACTIVE branch has already returned. See issues.txt 17.6.
  test("switches a campaign off without checking whether it is mid-queue", async () => {
    m.byId.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.QUEUING });
    const rep = reply();

    await sendCampaignHandler(
      request({ body: sendBody({ status: CampaignStatus.INACTIVE }) }),
      rep,
    );

    expect(m.byId).not.toHaveBeenCalled();
    expect(m.dequeue).toHaveBeenCalled();
    expect(sent(rep).code).toBe("MSG_SCHEDULE_CANCEL_REQUESTED");
  });
});

describe("the reporting handlers", () => {
  test("returns a campaign's survey responses", async () => {
    const rep = reply();

    await getResponseByCampaignByIdHandler(request(), rep);

    expect(m.responses).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(sent(rep)).toEqual([{ id: "resp-1" }]);
  });

  test("answers 500 when the responses cannot be read", async () => {
    m.responses.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getResponseByCampaignByIdHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
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

    expect(m.excel).toHaveBeenCalledWith(CAMPAIGN_ID, undefined, "xlsx");
  });

  test("returns a campaign's counters", async () => {
    const rep = reply();

    await getCampaignStatsHandler(request({ query: { selectedDripStage: "stage-1" } }), rep);

    expect(m.stats).toHaveBeenCalledWith(CAMPAIGN_ID, "stage-1");
    expect(sent(rep)).toEqual({ countSent: 10 });
  });

  test("answers 500 when the counters cannot be read", async () => {
    m.stats.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getCampaignStatsHandler(request({ query: {} }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour, and this is the one that leaks customer data.
  // The export carries every participant's name and phone number, and neither
  // handler reads request.user — a campaign id is all it takes to download another
  // org's contact list. Same for the survey responses beside it.
  // See issues.txt 17.3.
  test("exports and reports on a campaign without consulting who is asking", async () => {
    await getResponseExcelByCampaignByIdHandler(request({ query: {} }), reply());
    await getResponseByCampaignByIdHandler(request(), reply());

    expect(m.excel.mock.calls[0]).not.toContain(ORG_A);
    expect(m.responses.mock.calls[0]).not.toContain(ORG_A);
  });

  // NOTE: both error paths send the caught Error itself. Its own properties are
  // non-enumerable, so the client receives {}. Same shape as issues.txt 11.14.
  // See issues.txt 17.6.
  test("sends failures as a body that carries no information", async () => {
    m.stats.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getCampaignStatsHandler(request({ query: {} }), rep);

    expect(JSON.stringify(sent(rep))).toBe("{}");
  });
});

describe("getCampaignFilterForFlowsHandler", () => {
  test("lists the campaigns running a survey's flow", async () => {
    const rep = reply();

    await getCampaignFilterForFlowsHandler(request({ query: { surveyId: "survey-1" } }), rep);

    expect(m.filterForFlows).toHaveBeenCalledWith("survey-1");
    expect(sent(rep)).toEqual([{ id: CAMPAIGN_ID, name: "March push" }]);
  });

  test("refuses a request that names no survey", async () => {
    const rep = reply();

    await getCampaignFilterForFlowsHandler(request({ query: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(m.filterForFlows).not.toHaveBeenCalled();
  });
});
