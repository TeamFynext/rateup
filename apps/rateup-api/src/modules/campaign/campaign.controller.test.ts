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
// The preflight is exercised in campaign.preflight.test.ts; here it stands in for the
// participant count the send used to read directly, plus the allowance it now checks.
vi.mock("./campaign.preflight.js", () => ({ getCampaignSendPreflight: vi.fn() }));

// Send sessions are exercised in campaignSend.service.test.ts. Here they stand in
// for the row every send now opens before it enqueues — and, for the in-progress
// guard, for how long the live send has been sitting there.
vi.mock("./campaignRetry.service.js", () => ({ upsertCampaignRetryPolicy: vi.fn() }));

vi.mock("./campaignSend.service.js", async () => ({
  CampaignSendInProgressError: (
    await vi.importActual<typeof import("./campaignSend.service.js")>("./campaignSend.service.js")
  ).CampaignSendInProgressError,
  cancelCampaignSends: vi.fn(),
  createCampaignSend: vi.fn(),
  failCampaignSend: vi.fn(),
  getLiveCampaignSend: vi.fn(),
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
} from "./campaign.service.js";
import { getCampaignSendPreflight } from "./campaign.preflight.js";
import {
  cancelCampaignSends,
  CampaignSendInProgressError,
  createCampaignSend,
  getLiveCampaignSend,
} from "./campaignSend.service.js";
import { upsertCampaignRetryPolicy } from "./campaignRetry.service.js";
import {
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
  preflight: getCampaignSendPreflight as unknown as Mock,
  byOrg: getCampaignsByOrgId as unknown as Mock,
  byTeam: getCampaignsByTeamId as unknown as Mock,
  responses: getResponseByCampaignById as unknown as Mock,
  excel: getResponseExcelByCampaignById as unknown as Mock,
  update: updateCampaign as unknown as Mock,
  createSend: createCampaignSend as unknown as Mock,
  cancelSends: cancelCampaignSends as unknown as Mock,
  liveSend: getLiveCampaignSend as unknown as Mock,
};

const SEND_ID = "00000000-0000-0000-0000-0000000000ff";

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
  // `waTemplateId` matters now: a campaign with no template is refused at
  // launch, which is where the create schema's completeness check moved to when
  // drafts were allowed to be saved half-finished.
  m.byId.mockResolvedValue({
    id: CAMPAIGN_ID,
    status: CampaignStatus.ACTIVE,
    orgId: ORG_A,
    type: CampaignType.WHATSAPP,
    waTemplateId: "tpl-1",
    dripStages: [],
  });
  m.byTeam.mockResolvedValue([{ id: CAMPAIGN_ID }]);
  m.byOrg.mockResolvedValue([{ id: CAMPAIGN_ID }]);
  m.countByStatuses.mockResolvedValue(5);
  m.preflight.mockResolvedValue({
    recipients: 5,
    metered: true,
    max: 5000,
    used: 10,
    remaining: 4990,
    isAnnual: false,
    exhausted: false,
    shortfall: 0,
  });
  m.enqueue.mockResolvedValue({ status: true, message: "ok" });
  m.createSend.mockResolvedValue({ id: SEND_ID, attemptNo: 0 });
  m.cancelSends.mockResolvedValue(0);
  // A live send that only just started, so the in-progress guard holds.
  m.liveSend.mockResolvedValue({ id: SEND_ID, startedAt: new Date(), createdAt: new Date() });
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
    expect(m.enqueue).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      campaignSendId: SEND_ID,
      sendToStatuses: ["PENDING"],
      participantId: undefined,
      dailySendLimit: undefined,
    });
    expect(sent(rep).code).toBe("ENQUEUE_REQUEST_ACCEPTED");
  });

  test("records when the campaign first went out", async () => {
    // The Setup card's "Sent" reads `campaignSentAt || startedAt`, and this path
    // nulls the first one — so without the second a campaign sent from the button
    // reported "Not yet" forever. `updateCampaign` only fills a null `startedAt`,
    // so a later resend does not move it.
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.update.mock.calls[0][2].startedAt).toBeInstanceOf(Date);
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
    m.preflight.mockResolvedValue({
      recipients: 0,
      metered: false,
      isAnnual: false,
      exhausted: false,
      shortfall: 0,
    });
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
    expect(m.enqueue.mock.calls[0][0].scheduledAt).toBe(campaignSentAt);
    expect(sent(rep).code).toBe("MSG_SCHEDULE_REQUESTED");
  });

  test("carries the daily cap through for a whole-campaign send", async () => {
    await sendCampaignHandler(request({ body: sendBody({ dailySendLimit: 500 }) }), reply());

    expect(m.update.mock.calls[0][2].dailySendLimit).toBe(500);
    expect(m.enqueue.mock.calls[0][0].dailySendLimit).toBe(500);
  });

  test("ignores the daily cap when resending to a single participant", async () => {
    await sendCampaignHandler(
      request({ body: sendBody({ dailySendLimit: 500, participantId: "p-1" }) }),
      reply(),
    );

    expect(m.update.mock.calls[0][2]).not.toHaveProperty("dailySendLimit");
    expect(m.enqueue.mock.calls[0][0].dailySendLimit).toBeUndefined();
  });

  test("refuses to launch a campaign that has no template yet", async () => {
    // The wizard lets a draft be saved with only a name. That is deliberate, and
    // this is where the missing pieces are caught instead.
    m.byId.mockResolvedValue({
      id: CAMPAIGN_ID,
      status: CampaignStatus.DRAFT,
      orgId: ORG_A,
      type: CampaignType.WHATSAPP,
      waTemplateId: null,
      dripStages: [],
    });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(sent(rep).code).toBe("CAMPAIGN_INCOMPLETE");
    expect(m.enqueue).not.toHaveBeenCalled();
  });

  test("refuses to launch a drip campaign that has no stages yet", async () => {
    m.byId.mockResolvedValue({
      id: CAMPAIGN_ID,
      status: CampaignStatus.DRAFT,
      orgId: ORG_A,
      type: CampaignType.DRIP,
      waTemplateId: null,
      dripStages: [],
    });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody({ type: CampaignType.WHATSAPP }) }), rep);

    expect(sent(rep).code).toBe("CAMPAIGN_INCOMPLETE");
  });

  test("saves a retry policy passed with the send, before anything is queued", async () => {
    const retryPolicy = { enabled: true, strategy: "SMART", maxAttempts: 2 };
    await sendCampaignHandler(request({ body: sendBody({ retryPolicy }) }), reply());

    // Ordering matters: the policy has to be in place by the time the first
    // attempt drains and asks whether to schedule a retry.
    expect(upsertCampaignRetryPolicy).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, retryPolicy);
    expect(m.enqueue).toHaveBeenCalled();
  });

  test("cancels a pending automatic retry before a manual send takes over", async () => {
    await sendCampaignHandler(request({ body: sendBody() }), reply());

    expect(m.cancelSends).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      expect.objectContaining({ onlyScheduled: true }),
    );
  });

  test("reports a conflict when another send already owns the campaign", async () => {
    m.createSend.mockRejectedValue(new CampaignSendInProgressError());
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(409);
    expect(sent(rep).code).toBe("CAMPAIGN_SEND_IN_PROGRESS");
    expect(m.enqueue).not.toHaveBeenCalled();
  });

  test("lets go of a campaign stuck mid-queue once its send has gone stale", async () => {
    // Before this, a lost fan-out job left the campaign refusing every further
    // action — including its own cancellation.
    m.byId.mockResolvedValue({
      id: CAMPAIGN_ID,
      status: CampaignStatus.QUEUING,
      orgId: ORG_A,
      type: CampaignType.WHATSAPP,
      waTemplateId: "tpl-1",
      dripStages: [],
    });
    m.liveSend.mockResolvedValue({
      id: SEND_ID,
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.cancelSends).toHaveBeenCalled();
    expect(sent(rep).code).toBe("ENQUEUE_REQUEST_ACCEPTED");
  });

  test("refuses a send when the allowance is already spent", async () => {
    // A campaign started with nothing left only produces a queue of messages that each
    // fail in the dispatcher, and a campaign stuck in QUEUING with no explanation.
    m.preflight.mockResolvedValue({
      recipients: 50,
      metered: true,
      max: 5_000,
      used: 5_000,
      remaining: 0,
      isAnnual: false,
      exhausted: true,
      shortfall: 50,
    });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(rep.status).toHaveBeenCalledWith(403);
    expect(sent(rep).code).toBe("CONVERSATION_LIMIT_REACHED");
    expect(sent(rep).message).toContain("5,000 conversations");
    expect(m.enqueue).not.toHaveBeenCalled();
  });

  test("still sends a campaign that merely outruns the allowance", async () => {
    // 50 people, 45 left: the dialog has already said where it stops, and sending to as
    // many as the plan covers is the customer's call to make.
    m.preflight.mockResolvedValue({
      recipients: 50,
      metered: true,
      max: 5_000,
      used: 4_955,
      remaining: 45,
      isAnnual: false,
      exhausted: false,
      shortfall: 5,
    });
    const rep = reply();

    await sendCampaignHandler(request({ body: sendBody() }), rep);

    expect(m.enqueue).toHaveBeenCalled();
    expect(sent(rep).code).toBe("ENQUEUE_REQUEST_ACCEPTED");
  });

  test("answers 500 when something goes wrong along the way", async () => {
    m.preflight.mockRejectedValue(new Error("db down"));
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
    // The rollback records why, and marks the campaign failed rather than paused.
    expect(m.update.mock.calls.at(-1)![2]).toMatchObject({
      status: CampaignStatus.FAILED,
      errorMessage: "Campaign not scheduled",
    });
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
