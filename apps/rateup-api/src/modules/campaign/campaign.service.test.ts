import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    campaign: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignDripStage: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignStats: { create: vi.fn(), findUnique: vi.fn() },
    campaignParticipant: { count: vi.fn() },
    campaignMessageQueue: { findFirst: vi.fn(), updateMany: vi.fn() },
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
vi.mock("../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({
  sendCampaignToParticipants: vi.fn(),
}));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.auth.js", () => ({
  checkConversationLimitExceeded: vi.fn(),
}));
vi.mock("../whatsapp/flows/flow.service.js", () => ({ getFlowBySurveyId: vi.fn() }));
vi.mock("hucre", () => ({ write: vi.fn(async () => Buffer.from("workbook")) }));
vi.mock("../../utils/redisConnection.js", () => ({
  getCampaignCount: vi.fn(),
  waCampaignDequeue: { add: vi.fn() },
  waCampaignEnqueue: { add: vi.fn() },
  waMessageQueue: { getDelayed: vi.fn() },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { sendCampaignToParticipants } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { checkConversationLimitExceeded } from "../whatsapp/whatsappSurvey/wasurvey.auth.js";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service.js";
import {
  getCampaignCount,
  waCampaignDequeue,
  waCampaignEnqueue,
  waMessageQueue,
} from "../../utils/redisConnection.js";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums.js";
import {
  createCampaign,
  deleteCampaign,
  deleteCampaignParticipantsByCampaignId,
  doesCampaignIdExistInMessageQueue,
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
  updateCampaignMessageQueueRetryCount,
} from "./campaign.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  $queryRaw: Mock;
  campaign: Record<"count" | "create" | "delete" | "findMany" | "findUnique" | "update", Mock>;
  campaignDripStage: Record<
    "create" | "createMany" | "deleteMany" | "findMany" | "findUnique" | "update",
    Mock
  >;
  campaignStats: Record<"create" | "findUnique", Mock>;
  campaignParticipant: { count: Mock };
  campaignMessageQueue: Record<"findFirst" | "updateMany", Mock>;
  waFlow: { findFirst: Mock };
};
const sendToParticipantsMock = sendCampaignToParticipants as unknown as Mock;
const limitExceededMock = checkConversationLimitExceeded as unknown as Mock;
const getFlowBySurveyIdMock = getFlowBySurveyId as unknown as Mock;
const getCampaignCountMock = getCampaignCount as unknown as Mock;
const enqueueAdd = (waCampaignEnqueue as unknown as { add: Mock }).add;
const dequeueAdd = (waCampaignDequeue as unknown as { add: Mock }).add;
const getDelayedMock = (waMessageQueue as unknown as { getDelayed: Mock }).getDelayed;

const ORG_A = "org-a";
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
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([]);
  db.campaign.create.mockResolvedValue({ id: CAMPAIGN_ID });
  db.campaign.update.mockResolvedValue({ id: CAMPAIGN_ID });
  db.campaign.delete.mockResolvedValue({ id: CAMPAIGN_ID });
  db.campaign.findMany.mockResolvedValue([]);
  db.campaign.findUnique.mockResolvedValue({ team: { orgId: ORG_A } });
  db.campaignDripStage.createMany.mockResolvedValue({ count: 0 });
  db.campaignDripStage.findMany.mockResolvedValue([]);
  db.campaignDripStage.findUnique.mockResolvedValue(null);
  db.campaignStats.create.mockResolvedValue({});
  db.campaignStats.findUnique.mockResolvedValue(null);
  db.campaignParticipant.count.mockResolvedValue(0);
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

    await expect(getCampaignById(CAMPAIGN_ID)).resolves.toEqual({
      id: CAMPAIGN_ID,
      name: "March push",
    });
  });

  test("brings the template, team and flow version back with the campaign", async () => {
    await getCampaignById(CAMPAIGN_ID);

    const { sql } = queryAt(0);
    expect(sql).toContain('"templateData"');
    expect(sql).toContain('"teamName"');
    expect(sql).toContain('"flowVersion"');
    expect(sql).toContain('"dripStages"');
  });

  test("lists a team's campaigns with a completed-participant count", async () => {
    await getCampaignsByTeamId("team-1");

    const call = db.campaign.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ teamId: "team-1" });
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

  // NOTE: pins current behaviour. getCampaignById keys on the campaign id alone and
  // takes no org — and it is the only lookup behind GET /api/campaign?campaignId=,
  // which the handler does not scope either. The row it returns carries the whole
  // template body. getCampaignsByOrgId, right beside it, IS scoped — that is the
  // shape the fix should take. See issues.txt 17.3.
  test("returns a campaign without being told which org is asking", async () => {
    await getCampaignById(CAMPAIGN_ID);

    const { sql, bound } = queryAt(0);
    expect(sql).not.toContain("orgId");
    expect(bound).toEqual([CAMPAIGN_ID]);
  });

  // NOTE: same gap, reached by team id. See issues.txt 17.3.
  test("lists a team's campaigns without checking the team is the caller's", async () => {
    await getCampaignsByTeamId("another-orgs-team");

    expect(db.campaign.findMany.mock.calls[0][0].where).toEqual({
      teamId: "another-orgs-team",
    });
  });
});

describe("createCampaign", () => {
  const input: any = { name: "March push", type: "REGULAR", teamId: "team-1" };

  test("creates the campaign, its drip stages and its stats row", async () => {
    await createCampaign({ ...input, dripStages: [{ templateId: "tpl-1", delay: 1 }] });

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
    await createCampaign(input);

    expect(db.campaign.create.mock.calls[0][0].data.dynamicTags).toEqual([]);
  });

  test("resolves a Meta flow id to our own before storing it", async () => {
    await createCampaign({ ...input, flowId: "wa-flow-1" });

    expect(db.waFlow.findFirst.mock.calls[0][0]).toEqual({ where: { flowId: "wa-flow-1" } });
    expect(db.campaign.create.mock.calls[0][0].data.flowId).toBe("dbflow-1");
  });

  test("stores an empty flow id for a campaign that has no flow", async () => {
    await createCampaign(input);

    expect(db.waFlow.findFirst).not.toHaveBeenCalled();
    expect(db.campaign.create.mock.calls[0][0].data.flowId).toBe("");
  });

  // NOTE: the flow is looked up by Meta flow id alone, with no org filter, so a flow
  // id belonging to another org is still accepted and attached to the campaign. See
  // issues.txt 17.3. `flow.dbFlowId` is now null-checked, so an unknown flow id
  // throws a clear, descriptive error instead of a bare TypeError.
  test("throws for a flow id that matches nothing", async () => {
    db.waFlow.findFirst.mockResolvedValue(null);

    await expect(createCampaign({ ...input, flowId: "nope" })).rejects.toThrow(
      "WaFlow with flowId nope not found.",
    );
  });
});

describe("updateCampaign", () => {
  test("writes the fields it was given", async () => {
    await updateCampaign(CAMPAIGN_ID, { name: "Renamed" } as any);

    expect(db.campaign.update.mock.calls[0][0]).toEqual({
      where: { id: CAMPAIGN_ID },
      data: { name: "Renamed" },
    });
  });

  test("stamps the start time only the first time a campaign runs", async () => {
    db.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID });
    const startedAt = new Date("2026-03-01T00:00:00Z");

    await updateCampaign(CAMPAIGN_ID, { startedAt } as any);

    expect(db.campaign.findUnique.mock.calls[0][0].where).toEqual({
      id: CAMPAIGN_ID,
      startedAt: null,
    });
    expect(db.campaign.update.mock.calls[0][0].data).toEqual({ startedAt });
  });

  test("leaves an already-started campaign's start time alone", async () => {
    db.campaign.findUnique.mockResolvedValue(null);

    await updateCampaign(CAMPAIGN_ID, { startedAt: new Date() } as any);

    expect(db.campaign.update).toHaveBeenCalledTimes(1);
    expect(db.campaign.update.mock.calls[0][0].data).not.toHaveProperty("startedAt");
  });

  test("adds a drip stage that carries no id", async () => {
    await updateCampaign(CAMPAIGN_ID, {
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

  test("rewrites a drip stage that names an existing id", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([{ id: "stage-1" }]);

    await updateCampaign(CAMPAIGN_ID, {
      dripStages: [{ id: "stage-1", templateId: "tpl-2", delay: 3 }],
    } as any);

    expect(db.campaignDripStage.update.mock.calls[0][0].where).toEqual({ id: "stage-1" });
    expect(db.campaignDripStage.deleteMany).not.toHaveBeenCalled();
  });

  test("removes the drip stages the update left out", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([{ id: "stage-1" }, { id: "stage-2" }]);

    await updateCampaign(CAMPAIGN_ID, {
      dripStages: [{ id: "stage-1", templateId: "tpl-1", delay: 1 }],
    } as any);

    expect(db.campaignDripStage.deleteMany.mock.calls[0][0].where).toEqual({
      id: { in: ["stage-2"] },
    });
  });

  test("leaves the drip stages alone when the update mentions none", async () => {
    await updateCampaign(CAMPAIGN_ID, { name: "Renamed" } as any);

    expect(db.campaignDripStage.findMany).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. A drip stage named by id is updated on its id
  // alone — nothing checks it belongs to the campaign being edited, let alone to
  // the caller's org. So naming another campaign's stage id rewrites that stage's
  // template and delay. See issues.txt 17.3.
  test("rewrites a drip stage that belongs to a different campaign", async () => {
    db.campaignDripStage.findMany.mockResolvedValue([]);

    await updateCampaign(CAMPAIGN_ID, {
      dripStages: [{ id: "another-campaigns-stage", templateId: "tpl-9", delay: 1 }],
    } as any);

    expect(db.campaignDripStage.update.mock.calls[0][0]).toEqual({
      where: { id: "another-campaigns-stage" },
      data: { waTemplateId: "tpl-9", delay: 1, delayUnit: undefined, sendAtTime: null },
    });
  });

  // NOTE: same gap on the delete. See issues.txt 17.3.
  test("takes no org to scope the delete by", async () => {
    await deleteCampaign(CAMPAIGN_ID);

    expect(db.campaign.delete.mock.calls[0][0]).toEqual({ where: { id: CAMPAIGN_ID } });
  });
});

describe("sendCampaign", () => {
  test("marks the campaign active and hands it to the dispatcher", async () => {
    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING], undefined, "user-1");

    expect(db.campaign.update.mock.calls.at(-1)![0].data).toMatchObject({
      status: CampaignStatus.ACTIVE,
      errorMessage: null,
    });
    expect(sendToParticipantsMock).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      [CampaignParticipantStatus.PENDING],
      undefined,
      "user-1",
    );
  });

  test("refuses and records why when the org is over its conversation limit", async () => {
    limitExceededMock.mockResolvedValue(false);

    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]);

    expect(db.campaign.update.mock.calls[0][0].data).toMatchObject({
      status: CampaignStatus.INACTIVE,
      errorMessage: "Conversation limit reached. Upgrade your plan to send more messages.",
    });
    expect(sendToParticipantsMock).not.toHaveBeenCalled();
  });

  test("sends anyway when the campaign's org cannot be determined", async () => {
    db.campaign.findUnique.mockResolvedValue(null);

    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]);

    expect(limitExceededMock).not.toHaveBeenCalled();
    expect(sendToParticipantsMock).toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. checkConversationLimitExceeded returns TRUE when
  // the org is WITHIN its limit — its body is `return !(...)`. Every caller has to
  // negate it, and sendCampaign does. The name says the opposite of what it
  // returns, and getting it wrong here would send a campaign for an org that has
  // run out of conversations. See issues.txt 17.7.
  test("treats a true answer from the limit check as permission to send", async () => {
    limitExceededMock.mockResolvedValue(true);

    await sendCampaign(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]);

    expect(sendToParticipantsMock).toHaveBeenCalled();
  });
});

describe("sendCampaignCronAction", () => {
  test("sends every scheduled campaign whose time has come", async () => {
    db.campaign.findMany.mockResolvedValue([
      { id: "camp-1", scheduledStatuses: [CampaignParticipantStatus.PENDING] },
      { id: "camp-2", scheduledStatuses: [] },
    ]);

    await sendCampaignCronAction();

    expect(sendToParticipantsMock).toHaveBeenCalledTimes(2);
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

    expect(sendToParticipantsMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The loop has no per-campaign guard, so one
  // campaign that throws — a missing template, a database hiccup — abandons every
  // campaign scheduled behind it in the same run, silently, until the next cron
  // tick. Same shape as issues.txt 3.4. See issues.txt 17.5.
  test("abandons the campaigns behind one that fails", async () => {
    db.campaign.findMany.mockResolvedValue([
      { id: "camp-1", scheduledStatuses: [] },
      { id: "camp-2", scheduledStatuses: [] },
    ]);
    sendToParticipantsMock.mockRejectedValueOnce(new Error("template gone"));

    await expect(sendCampaignCronAction()).rejects.toThrow("template gone");
    expect(sendToParticipantsMock).toHaveBeenCalledTimes(1);
  });
});

describe("enqueueCampaignMessage", () => {
  test("hands the campaign to the dispatcher as one instruction", async () => {
    await enqueueCampaignMessage(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING], "p-1");

    expect(enqueueAdd.mock.calls[0][0]).toBe(CAMPAIGN_ID);
    expect(enqueueAdd.mock.calls[0][1]).toMatchObject({
      campaignId: CAMPAIGN_ID,
      sendToStatuses: [CampaignParticipantStatus.PENDING],
      participantId: "p-1",
    });
  });

  test("carries the daily cap through to the dispatcher", async () => {
    await enqueueCampaignMessage(CAMPAIGN_ID, [], undefined, undefined, undefined, 500);

    expect(enqueueAdd.mock.calls[0][1].dailySendLimit).toBe(500);
  });

  // NOTE: pins current behaviour. The queue add is not awaited, so the try/catch
  // around it can never see an asynchronous failure — the function returns
  // { status: true, message: "Campaign messages enqueued successfully" } while the
  // add is still in flight, and a rejection becomes an unhandled promise rejection
  // rather than the failure result the signature promises. sendCampaignHandler
  // ignores the result either way. See issues.txt 17.4.
  test("reports success while the enqueue is still in flight", async () => {
    let settled = false;
    enqueueAdd.mockReturnValue(
      new Promise((_resolve, reject) => {
        settled = true;
        reject(new Error("redis is down"));
      }).catch(() => {}),
    );

    await expect(enqueueCampaignMessage(CAMPAIGN_ID, [])).resolves.toEqual({
      status: true,
      message: "Campaign messages enqueued successfully",
    });
    expect(settled).toBe(true);
  });

  test("reports failure only when the add throws synchronously", async () => {
    enqueueAdd.mockImplementation(() => {
      throw new Error("queue not initialised");
    });

    await expect(enqueueCampaignMessage(CAMPAIGN_ID, [])).resolves.toEqual({
      status: false,
      message: "Campaign not scheduled, please try again",
    });
  });

  // NOTE: the dequeue side has the same shape — the add is not awaited and the
  // function returns undefined, so a caller cannot tell whether the cancellation
  // was accepted. See issues.txt 17.4.
  test("asks for a dequeue without waiting to hear it was accepted", async () => {
    await expect(deleteCampaignParticipantsByCampaignId(CAMPAIGN_ID)).resolves.toBeUndefined();

    expect(dequeueAdd).toHaveBeenCalledWith(CAMPAIGN_ID, { campaignId: CAMPAIGN_ID });
  });
});

describe("getCampaignScheduleInfo", () => {
  const NOW = 1_700_000_000_000;

  test("reports nothing parked when the queue holds no delayed jobs", async () => {
    await expect(getCampaignScheduleInfo(CAMPAIGN_ID)).resolves.toEqual({
      scheduledCount: 0,
      nextBatchAt: null,
      nextBatchCount: 0,
    });
  });

  test("counts only the jobs belonging to this campaign", async () => {
    getDelayedMock.mockResolvedValue([
      { name: CAMPAIGN_ID, timestamp: NOW, opts: { delay: 1000 } },
      { name: "another-campaign", timestamp: NOW, opts: { delay: 1000 } },
    ]);

    const result = await getCampaignScheduleInfo(CAMPAIGN_ID);

    expect(result.scheduledCount).toBe(1);
  });

  test("reports when the next batch is released and how big it is", async () => {
    getDelayedMock.mockResolvedValue([
      { name: CAMPAIGN_ID, timestamp: NOW, opts: { delay: 1000 } },
      { name: CAMPAIGN_ID, timestamp: NOW, opts: { delay: 2000 } },
      { name: CAMPAIGN_ID, timestamp: NOW, opts: { delay: 24 * 60 * 60 * 1000 } },
    ]);

    const result = await getCampaignScheduleInfo(CAMPAIGN_ID);

    expect(result.scheduledCount).toBe(3);
    expect(result.nextBatchAt).toBe(new Date(NOW + 1000).toISOString());
    expect(result.nextBatchCount).toBe(2);
  });

  test("treats a job with no delay as due immediately", async () => {
    getDelayedMock.mockResolvedValue([{ name: CAMPAIGN_ID, timestamp: NOW, opts: {} }]);

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
    db.campaignStats.findUnique.mockResolvedValue(STATS);
    getCampaignCountMock.mockResolvedValue(3);

    await expect(getCampaginStatsById(CAMPAIGN_ID)).resolves.toMatchObject({
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
    await expect(getCampaginStatsById(CAMPAIGN_ID)).resolves.toEqual({
      countRead: 0,
      countSent: 0,
      countFailed: 0,
      countDelivered: 0,
      countPending: 0,
      countCompleted: 0,
      scheduledCount: 0,
      nextBatchAt: null,
      nextBatchCount: 0,
    });
  });

  test("reports one drip stage's counters when a stage is named", async () => {
    db.campaignDripStage.findUnique.mockResolvedValue({
      totalRead: 1,
      totalSend: 2,
      totalFailed: 0,
      totalDelivered: 2,
      totalCompleted: 1,
      _count: { CampaignParticipantDripStage: 3 },
    });

    const result = await getCampaginStatsById(CAMPAIGN_ID, "stage-1");

    expect(db.campaignDripStage.findUnique.mock.calls[0][0].where).toEqual({ id: "stage-1" });
    expect(result).toMatchObject({ countRead: 1, countPending: 3 });
  });

  // NOTE: pins current behaviour. The empty-stats replies omit queueCount entirely
  // while the populated ones include it, and the per-stage reply omits the three
  // schedule fields the all-stages reply carries. A client reading the response has
  // to cope with three different shapes from one endpoint. See issues.txt 17.8.
  test("answers with a different shape depending on which branch it took", async () => {
    const empty = await getCampaginStatsById(CAMPAIGN_ID);
    expect(empty).not.toHaveProperty("queueCount");

    db.campaignDripStage.findUnique.mockResolvedValue({
      totalRead: 0,
      totalSend: 0,
      totalFailed: 0,
      totalDelivered: 0,
      totalCompleted: 0,
      _count: { CampaignParticipantDripStage: 0 },
    });
    const perStage = await getCampaginStatsById(CAMPAIGN_ID, "stage-1");
    expect(perStage).toHaveProperty("queueCount");
    expect(perStage).not.toHaveProperty("scheduledCount");
  });

  // NOTE: the drip stage is fetched by its own id with no campaign filter, so a
  // stage id belonging to another campaign — in any org — is reported under
  // whatever campaignId the caller named. See issues.txt 17.3.
  test("reports a drip stage that belongs to another campaign", async () => {
    db.campaignDripStage.findUnique.mockResolvedValue({
      totalRead: 9,
      totalSend: 9,
      totalFailed: 0,
      totalDelivered: 9,
      totalCompleted: 9,
      _count: { CampaignParticipantDripStage: 0 },
    });

    const result = await getCampaginStatsById(CAMPAIGN_ID, "another-campaigns-stage");

    expect(result.countRead).toBe(9);
  });
});

describe("getResponseExcelByCampaignById", () => {
  beforeEach(() => {
    db.campaign.findUnique.mockResolvedValue({ name: "March push" });
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

    const result = await getResponseExcelByCampaignById(CAMPAIGN_ID);

    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result.title).toBe("March push");
  });

  test("reads from the drip-stage table when a stage is named", async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValue([]);

    await getResponseExcelByCampaignById(CAMPAIGN_ID, "stage-1");

    expect(queryAt(0).sql).toContain('"CampaignParticipantDripStage"');
  });

  // NOTE: pins current behaviour. The drip-stage export filters on the stage id
  // alone — the campaign id the caller passed is used only to look up the workbook
  // title. So naming another campaign's stage id exports that campaign's
  // participants, names and phone numbers included, under your own campaign's name.
  // See issues.txt 17.3.
  test("exports by stage id alone, ignoring the campaign it was asked about", async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValue([]);

    await getResponseExcelByCampaignById(CAMPAIGN_ID, "another-campaigns-stage");

    const { sql, bound } = queryAt(0);
    expect(bound).toContain("another-campaigns-stage");
    expect(bound).not.toContain(CAMPAIGN_ID);
    expect(sql).not.toContain('cp."campaignId"');
  });
});

describe("the remaining queue helpers", () => {
  test("reports whether a campaign still has anything in the message queue", async () => {
    db.campaignMessageQueue.findFirst.mockResolvedValue({ id: "q-1" });

    await expect(doesCampaignIdExistInMessageQueue(CAMPAIGN_ID)).resolves.toBe(true);

    db.campaignMessageQueue.findFirst.mockResolvedValue(null);
    await expect(doesCampaignIdExistInMessageQueue(CAMPAIGN_ID)).resolves.toBe(false);
  });

  test("resets only the retries that have run out", async () => {
    await updateCampaignMessageQueueRetryCount(CAMPAIGN_ID);

    expect(db.campaignMessageQueue.updateMany.mock.calls[0][0]).toEqual({
      where: { campaignParticipant: { campaignId: CAMPAIGN_ID }, retryCount: 2 },
      data: { retryCount: 0 },
    });
  });

  test("counts the participants sitting in the statuses it was given", async () => {
    db.campaignParticipant.count.mockResolvedValue(12);

    await expect(
      getCampaignParticipantCountByStatuses(CAMPAIGN_ID, [CampaignParticipantStatus.PENDING]),
    ).resolves.toBe(12);
    expect(db.campaignParticipant.count.mock.calls[0][0].where).toEqual({
      campaignId: CAMPAIGN_ID,
      status: { in: [CampaignParticipantStatus.PENDING] },
    });
  });
});

describe("getCampaignFilterForFlows", () => {
  test("lists the campaigns that run a survey's flow", async () => {
    getFlowBySurveyIdMock.mockResolvedValue({ dbFlowId: "dbflow-1" });
    db.campaign.findMany.mockResolvedValue([{ id: CAMPAIGN_ID, name: "March push" }]);

    await expect(getCampaignFilterForFlows("survey-1")).resolves.toEqual([
      { id: CAMPAIGN_ID, name: "March push" },
    ]);
    expect(db.campaign.findMany.mock.calls[0][0].where).toEqual({ flowId: "dbflow-1" });
  });

  test("reports nothing for a survey that has no flow", async () => {
    getFlowBySurveyIdMock.mockResolvedValue(null);

    await expect(getCampaignFilterForFlows("survey-1")).resolves.toBeUndefined();
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

  // NOTE: this function is a line-for-line copy of getFlowIdFromTemplateComponents
  // in wa_templates.utils.ts — same body, same behaviour, two modules. Neither
  // imports the other. See issues.txt 17.8. (The templates copy has its own tests
  // in wa_templates.utils.test.ts; importing it here would drag that module's
  // whole dependency graph into this file, so the duplication is recorded rather
  // than asserted across the two.)
  test("stringifies a numeric flow id, as its twin does", () => {
    const components: any = [{ type: "BUTTONS", buttons: [{ type: "FLOW", flow_id: 7 }] }];

    expect(getFlowIdFromTemplateComponents(components)).toBe("7");
  });
});
