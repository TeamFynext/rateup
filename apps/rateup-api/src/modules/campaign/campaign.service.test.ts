import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    campaign: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    team: { findFirst: vi.fn() },
    campaignDripStage: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignStats: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    campaignSend: { findMany: vi.fn(), findFirst: vi.fn() },
    campaignParticipant: { count: vi.fn(), findMany: vi.fn() },
    campaignParticipantDripStage: { count: vi.fn(), createMany: vi.fn() },
    waFlow: { findFirst: vi.fn() },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      __fragment: strings.join("?"),
      values,
    }),
    empty: { __fragment: "", values: [] },
  },
}));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({}));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.auth.js", () => ({
  checkConversationLimitAvailable: vi.fn(),
}));
vi.mock("../whatsapp/flows/flow.service.js", () => ({ getFlowBySurveyId: vi.fn() }));
vi.mock("hucre", () => ({ write: vi.fn(async () => Buffer.from("workbook")) }));

import { write } from "hucre";
import { pauseCampaignForAccountIssue } from "./campaignPause.service.js";
vi.mock("../../workers/bullmq/queues/index.js", () => ({
  getCampaignCount: vi.fn(),
  waCampaignDequeue: { add: vi.fn() },
  waCampaignEnqueue: { add: vi.fn() },
  waMessageQueue: { getDelayed: vi.fn() },
}));
vi.mock("./campaignSend.service.js", async () => {
  const actual = await vi.importActual<typeof import("./campaignSend.service.js")>(
    "./campaignSend.service.js",
  );
  return {
    ...actual,
    cancelCampaignSends: vi.fn(),
    createCampaignSend: vi.fn(),
    failCampaignSend: vi.fn(),
  };
});
// Reaches Redis and the queue; its own suite covers what a pause does.
vi.mock("./campaignPause.service.js", () => ({
  pauseCampaignForAccountIssue: vi.fn(async () => true),
}));
// Reaches Redis and the message queue, which this suite has neither of.
vi.mock("./campaignCancel.service.js", () => ({
  cancelPendingCampaignJobs: vi.fn(async () => ({ removed: 0, locked: 0, sends: 0 })),
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { checkConversationLimitAvailable } from "../whatsapp/whatsappSurvey/wasurvey.auth.js";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service.js";
import {
  getCampaignCount,
  waCampaignDequeue,
  waCampaignEnqueue,
  waMessageQueue,
} from "../../workers/bullmq/queues/index.js";
import {
  CampaignParticipantStatus,
  CampaignPauseReason,
  CampaignStatus,
} from "../../types/enums.js";
import {
  backfillDripStageParticipants,
  CampaignNotFoundError,
  createCampaign,
  deleteCampaign,
  deleteCampaignParticipantsByCampaignId,
  enqueueCampaignMessage,
  getCampaginStatsById,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaignParticipantCountByStatuses,
  getCampaignScheduleInfo,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  getFlowIdFromTemplateComponents,
  getLatestStatus,
  getResponseExcelByCampaignById,
  sendCampaign,
  sendCampaignCronAction,
  updateCampaign,
} from "./campaign.service.js";
import { cancelCampaignSends, createCampaignSend } from "./campaignSend.service.js";
import { cancelPendingCampaignJobs } from "./campaignCancel.service.js";

type Mock = ReturnType<typeof vi.fn>;

const SEND_ID = "00000000-0000-0000-0000-0000000000ff";
const createSendMock = createCampaignSend as unknown as Mock;
const cancelSendsMock = cancelCampaignSends as unknown as Mock;
const cancelJobsMock = cancelPendingCampaignJobs as unknown as Mock;

const db = prisma as unknown as {
  $queryRaw: Mock;
  campaign: Record<
    | "count"
    | "create"
    | "delete"
    | "findFirst"
    | "findMany"
    | "findUnique"
    | "update"
    | "updateMany",
    Mock
  >;
  team: { findFirst: Mock };
  campaignDripStage: Record<
    "create" | "createMany" | "deleteMany" | "findFirst" | "findMany" | "findUnique" | "update",
    Mock
  >;
  campaignStats: Record<"create" | "findFirst" | "findUnique", Mock>;
  campaignSend: Record<"findMany" | "findFirst", Mock>;
  campaignParticipant: { count: Mock; findMany: Mock };
  campaignParticipantDripStage: { count: Mock; createMany: Mock };
  waFlow: { findFirst: Mock };
};
const limitExceededMock = checkConversationLimitAvailable as unknown as Mock;
const getFlowBySurveyIdMock = getFlowBySurveyId as unknown as Mock;
const getCampaignCountMock = getCampaignCount as unknown as Mock;
const enqueueAdd = (waCampaignEnqueue as unknown as { add: Mock }).add;
const dequeueAdd = (waCampaignDequeue as unknown as { add: Mock }).add;
const getDelayedMock = (waMessageQueue as unknown as { getDelayed: Mock }).getDelayed;

const ORG_A = "org-a";
const ALL_ACTOR = { scope: { all: true, teamIds: [] } } as any;
const CAMPAIGN_ID = "camp-1";

/** Reconstructs a $queryRaw call's SQL, with fragments spliced back in. */
function queryAt(index = 0) {
  const [strings, ...values] = db.$queryRaw.mock.calls[index];
  let sql = "";
  const bound: unknown[] = [];
  (strings as string[]).forEach((chunk, i) => {
    sql += chunk;
    const value: any = values[i];
    if (value && typeof value === "object" && "__fragment" in value) {
      sql += value.__fragment;
      bound.push(...value.values);
    } else if (i < values.length) {
      sql += "?";
      bound.push(value);
    }
  });
  return { sql, bound };
}

beforeEach(() => {
  (createCampaignSend as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: SEND_ID,
    attemptNo: 0,
  });
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([]);
  db.campaign.create.mockResolvedValue({ id: CAMPAIGN_ID });
  db.campaign.update.mockResolvedValue({ id: CAMPAIGN_ID });
  db.campaign.delete.mockResolvedValue({ id: CAMPAIGN_ID });
  db.campaign.findMany.mockResolvedValue([]);
  db.campaign.findUnique.mockResolvedValue({ team: { orgId: ORG_A } });
  db.campaignDripStage.createMany.mockResolvedValue({ count: 0 });
  db.campaignDripStage.findMany.mockResolvedValue([]);
  db.campaignDripStage.findFirst.mockResolvedValue(null);
  db.campaignStats.create.mockResolvedValue({});
  db.campaignStats.findFirst.mockResolvedValue(null);
  db.campaignParticipant.count.mockResolvedValue(0);
  db.campaignParticipantDripStage.count.mockResolvedValue(0);
  db.waFlow.findFirst.mockResolvedValue({ dbFlowId: "dbflow-1" });
  limitExceededMock.mockResolvedValue(true);
  getCampaignCountMock.mockResolvedValue(0);
  getDelayedMock.mockResolvedValue([]);
  enqueueAdd.mockReturnValue(undefined);
  dequeueAdd.mockReturnValue(undefined);
});

describe("getLatestStatus", () => {
  function mapping(stats: Record<string, unknown>) {
    return { waMessage: { stats } };
  }

  test("reports the status with the most recent timestamp", () => {
    const result = getLatestStatus([
      mapping({
        sent: "2026-03-01T10:00:00Z",
        delivered: "2026-03-01T10:00:05Z",
        read: "2026-03-01T10:01:00Z",
      }),
    ] as any);

    expect(result).toBe("read");
  });

  test("looks across every message a participant received", () => {
    const result = getLatestStatus([
      mapping({ sent: "2026-03-01T10:00:00Z" }),
      mapping({ delivered: "2026-03-02T10:00:00Z" }),
    ] as any);

    expect(result).toBe("delivered");
  });

  test("skips a status whose timestamp is the empty string", () => {
    const result = getLatestStatus([
      mapping({ sent: "2026-03-01T10:00:00Z", read: "", delivered: "" }),
    ] as any);

    expect(result).toBe("sent");
  });

  test("reports nothing for a participant with no messages", () => {
    expect(getLatestStatus([])).toBeNull();
    expect(getLatestStatus(undefined as any)).toBeNull();
  });

  test("copes with a mapping that carries no message at all", () => {
    expect(getLatestStatus([{}] as any)).toBeNull();
  });
});

describe("reading campaigns", () => {
  test("returns the single campaign the query found", async () => {
    db.$queryRaw.mockResolvedValue([{ id: CAMPAIGN_ID, name: "March push" }]);

    await expect(getCampaignById(CAMPAIGN_ID, ORG_A)).resolves.toEqual({
      id: CAMPAIGN_ID,
      name: "March push",
    });
  });

  test("brings the template, team and flow version back with the campaign", async () => {
    await getCampaignById(CAMPAIGN_ID, ORG_A);

    const { sql } = queryAt(0);
    expect(sql).toContain('"templateData"');
    expect(sql).toContain('"teamName"');
    expect(sql).toContain('"flowVersion"');
    expect(sql).toContain('"dripStages"');
  });

  test("lists a team's campaigns with a completed-participant count", async () => {
    await getCampaignsByTeamId("team-1", ORG_A);

    const call = db.campaign.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ teamId: "team-1", team: { orgId: ORG_A } });
    expect(call.include._count.select.campaignParticipants.where).toEqual({
      status: CampaignParticipantStatus.COMPLETED,
    });
  });

  test("scopes the org-wide listing to the caller's org", async () => {
    await getCampaignsByOrgId(ORG_A);

    const { sql, bound } = queryAt(0);
    expect(sql).toContain('t."orgId" =');
    expect(bound).toContain(ORG_A);
  });

  test("narrows the org-wide listing by campaign type when one is named", async () => {
    await getCampaignsByOrgId(ORG_A, "DRIP");

    const { sql, bound } = queryAt(0);
    expect(sql).toContain("c.type =");
    expect(bound).toContain("DRIP");
  });

  test("leaves every type in when none is named", async () => {
    await getCampaignsByOrgId(ORG_A);

    expect(queryAt(0).sql).not.toContain("c.type =");
  });

  test("scopes a campaign lookup to the org asking", async () => {
    await getCampaignById(CAMPAIGN_ID, ORG_A);

    const { sql, bound } = queryAt(0);
    expect(sql).toContain('t."orgId" =');
    expect(bound).toEqual([CAMPAIGN_ID, ORG_A]);
  });

  test("lists a team's campaigns only when the team is the caller's", async () => {
    await getCampaignsByTeamId("another-orgs-team", ORG_A);

    expect(db.campaign.findMany.mock.calls[0][0].where).toEqual({
      teamId: "another-orgs-team",
      team: { orgId: ORG_A },
    });
  });
});

describe("createCampaign", () => {
  const input: any = { name: "March push", type: "REGULAR", teamId: "team-1" };

  beforeEach(() => {
    db.team.findFirst.mockResolvedValue({ id: "team-1" });
  });

  test("creates the campaign, its drip stages and its stats row", async () => {
    await createCampaign(
      { ...input, dripStages: [{ templateId: "tpl-1", delay: 1 }] },
      ORG_A,
      ALL_ACTOR,
    );

    expect(db.campaign.create.mock.calls[0][0].data).toMatchObject({
      name: "March push",
      teamId: "team-1",
    });
    expect(db.campaignDripStage.createMany.mock.calls[0][0].data).toEqual([
      {
        campaignId: CAMPAIGN_ID,
        waTemplateId: "tpl-1",
        delay: 1,
        delayUnit: undefined,
        sendAtTime: undefined,
      },
    ]);
    expect(db.campaignStats.create.mock.calls[0][0].data).toEqual({ campaignId: CAMPAIGN_ID });
  });

  test("stores an empty tag list when none was given", async () => {
    await createCampaign(input, ORG_A, ALL_ACTOR);

    expect(db.campaign.create.mock.calls[0][0].data.dynamicTags).toEqual([]);
  });

  test("resolves a Meta flow id to our own before storing it", async () => {
    await createCampaign({ ...input, flowId: "wa-flow-1" }, ORG_A, ALL_ACTOR);

    expect(db.waFlow.findFirst.mock.calls[0][0]).toEqual({
      where: { flowId: "wa-flow-1", orgId: ORG_A },
    });
    expect(db.campaign.create.mock.calls[0][0].data.flowId).toBe("dbflow-1");
  });

  test("refuses a team belonging to another org", async () => {
    db.team.findFirst.mockResolvedValue(null);

    await expect(
      createCampaign({ ...input, teamId: "another-orgs-team" }, ORG_A, ALL_ACTOR),
    ).rejects.toThrow("Team not found");
    expect(db.campaign.create).not.toHaveBeenCalled();
  });

  test("resolves the team against the caller's org", async () => {
    await createCampaign(input, ORG_A, ALL_ACTOR);

    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({ id: "team-1", orgId: ORG_A });
  });

  test("stores an empty flow id for a campaign that has no flow", async () => {
    await createCampaign(input, ORG_A, ALL_ACTOR);

    expect(db.waFlow.findFirst).not.toHaveBeenCalled();
    expect(db.campaign.create.mock.calls[0][0].data.flowId).toBe("");
  });

  test("stores the status the wizard posted", async () => {
    await createCampaign({ ...input, status: "DRAFT" }, ORG_A, ALL_ACTOR);

    expect(db.campaign.create.mock.calls[0][0].data.status).toBe("DRAFT");
  });

  test("falls back to DRAFT when no status was given", async () => {
    await createCampaign(input, ORG_A, ALL_ACTOR);

    expect(db.campaign.create.mock.calls[0][0].data.status).toBe("DRAFT");
  });

  test("throws for a flow id that matches nothing", async () => {
    db.waFlow.findFirst.mockResolvedValue(null);

    await expect(createCampaign({ ...input, flowId: "nope" }, ORG_A, ALL_ACTOR)).rejects.toThrow(
      "WaFlow with flowId nope not found.",
    );
  });
});

describe("updateCampaign", () => {
  test("writes the fields it was given", async () => {
    await updateCampaign(CAMPAIGN_ID, ORG_A, { name: "Renamed" } as any);

    expect(db.campaign.update.mock.calls[0][0]).toEqual({
      where: { id: CAMPAIGN_ID, team: { orgId: ORG_A } },
      data: { name: "Renamed" },
    });
  });

  test("stamps the start time only the first time a campaign runs", async () => {
    db.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });
    const startedAt = new Date("2026-03-01T00:00:00Z");

    await updateCampaign(CAMPAIGN_ID, ORG_A, { startedAt } as any);

    expect(db.campaign.findFirst.mock.calls[0][0].where).toEqual({
      id: CAMPAIGN_ID,
      startedAt: null,
      team: { orgId: ORG_A },
    });
    expect(db.campaign.update.mock.calls[0][0].data).toEqual({ startedAt });
  });

  test("leaves an already-started campaign's start time alone", async () => {
    db.campaign.findFirst.mockResolvedValue(null);

    await updateCampaign(CAMPAIGN_ID, ORG_A, { startedAt: new Date() } as any);

    expect(db.campaign.update).toHaveBeenCalledTimes(1);
    expect(db.campaign.update.mock.calls[0][0].data).not.toHaveProperty("startedAt");
  });

  test("adds a drip stage that carries no id", async () => {
    db.campaignDripStage.create.mockResolvedValue({ id: "stage-new" });
    db.campaignParticipant.findMany.mockResolvedValue([]);

    await updateCampaign(CAMPAIGN_ID, ORG_A, {
      dripStages: [{ templateId: "tpl-1", delay: 2, delayUnit: "days" }],
    } as any);

    expect(db.campaignDripStage.create.mock.calls[0][0].data).toEqual({
      campaignId: CAMPAIGN_ID,
      waTemplateId: "tpl-1",
      delay: 2,
      delayUnit: "days",
      sendAtTime: null,
    });
  });

  test("enrols the existing audience into a stage added later", async () => {
    // Without this the new stage has no `CampaignParticipantDripStage` rows, and
    // the dispatcher — which reads that table, not the stage table — sends it to
    // nobody without saying so.
    db.campaignDripStage.create.mockResolvedValue({ id: "stage-new" });
    db.campaignParticipant.findMany.mockResolvedValue([{ id: "p1" }]);
    db.campaignParticipantDripStage.createMany.mockResolvedValue({ count: 1 });

    await updateCampaign(CAMPAIGN_ID, ORG_A, {
      dripStages: [{ templateId: "tpl-1", delay: 2, delayUnit: "days" }],
    } as any);

    expect(db.campaignParticipantDripStage.createMany.mock.calls[0][0].data).toEqual([
      { participantId: "p1", dripStageId: "stage-new", status: "PENDING" },
    ]);
  });

  test("does not re-enrol anyone when only existing stages are edited", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([{ id: "stage-1" }]);

    await updateCampaign(CAMPAIGN_ID, ORG_A, {
      dripStages: [{ id: "stage-1", templateId: "tpl-2", delay: 3 }],
    } as any);

    expect(db.campaignParticipantDripStage.createMany).not.toHaveBeenCalled();
  });

  test("rewrites a drip stage that names an existing id", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([{ id: "stage-1" }]);

    await updateCampaign(CAMPAIGN_ID, ORG_A, {
      dripStages: [{ id: "stage-1", templateId: "tpl-2", delay: 3 }],
    } as any);

    expect(db.campaignDripStage.update.mock.calls[0][0].where).toEqual({
      id: "stage-1",
      campaignId: CAMPAIGN_ID,
    });
    expect(db.campaignDripStage.deleteMany).not.toHaveBeenCalled();
  });

  test("removes the drip stages the update left out", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([{ id: "stage-1" }, { id: "stage-2" }]);

    await updateCampaign(CAMPAIGN_ID, ORG_A, {
      dripStages: [{ id: "stage-1", templateId: "tpl-1", delay: 1 }],
    } as any);

    expect(db.campaignDripStage.deleteMany.mock.calls[0][0].where).toEqual({
      id: { in: ["stage-2"] },
      campaignId: CAMPAIGN_ID,
    });
  });

  test("leaves the drip stages alone when the update mentions none", async () => {
    await updateCampaign(CAMPAIGN_ID, ORG_A, { name: "Renamed" } as any);

    expect(db.campaignDripStage.findMany).not.toHaveBeenCalled();
  });

  test("cannot rewrite a drip stage that belongs to a different campaign", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([]);

    await updateCampaign(CAMPAIGN_ID, ORG_A, {
      dripStages: [{ id: "another-campaigns-stage", templateId: "tpl-9", delay: 1 }],
    } as any);

    expect(db.campaignDripStage.update.mock.calls[0][0].where).toEqual({
      id: "another-campaigns-stage",
      campaignId: CAMPAIGN_ID,
    });
  });

  test("scopes the delete to the caller's org", async () => {
    db.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });

    await deleteCampaign(CAMPAIGN_ID, ORG_A);

    expect(db.campaign.delete.mock.calls[0][0]).toEqual({
      where: { id: CAMPAIGN_ID, team: { orgId: ORG_A } },
    });
  });

  test("takes the campaign's pending messages out of the queue before deleting it", async () => {
    db.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });
    const order: string[] = [];
    cancelJobsMock.mockImplementation(async () => {
      order.push("cancel");
      return { removed: 3, locked: 0, sends: 1 };
    });
    db.campaign.delete.mockImplementation(async () => {
      order.push("delete");
      return {};
    });

    await deleteCampaign(CAMPAIGN_ID, ORG_A);

    expect(cancelJobsMock).toHaveBeenCalledWith(CAMPAIGN_ID);
    // The cancellation finds its sends by querying rows the delete cascades
    // away, so it cannot run after — or alongside — the delete.
    expect(order).toEqual(["cancel", "delete"]);
  });

  test("disarms scheduled retries, which have a job but no queued messages", async () => {
    db.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });

    await deleteCampaign(CAMPAIGN_ID, ORG_A);

    expect(cancelSendsMock).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      expect.objectContaining({ note: expect.stringContaining("deleted") }),
    );
  });

  test("cancels nothing when the campaign belongs to another org", async () => {
    db.campaign.findFirst.mockResolvedValue(null);

    await expect(deleteCampaign(CAMPAIGN_ID, ORG_A)).rejects.toThrow(CampaignNotFoundError);

    // Otherwise a guessed id from another org would stop that org's campaign on
    // its way to a 404.
    expect(cancelJobsMock).not.toHaveBeenCalled();
    expect(cancelSendsMock).not.toHaveBeenCalled();
    expect(db.campaign.delete).not.toHaveBeenCalled();
  });
});

describe("sendCampaign", () => {
  test("opens a send session and hands the campaign to the queue", async () => {
    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]);

    expect(db.campaign.update.mock.calls.at(-1)![0].data).toMatchObject({
      status: CampaignStatus.QUEUING,
      errorMessage: null,
    });
    expect(createSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: CAMPAIGN_ID,
        trigger: "SCHEDULED",
        targetStatuses: [CampaignParticipantStatus.PENDING],
      }),
    );
    expect(enqueueAdd.mock.calls[0][1]).toMatchObject({
      campaignId: CAMPAIGN_ID,
      campaignSendId: SEND_ID,
      sendToStatuses: [CampaignParticipantStatus.PENDING],
    });
  });

  test("falls back to pending and failed when the schedule named no statuses", async () => {
    // Every live write of `scheduledStatuses` is `[]`, which used to mean the
    // legacy loop skipped every participant and the campaign silently sent
    // nothing.
    await sendCampaign(CAMPAIGN_ID, []);

    expect(enqueueAdd.mock.calls[0][1].sendToStatuses).toEqual([
      CampaignParticipantStatus.PENDING,
      CampaignParticipantStatus.FAILED,
    ]);
  });

  test("rolls the campaign back when the queue refuses the job", async () => {
    enqueueAdd.mockRejectedValue(new Error("redis is down"));

    await expect(sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING])).rejects.toThrow();
    // FAILED, not INACTIVE: a campaign the queue refused was not paused by anyone.
    expect(db.campaign.update.mock.calls.at(-1)![0].data).toMatchObject({
      status: CampaignStatus.FAILED,
    });
  });

  test("pauses, rather than fails, when the org is over its conversation limit", async () => {
    limitExceededMock.mockResolvedValue(false);

    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]);

    expect(pauseCampaignForAccountIssue).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignPauseReason.CONVERSATION_LIMIT,
    );
    expect(db.campaign.update).not.toHaveBeenCalled();
    expect(enqueueAdd).not.toHaveBeenCalled();
  });

  test("refuses when the campaign's org cannot be determined", async () => {
    db.campaign.findUnique.mockResolvedValue(null);

    await expect(sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING])).rejects.toThrow(
      "not found",
    );
    expect(enqueueAdd).not.toHaveBeenCalled();
  });

  test("treats a true answer from the limit check as permission to send", async () => {
    limitExceededMock.mockResolvedValue(true);

    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]);

    expect(enqueueAdd).toHaveBeenCalled();
  });
});

describe("sendCampaignCronAction", () => {
  test("sends every scheduled campaign whose time has come", async () => {
    db.campaign.findMany.mockResolvedValue([
      { id: "camp-1", scheduledStatuses: [CampaignParticipantStatus.PENDING] },
      { id: "camp-2", scheduledStatuses: [] },
    ]);

    await sendCampaignCronAction();

    expect(enqueueAdd).toHaveBeenCalledTimes(2);
  });

  test("looks only at scheduled campaigns due within the next five minutes", async () => {
    await sendCampaignCronAction();

    const { where } = db.campaign.findMany.mock.calls[0][0];
    expect(where.AND[0]).toEqual({ status: CampaignStatus.SCHEDULED });
    expect(where.AND[1].campaignSentAt.lte).toBeInstanceOf(Date);
    expect(where.NOT).toEqual({ campaignSentAt: null });
  });

  test("does nothing when nothing is due", async () => {
    await sendCampaignCronAction();

    expect(enqueueAdd).not.toHaveBeenCalled();
  });

  test("sends the campaigns behind one that fails", async () => {
    db.campaign.findMany.mockResolvedValue([
      { id: "camp-1", scheduledStatuses: [] },
      { id: "camp-2", scheduledStatuses: [] },
    ]);
    enqueueAdd.mockRejectedValueOnce(new Error("template gone"));

    await expect(sendCampaignCronAction()).resolves.toBeUndefined();
    expect(enqueueAdd).toHaveBeenCalledTimes(2);
  });
});

describe("enqueueCampaignMessage", () => {
  test("hands the campaign to the dispatcher as one instruction", async () => {
    await enqueueCampaignMessage({
      campaignId: CAMPAIGN_ID,
      campaignSendId: SEND_ID,
      sendToStatuses: [CampaignParticipantStatus.PENDING],
      participantId: "p-1",
    });

    expect(enqueueAdd.mock.calls[0][0]).toBe(CAMPAIGN_ID);
    expect(enqueueAdd.mock.calls[0][1]).toMatchObject({
      campaignId: CAMPAIGN_ID,
      // The send session travels with the job: it is what scopes the BullMQ job
      // ids, and without it a resend would be deduplicated away.
      campaignSendId: SEND_ID,
      sendToStatuses: [CampaignParticipantStatus.PENDING],
      participantId: "p-1",
    });
  });

  test("carries the daily cap through to the dispatcher", async () => {
    await enqueueCampaignMessage({
      campaignId: CAMPAIGN_ID,
      campaignSendId: SEND_ID,
      sendToStatuses: [],
      dailySendLimit: 500,
    });

    expect(enqueueAdd.mock.calls[0][1].dailySendLimit).toBe(500);
  });

  test("reports the failure of an enqueue that rejects", async () => {
    enqueueAdd.mockRejectedValue(new Error("redis is down"));

    await expect(
      enqueueCampaignMessage({
        campaignId: CAMPAIGN_ID,
        campaignSendId: SEND_ID,
        sendToStatuses: [],
      }),
    ).resolves.toEqual({
      status: false,
      message: "Campaign not scheduled, please try again",
    });
  });

  test("reports failure when the add throws synchronously too", async () => {
    enqueueAdd.mockImplementation(() => {
      throw new Error("queue not initialised");
    });

    await expect(
      enqueueCampaignMessage({
        campaignId: CAMPAIGN_ID,
        campaignSendId: SEND_ID,
        sendToStatuses: [],
      }),
    ).resolves.toEqual({
      status: false,
      message: "Campaign not scheduled, please try again",
    });
  });

  test("waits to hear a dequeue was accepted", async () => {
    await expect(deleteCampaignParticipantsByCampaignId(CAMPAIGN_ID)).resolves.toEqual({
      status: true,
      message: "Campaign dequeue requested",
    });

    expect(dequeueAdd).toHaveBeenCalledWith(CAMPAIGN_ID, { campaignId: CAMPAIGN_ID });
  });

  test("reports a dequeue that could not be requested", async () => {
    dequeueAdd.mockRejectedValue(new Error("redis is down"));

    await expect(deleteCampaignParticipantsByCampaignId(CAMPAIGN_ID)).resolves.toMatchObject({
      status: false,
    });
  });
});

describe("getCampaignScheduleInfo", () => {
  const NOW = 1_700_000_000_000;

  // Delayed jobs are named after the *send session*, not the campaign, so the
  // schedule is read by first resolving the campaign's live sends.
  beforeEach(() => {
    db.campaignSend.findMany.mockResolvedValue([{ id: SEND_ID }]);
  });

  test("reports nothing parked when the queue holds no delayed jobs", async () => {
    await expect(getCampaignScheduleInfo(CAMPAIGN_ID)).resolves.toEqual({
      scheduledCount: 0,
      nextBatchAt: null,
      nextBatchCount: 0,
    });
  });

  test("counts only the jobs belonging to this campaign", async () => {
    getDelayedMock.mockResolvedValue([
      { name: SEND_ID, timestamp: NOW, opts: { delay: 1000 } },
      { name: "another-send", timestamp: NOW, opts: { delay: 1000 } },
    ]);

    const result = await getCampaignScheduleInfo(CAMPAIGN_ID);

    expect(result.scheduledCount).toBe(1);
  });

  test("reports when the next batch is released and how big it is", async () => {
    getDelayedMock.mockResolvedValue([
      { name: SEND_ID, timestamp: NOW, opts: { delay: 1000 } },
      { name: SEND_ID, timestamp: NOW, opts: { delay: 2000 } },
      { name: SEND_ID, timestamp: NOW, opts: { delay: 24 * 60 * 60 * 1000 } },
    ]);

    const result = await getCampaignScheduleInfo(CAMPAIGN_ID);

    expect(result.scheduledCount).toBe(3);
    expect(result.nextBatchAt).toBe(new Date(NOW + 1000).toISOString());
    expect(result.nextBatchCount).toBe(2);
  });

  test("treats a job with no delay as due immediately", async () => {
    getDelayedMock.mockResolvedValue([{ name: SEND_ID, timestamp: NOW, opts: {} }]);

    const result = await getCampaignScheduleInfo(CAMPAIGN_ID);

    expect(result.nextBatchAt).toBe(new Date(NOW).toISOString());
  });

  test("reports nothing rather than failing when the queue cannot be read", async () => {
    getDelayedMock.mockRejectedValue(new Error("redis is down"));

    await expect(getCampaignScheduleInfo(CAMPAIGN_ID)).resolves.toEqual({
      scheduledCount: 0,
      nextBatchAt: null,
      nextBatchCount: 0,
    });
  });
});

describe("getCampaginStatsById", () => {
  const STATS = {
    totalRead: 5,
    totalSend: 20,
    totalFailed: 2,
    totalDelivered: 18,
    totalCompleted: 4,
    campaign: { _count: { campaignParticipants: 7 } },
  };

  test("reports the stored counters alongside what is still queued", async () => {
    db.campaignStats.findFirst.mockResolvedValue(STATS);
    getCampaignCountMock.mockResolvedValue(3);

    await expect(getCampaginStatsById(CAMPAIGN_ID, ORG_A)).resolves.toMatchObject({
      countRead: 5,
      countSent: 20,
      countFailed: 2,
      countDelivered: 18,
      countPending: 7,
      countCompleted: 4,
      queueCount: 3,
      scheduledCount: 0,
    });
  });

  test("reports zeroes for a campaign with no stats row yet", async () => {
    await expect(getCampaginStatsById(CAMPAIGN_ID, ORG_A)).resolves.toEqual({
      countRead: 0,
      countSent: 0,
      countFailed: 0,
      countDelivered: 0,
      countPending: 0,
      countCompleted: 0,
      queueCount: 0,
      scheduledCount: 0,
      nextBatchAt: null,
      nextBatchCount: 0,
    });
  });

  test("reports one drip stage's counters when a stage is named", async () => {
    db.campaignDripStage.findFirst.mockResolvedValue({
      totalRead: 1,
      totalSend: 2,
      totalFailed: 0,
      totalDelivered: 2,
      totalCompleted: 1,
      _count: { CampaignParticipantDripStage: 3 },
    });

    const result = await getCampaginStatsById(CAMPAIGN_ID, ORG_A, "stage-1");

    expect(db.campaignDripStage.findFirst.mock.calls[0][0].where).toEqual({
      id: "stage-1",
      campaignId: CAMPAIGN_ID,
      campaign: { team: { orgId: ORG_A } },
    });
    expect(result).toMatchObject({ countRead: 1, countPending: 3 });
  });

  test("answers with one shape whichever branch it took", async () => {
    const keys = (value: object) => Object.keys(value).sort();

    const empty = await getCampaginStatsById(CAMPAIGN_ID, ORG_A);

    db.campaignStats.findFirst.mockResolvedValue(STATS);
    const populated = await getCampaginStatsById(CAMPAIGN_ID, ORG_A);

    db.campaignDripStage.findFirst.mockResolvedValue({
      totalRead: 0,
      totalSend: 0,
      totalFailed: 0,
      totalDelivered: 0,
      totalCompleted: 0,
      _count: { CampaignParticipantDripStage: 0 },
    });
    const perStage = await getCampaginStatsById(CAMPAIGN_ID, ORG_A, "stage-1");

    expect(keys(populated)).toEqual(keys(empty));
    expect(keys(perStage)).toEqual(keys(empty));
    expect(keys(empty)).toContain("queueCount");
    expect(keys(empty)).toContain("scheduledCount");
  });

  test("reports nothing for a drip stage that belongs to another campaign", async () => {
    db.campaignDripStage.findFirst.mockResolvedValue(null);

    const result = await getCampaginStatsById(CAMPAIGN_ID, ORG_A, "another-campaigns-stage");

    expect(result.countRead).toBe(0);
  });
});

describe("getResponseExcelByCampaignById", () => {
  beforeEach(() => {
    db.campaign.findFirst.mockResolvedValue({ name: "March push" });
  });

  test("pages through the participants until a batch comes back empty", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2026-03-01"),
          contactName: "Ada",
          contactPhone: "1",
          status: "SENT",
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getResponseExcelByCampaignById(CAMPAIGN_ID, ORG_A);

    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result.title).toBe("March push");
  });

  test("reads from the drip-stage table when a stage is named", async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValue([]);

    await getResponseExcelByCampaignById(CAMPAIGN_ID, ORG_A, "stage-1");

    expect(queryAt(0).sql).toContain('"CampaignParticipantDripStage"');
  });

  test("ties the drip-stage export to the campaign it was asked about", async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValue([]);

    await getResponseExcelByCampaignById(CAMPAIGN_ID, ORG_A, "another-campaigns-stage");

    const { sql, bound } = queryAt(0);
    expect(bound).toContain("another-campaigns-stage");
    expect(bound).toContain(CAMPAIGN_ID);
    expect(sql).toContain('cp."campaignId"');
  });

  test("counts the failures that still stand, not every failed attempt", async () => {
    // `CampaignStats.totalFailed` is bumped once per failed attempt, so a
    // recipient a retry recovered stayed in it forever and the spreadsheet
    // disagreed with the campaign page. The sheet reads the participants.
    db.$queryRaw.mockResolvedValue([]);
    db.campaignParticipant.count.mockResolvedValue(3);

    await getResponseExcelByCampaignById(CAMPAIGN_ID, ORG_A);

    const [sheets] = vi.mocked(write).mock.calls.at(-1) ?? [];
    const stats = sheets?.sheets.find((sheet) => sheet.name === "Stats");
    expect(stats?.data?.[0]).toMatchObject({ countFailed: 3 });
    const headers = stats?.columns?.map((column) => column.header) ?? [];
    expect(headers).toContain("Count Dispatched");
    expect(headers).not.toContain("Count Sent");
  });

  test("refuses a campaign belonging to another org", async () => {
    db.campaign.findFirst.mockResolvedValue(null);

    await expect(getResponseExcelByCampaignById(CAMPAIGN_ID, "org-b")).rejects.toThrow("not found");
  });
});

describe("the remaining queue helpers", () => {
  // The two CampaignMessageQueue helpers that used to be tested here are gone
  // along with the table, which nothing ever inserted into.

  test("counts the participants sitting in the statuses it was given", async () => {
    db.campaignParticipant.count.mockResolvedValue(12);

    await expect(
      getCampaignParticipantCountByStatuses(CAMPAIGN_ID, ORG_A, [
        CampaignParticipantStatus.PENDING,
      ]),
    ).resolves.toBe(12);
    expect(db.campaignParticipant.count.mock.calls[0][0].where).toEqual({
      campaignId: CAMPAIGN_ID,
      campaign: { team: { orgId: ORG_A } },
      status: { in: [CampaignParticipantStatus.PENDING] },
    });
  });
});

describe("getCampaignFilterForFlows", () => {
  test("lists the campaigns that run a survey's flow", async () => {
    getFlowBySurveyIdMock.mockResolvedValue({ dbFlowId: "dbflow-1" });
    db.campaign.findMany.mockResolvedValue([{ id: CAMPAIGN_ID, name: "March push" }]);

    await expect(getCampaignFilterForFlows("survey-1", ORG_A)).resolves.toEqual([
      { id: CAMPAIGN_ID, name: "March push" },
    ]);
    expect(getFlowBySurveyIdMock).toHaveBeenCalledWith("survey-1", ORG_A);
    expect(db.campaign.findMany.mock.calls[0][0].where).toEqual({
      flowId: "dbflow-1",
      team: { orgId: ORG_A },
    });
  });

  test("reports nothing for a survey that has no flow", async () => {
    getFlowBySurveyIdMock.mockResolvedValue(null);

    await expect(getCampaignFilterForFlows("survey-1", ORG_A)).resolves.toBeUndefined();
    expect(db.campaign.findMany).not.toHaveBeenCalled();
  });
});

describe("getFlowIdFromTemplateComponents", () => {
  test("finds the flow behind a flow button", () => {
    const components: any = [{ type: "BUTTONS", buttons: [{ type: "FLOW", flow_id: 12345 }] }];

    expect(getFlowIdFromTemplateComponents(components)).toBe("12345");
  });

  test("reports nothing when no button opens a flow", () => {
    const components: any = [{ type: "BUTTONS", buttons: [{ type: "URL" }] }];

    expect(getFlowIdFromTemplateComponents(components)).toBeUndefined();
  });

  test("reports nothing for a template with no buttons at all", () => {
    expect(getFlowIdFromTemplateComponents([{ type: "BODY" }] as any)).toBeUndefined();
  });

  test("stringifies a numeric flow id", () => {
    const components: any = [{ type: "BUTTONS", buttons: [{ type: "FLOW", flow_id: 7 }] }];

    expect(getFlowIdFromTemplateComponents(components)).toBe("7");
  });
});

/**
 * A stage added after the audience used to send to nobody.
 *
 * The dispatcher reads `CampaignParticipantDripStage`, and those rows were only
 * ever written when participants were added — so a stage created afterwards had
 * no recipients at all, silently. Going back to the wizard's Template step,
 * which sits before Audience, is the ordinary way to hit that.
 */
describe("backfillDripStageParticipants", () => {
  beforeEach(() => {
    vi.mocked(prisma.campaignParticipant.findMany).mockReset();
    vi.mocked(prisma.campaignParticipantDripStage.createMany).mockReset().mockResolvedValue({
      count: 0,
    });
  });

  test("enrols every existing participant into each new stage", async () => {
    vi.mocked(prisma.campaignParticipant.findMany).mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
    ] as never);
    vi.mocked(prisma.campaignParticipantDripStage.createMany).mockResolvedValue({ count: 4 });

    const result = await backfillDripStageParticipants("campaign-1", ["s1", "s2"]);

    expect(prisma.campaignParticipantDripStage.createMany).toHaveBeenCalledWith({
      data: [
        { participantId: "p1", dripStageId: "s1", status: "PENDING" },
        { participantId: "p1", dripStageId: "s2", status: "PENDING" },
        { participantId: "p2", dripStageId: "s1", status: "PENDING" },
        { participantId: "p2", dripStageId: "s2", status: "PENDING" },
      ],
      // The pair is uniquely indexed, so a concurrent enrolment is a no-op
      // rather than a crash.
      skipDuplicates: true,
    });
    expect(result.created).toBe(4);
  });

  test("writes nothing when the campaign has no participants yet", async () => {
    vi.mocked(prisma.campaignParticipant.findMany).mockResolvedValue([] as never);

    await backfillDripStageParticipants("campaign-1", ["s1"]);

    expect(prisma.campaignParticipantDripStage.createMany).not.toHaveBeenCalled();
  });

  test("writes nothing when no stage was added", async () => {
    await backfillDripStageParticipants("campaign-1", []);

    expect(prisma.campaignParticipant.findMany).not.toHaveBeenCalled();
  });
});
