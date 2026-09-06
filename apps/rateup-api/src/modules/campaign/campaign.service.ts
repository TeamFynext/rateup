import prisma from "../../utils/prisma.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
export { CampaignNotFoundError };
import { CreateCampaignInput, UpdateCampaignInput } from "./campaign.schema.js";
import { CampaignParticipantStatus, CampaignStatus, CampaignType } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import dayjs from "dayjs";
import { checkConversationLimitAvailable } from "../whatsapp/whatsappSurvey/wasurvey.auth.js";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service.js";
import { SpreadsheetExportFormat } from "../../utils/spreadsheet.js";
import { write } from "hucre";

import {
  getCampaignCount,
  waCampaignDequeue,
  waCampaignEnqueue,
  waMessageQueue,
} from "../../workers/bullmq/queues/index.js";
import { Campaign, CampaignDripStage, Prisma } from "../../../generated/prisma/client.js";
import {
  createCampaignSend,
  failCampaignSend,
  LIVE_SEND_STATUSES,
} from "./campaignSend.service.js";
import { CampaignSendTrigger } from "../../../generated/prisma/enums.js";

export interface WaMessageStats {
  read?: boolean;
  sent?: boolean;
  delivered?: boolean;
  /** Each status also carries the ISO timestamp it happened at; see getLatestStatus. */
  [status: string]: string | boolean | null | undefined;
}

export interface CampaignParticipantMessageMapping {
  waMessage?: { stats?: WaMessageStats | null } | null;
}

export function getLatestStatus(participant: CampaignParticipantMessageMapping[] = []) {
  let latestStatus: string | null = null;
  let latestTimestamp: dayjs.Dayjs | null = null;

  participant?.forEach((mapping) => {
    Object.entries(mapping?.waMessage?.stats ?? {}).forEach(([status, timestamp]) => {
      if (timestamp && (!latestTimestamp || dayjs(timestamp as string).isAfter(latestTimestamp))) {
        latestTimestamp = dayjs(timestamp as string);
        latestStatus = status;
      }
    });
  });

  return latestStatus;
}

export async function getCampaignById(campaignId: string, orgId: string) {
  const campaign = await prisma.$queryRaw<
    Array<
      Campaign & {
        templateData: Prisma.JsonValue;
        teamName: string | null;
        flowVersion: number | null;
        dripStages: CampaignDripStage[];
        campaignParticipantsCount: number;
      }
    >
  >`
      SELECT
        c.*,
        wt."data" as "templateData",
        t."name" as "teamName",
        wf."version" as "flowVersion",
        (
          SELECT COALESCE(json_agg(cds), '[]'::json)
          FROM "CampaignDripStage" cds
          WHERE cds."campaignId" = c.id
        ) as "dripStages",
        -- The wizard marks its Audience step done from this, and the campaign
        -- page reads it too. It was only ever selected by the list query, so
        -- everything reading a single campaign saw an undefined count and
        -- concluded the campaign had no recipients however many it had.
        (
          SELECT COUNT(*)::INTEGER
          FROM "CampaignParticipant" cp
          WHERE cp."campaignId" = c.id
        ) as "campaignParticipantsCount"
      FROM "Campaign" c
      LEFT JOIN "WaTemplate" wt ON wt.id = c."waTemplateId"
      LEFT JOIN "Team" t ON t.id = c."teamId"
      LEFT JOIN "WaFlow" wf ON wf."dbFlowId" = NULLIF(c."flowId",'')::uuid
      WHERE c.id = ${campaignId}::uuid
        AND t."orgId" = ${orgId}::uuid`;
  return campaign[0];
}

export async function getCampaignsByTeamId(teamId: string, orgId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      teamId,
      team: { orgId },
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          campaignParticipants: {
            where: {
              status: CampaignParticipantStatus.COMPLETED,
            },
          },
        },
      },
    },
  });
  return campaigns;
}

export async function getCampaignsByOrgId(orgId: string, type?: string) {
  // The list cards show a delivered/read bar and a template name, so both come
  // back with the list. Joined rather than fetched per card: a page of 20 cards
  // would otherwise be 40 extra round trips to draw one progress bar each.
  const campaigns = await prisma.$queryRaw`SELECT 
    c.id,
    c."name",
    c."createdAt",
    c."status",
    c."teamId",
    c.type,
    c."waTemplateId",
    c."campaignSentAt",
    c."startedAt",
    c."errorMessage",
    t."name" AS "teamName",
    wt."data"->>'name' AS "templateName",
    COALESCE(s."totalSend", 0) AS "totalSent",
    COALESCE(s."totalDelivered", 0) AS "totalDelivered",
    COALESCE(s."totalRead", 0) AS "totalRead",
    COALESCE(s."totalFailed", 0) AS "totalFailed",
    COUNT(cp.id)::INTEGER AS "campaignParticipantsCount"
  FROM "Campaign" c
  LEFT JOIN "Team" t ON c."teamId" = t.id
  LEFT JOIN "WaTemplate" wt ON wt.id = c."waTemplateId"
  LEFT JOIN "CampaignStats" s ON s."campaignId" = c.id
  LEFT JOIN "CampaignParticipant" cp ON c.id = cp."campaignId"
  WHERE t."orgId" = ${orgId}::uuid
  ${type ? Prisma.sql`AND c.type = ${type}` : Prisma.empty}
  GROUP BY c.id, c."name", c."createdAt", c."status", c."teamId", c."errorMessage", t."name",
           wt."data", s."totalSend", s."totalDelivered", s."totalRead", s."totalFailed";`;
  return campaigns;
}

export async function createCampaign(data: CreateCampaignInput, orgId: string) {
  const team = await prisma.team.findFirst({
    where: { id: data.teamId, orgId },
    select: { id: true },
  });
  if (!team) throw new CampaignNotFoundError("Team not found");

  let flowId = "";
  if (data.flowId) {
    const flow = await prisma.waFlow.findFirst({
      where: {
        flowId: data.flowId,
        orgId,
      },
    });
    if (!flow) {
      throw new Error(`WaFlow with flowId ${data.flowId} not found.`);
    }
    flowId = flow.dbFlowId;
  }
  // dynamicTags entries can be null per the input schema, but the DB column is a
  // non-nullable String[] — drop null entries rather than writing them.
  const dynamicTags = data.dynamicTags?.filter((tag): tag is string => tag !== null) ?? [];
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      type: data.type,
      teamId: data.teamId,
      // The wizard creates a campaign from step one and fills it in over the
      // next five, so it posts DRAFT. Dropping it here left every half-built
      // campaign sitting at the column default and reading back as paused —
      // a state it had never been in, and one the wizard cannot produce.
      status: data.status ?? CampaignStatus.DRAFT,
      waTemplateId: data.waTemplateId ?? undefined,
      flowId: flowId,
      dynamicTags,
    },
  });
  await prisma.campaignDripStage.createMany({
    data:
      data.dripStages?.map((step) => ({
        campaignId: campaign.id,
        waTemplateId: step.templateId,
        delay: step.delay,
        delayUnit: step.delayUnit,
        sendAtTime: step.sendAtTime,
      })) ?? [],
  });
  await prisma.campaignStats.create({
    data: {
      campaignId: campaign.id,
    },
  });
  return campaign;
}

export async function updateCampaign(campaignId: string, orgId: string, data: UpdateCampaignInput) {
  // `whatsappSettingsPhoneId` is accepted by UpdateCampaignInput but has no matching
  // column on the Campaign model (see campaign.schema.ts) — it is never persisted.
  // `dynamicTags`/`scheduledStatuses` need their null variants coerced below since the
  // DB columns are non-nullable String[] arrays.
  const {
    dripStages,
    startedAt,
    whatsappSettingsPhoneId: _whatsappSettingsPhoneId,
    dynamicTags,
    scheduledStatuses,
    ...rest
  } = data;

  if (startedAt) {
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        startedAt: null,
        team: { orgId },
      },
    });
    if (existingCampaign) {
      await prisma.campaign.update({
        where: {
          id: campaignId,
          team: { orgId },
        },
        data: {
          startedAt,
        },
      });
    }
  }

  // Update the campaign basic info. Typed explicitly as the unchecked variant so the
  // `waTemplateId` scalar FK (rather than a nested `waTemplate: {...}` relation write)
  // resolves unambiguously against Prisma's generated update-input union.
  const updateData: Prisma.CampaignUncheckedUpdateInput = {
    ...rest,
    // dynamicTags entries can be null per the input schema, but the DB column is a
    // non-nullable String[] — drop null entries rather than writing them.
    ...(dynamicTags !== undefined
      ? { dynamicTags: dynamicTags.filter((tag): tag is string => tag !== null) }
      : {}),
    // scheduledStatuses is nullable in the input schema (meaning "clear it"), but the
    // DB column is a non-nullable String[] — null means "set to empty", not "no-op".
    ...(scheduledStatuses !== undefined ? { scheduledStatuses: scheduledStatuses ?? [] } : {}),
  };
  const updatedCampaign = await prisma.campaign.update({
    where: {
      id: campaignId,
      team: { orgId },
    },
    data: updateData,
  });

  // Handle drip steps if provided
  if (dripStages) {
    // Get existing drip stages for this campaign
    const existingDripStages = await prisma.campaignDripStage.findMany({
      where: { campaignId },
    });

    // Create a map of existing stages by ID for quick lookup
    const existingStagesMap = new Map(existingDripStages.map((stage) => [stage.id, stage]));

    // Process each drip step
    for (const step of dripStages) {
      if (step.id) {
        await prisma.campaignDripStage.update({
          where: { id: step.id, campaignId },
          data: {
            waTemplateId: step.templateId,
            delay: step.delay,
            delayUnit: step.delayUnit,
            sendAtTime: step.sendAtTime || null,
          },
        });
        // Remove from map to track which ones to delete later
        existingStagesMap.delete(step.id);
      } else {
        // Create new drip stage
        await prisma.campaignDripStage.create({
          data: {
            campaignId,
            waTemplateId: step.templateId,
            delay: step.delay,
            delayUnit: step.delayUnit,
            sendAtTime: step.sendAtTime || null,
          },
        });
      }
    }

    // Delete drip stages that weren't in the update
    const stageIdsToDelete = Array.from(existingStagesMap.keys());
    if (stageIdsToDelete.length > 0) {
      await prisma.campaignDripStage.deleteMany({
        where: {
          id: { in: stageIdsToDelete },
          campaignId,
        },
      });
    }
  }

  return updatedCampaign;
}

export async function deleteCampaign(campaignId: string, orgId: string) {
  return await prisma.campaign.delete({
    where: {
      id: campaignId,
      team: { orgId },
    },
  });
}

export async function sendCampaign(
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  participantId?: string,
) {
  // Pre-check the conversation limit once so an over-limit campaign fails cleanly
  // instead of throwing on every recipient inside sendMessage.
  const campaignOrg = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { team: { select: { orgId: true } } },
  });
  const campaignOrgId = campaignOrg?.team?.orgId;
  if (!campaignOrgId) {
    throw new CampaignNotFoundError(`Campaign ${campaignId} not found`);
  }
  if (!(await checkConversationLimitAvailable(campaignOrgId))) {
    await updateCampaign(campaignId, campaignOrgId, {
      status: CampaignStatus.FAILED,
      errorMessage: "Conversation limit reached. Upgrade your plan to send more messages.",
    });
    log.warn({ campaignId, orgId: campaignOrgId }, "Campaign skipped — conversation limit reached");
    return;
  }

  // Everything sends through the queue now. This used to call an in-process
  // `for` loop over every participant (`_sendCampaignToParticipants`, with a
  // `await wait(50)` and a `// TODO: add rate limiting`), which overlapped with
  // the BullMQ fan-out the send dialog already used: the LATER branch of
  // `sendCampaignHandler` both set `campaignSentAt` and enqueued a delayed
  // fan-out, and this cron matched exactly that row. The only thing preventing a
  // double-send was that every live write of `scheduledStatuses` is `[]`, so the
  // loop skipped every participant — an accident, not a design.
  const statuses = sendToStatuses.length
    ? sendToStatuses
    : [CampaignParticipantStatus.PENDING, CampaignParticipantStatus.FAILED];

  const send = await createCampaignSend({
    campaignId,
    trigger: CampaignSendTrigger.SCHEDULED,
    targetStatuses: statuses,
  });

  await updateCampaign(campaignId, campaignOrgId, {
    status: CampaignStatus.QUEUING,
    startedAt: new Date(),
    campaignSentAt: null,
    errorMessage: null,
    scheduledStatuses: [],
  });

  const enqueued = await enqueueCampaignMessage({
    campaignId,
    campaignSendId: send.id,
    sendToStatuses: statuses,
    participantId,
  });
  if (!enqueued.status) {
    await failCampaignSend(send.id, "Could not be queued.");
    await updateCampaign(campaignId, campaignOrgId, {
      status: CampaignStatus.FAILED,
      errorMessage: enqueued.message,
    });
    throw new Error(enqueued.message);
  }
  log.trace({ campaignId, campaignSendId: send.id }, "Scheduled campaign handed to the queue");
}

export async function getCampaignFilterForFlows(surveyId: string, orgId: string) {
  const flow = await getFlowBySurveyId(surveyId, orgId);
  if (!flow) return;
  const result = await prisma.campaign.findMany({
    where: {
      flowId: flow.dbFlowId,
      team: { orgId },
    },
    select: {
      id: true,
      name: true,
    },
  });
  return result;
}

export async function sendCampaignCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000);

  const campaignsToBeSent = await prisma.campaign.findMany({
    where: {
      NOT: {
        campaignSentAt: null,
      },
      AND: [
        { status: CampaignStatus.SCHEDULED },
        {
          campaignSentAt: {
            lte: fiveMinutesLater,
          },
        },
      ],
    },
    include: {
      team: {
        select: {
          orgId: true,
        },
      },
    },
  });
  if (campaignsToBeSent?.length === 0) return;

  let sent = 0;
  const failed: string[] = [];
  for (const campaign of campaignsToBeSent) {
    try {
      await sendCampaign(campaign.id, campaign.scheduledStatuses as CampaignParticipantStatus[]);
      sent++;
    } catch (error) {
      failed.push(campaign.id);
      log.error({ err: error, campaignId: campaign.id }, "Scheduled campaign failed to send");
    }
  }

  log.info(
    { sent, failed, at: currentTime },
    `sent ${sent} of ${campaignsToBeSent.length} scheduled campaigns`,
  );
}

// `responses` and `questions` are raw dynamic JSON blobs from the query below (survey
// answers / question definitions, whose shape varies per question type) — kept as `any`
// intentionally, matching the same pattern used for dynamic legacy JSON accumulators
// elsewhere in the codebase (see TS_STRICT_MIGRATION_PROGRESS.md).
interface CampaignSurveyResponseRow {
  id: string;
  createdAt: Date;
  tag: string | null;
  phone: string | null;
  language: string;
  teamId: string;
  responses: QuestionResponse[];
  /** `Survey.questions` — always the v1 shape on this join. */
  questions: Question[];
}

export const getResponseByCampaignById = async (id: string, orgId: string) => {
  const responses = await prisma.$queryRaw<CampaignSurveyResponseRow[]>`
  SELECT sr.id, sr."createdAt",
    sr.responses,
    sr.language, sr.tag, sr."surveyTeamMapId",sr.language, s.questions,c."teamId",co.phone
  FROM "SurveyResponse" sr
  INNER JOIN "SurveyTeamMap" stm ON sr."surveyTeamMapId" = stm.id
  INNER JOIN "Campaign" c ON c."teamId" = stm."teamId"
  INNER JOIN "WaFlow" wf ON wf."dbFlowId"::text = c."flowId"::text AND wf."surveyId" = stm."surveyId"
  INNER JOIN "Survey" s ON s.id = stm."surveyId"
  INNER JOIN "Team" t ON t.id = c."teamId"
  LEFT JOIN "Contact" co ON sr."contactId" = co.id
  WHERE c.id::text = ${id}::text
    AND t."orgId" = ${orgId}::uuid`;

  const responsesWithTitles = responses.map(
    ({ id, createdAt, tag, phone, language, teamId, responses, questions }) => {
      // Create a mapping of questionId to title for easier lookup
      const questionMap = questions.reduce<Record<string, unknown>>(
        (map, { id, title, description, label }) => {
          map[id] =
            Object.values(title ?? {})?.[0] ||
            Object.values(description ?? {})?.[0] ||
            Object.values(label ?? {})?.[0];
          return map;
        },
        {},
      );
      // Map over each response to replace questionId with the corresponding title
      const updatedResponses = responses.map(({ questionId, response = {}, ...rest }) => ({
        ...rest,
        response: Object.values(response)?.[0],
        title: questionMap[questionId],
      }));

      // Return the updated response object
      return {
        id,
        createdAt,
        tag,
        phone,
        language,
        teamId,
        responses: updatedResponses,
      };
    },
  );

  return responsesWithTitles;
};

export const getResponseExcelByCampaignById = async (
  id: string,
  orgId: string,
  selectedDripStage?: string,
  format: SpreadsheetExportFormat = "xlsx",
) => {
  const stats = await getCampaginStatsById(id, orgId, selectedDripStage);
  const pageSize = 10000; // Number of records per batch
  let page = 0;
  let hasMoreRecords = true;
  let campaignParticipants: Array<{
    createdAt: Date;
    contact: { name: string; phone: string };
    status: CampaignParticipantStatus;
    sentAt: Date;
    campaign: { name: string };
  }> = [];
  const campaign = await prisma.campaign.findFirst({
    where: { id, team: { orgId } },
    select: { name: true },
  });
  if (!campaign) {
    throw new CampaignNotFoundError(`Campaign with ID ${id} not found.`);
  }

  while (hasMoreRecords) {
    let batch: Array<{
      createdAt: Date;
      contactName: string;
      contactPhone: string;
      status: CampaignParticipantStatus;
      sentAt: Date;
    }> = [];

    if (selectedDripStage) {
      batch = (await prisma.$queryRaw`
        SELECT 
          cpds."createdAt",
          c."name" as "contactName",
          c."phone" as "contactPhone",
          cpds."status",
          cpds."sentAt"
        FROM "CampaignParticipantDripStage" cpds
        LEFT JOIN "CampaignParticipant" cp ON cpds."participantId" = cp.id
        LEFT JOIN "Contact" c ON cp."contactId" = c.id
        WHERE cpds."dripStageId" = ${selectedDripStage}::uuid
          AND cp."campaignId" = ${id}::uuid
        ORDER BY cpds."createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${page * pageSize}
      `) as Array<{
        createdAt: Date;
        contactName: string;
        contactPhone: string;
        status: CampaignParticipantStatus;
        sentAt: Date;
      }>;
    } else {
      batch = (await prisma.$queryRaw`
        SELECT 
          cp."createdAt",
          c."name" as "contactName",
          c."phone" as "contactPhone",
          cp."status",
          cp."sentAt"
        FROM "CampaignParticipant" cp
        LEFT JOIN "Contact" c ON cp."contactId" = c.id
        WHERE cp."campaignId" = ${id}::uuid
        ORDER BY cp."createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${page * pageSize}
      `) as Array<{
        createdAt: Date;
        contactName: string;
        contactPhone: string;
        status: CampaignParticipantStatus;
        sentAt: Date;
      }>;
    }

    if (batch.length === 0) {
      hasMoreRecords = false;
    } else {
      campaignParticipants = [
        ...campaignParticipants,
        ...batch.map((row) => ({
          createdAt: row.createdAt,
          contact: {
            name: row.contactName,
            phone: row.contactPhone,
          },
          status: row.status,
          sentAt: row.sentAt,
          campaign: { name: campaign.name },
        })),
      ];
      page++;
    }
  }
  const formatExportDate = (date?: Date | null) =>
    date ? dayjs(date).format("DD-MM-YYYY hh:mm A") : "";

  const participantsData = campaignParticipants?.map((participant) => ({
    createdAt: formatExportDate(participant?.createdAt),
    name: participant?.contact?.name,
    phone: participant?.contact?.phone,
    status: participant?.status,
    sentAt: formatExportDate(participant?.sentAt),
  }));

  const statsData = [
    {
      countPending: stats?.countPending,
      countRead: stats?.countRead,
      countSent: stats?.countSent,
      countFailed: stats?.countFailed,
      countDelivered: stats?.countDelivered,
      countCompleted: stats?.countCompleted,
    },
  ];

  const statsColumns = [
    { header: "Count Pending", key: "countPending", autoWidth: true },
    { header: "Count Read", key: "countRead", autoWidth: true },
    { header: "Count Sent", key: "countSent", autoWidth: true },
    { header: "Count Failed", key: "countFailed", autoWidth: true },
    { header: "Count Delivered", key: "countDelivered", autoWidth: true },
    { header: "Count Completed", key: "countCompleted", autoWidth: true },
  ];
  const participantsColumns = [
    { header: "Created At", key: "createdAt", autoWidth: true },
    { header: "Participant Name", key: "name", autoWidth: true },
    { header: "Phone", key: "phone", autoWidth: true },
    { header: "Status", key: "status", autoWidth: true },
    { header: "Sent At", key: "sentAt", autoWidth: true },
  ];

  const buffer = await write({
    sheets: [
      { name: "Stats", columns: statsColumns, data: statsData },
      { name: "Participants", columns: participantsColumns, data: participantsData },
    ],
    format,
  });

  return { title: campaign.name, data: buffer };
};

// Jobs released within this window of each other belong to the same batch.
// addBulk stamps them a few ms apart, so a small tolerance groups them cleanly.
const BATCH_GROUPING_TOLERANCE_MS = 60_000;

export interface CampaignScheduleInfo {
  /** Messages still waiting on a delay, i.e. not yet released to a worker. */
  scheduledCount: number;
  /** When the next batch is released, or null if nothing is delayed. */
  nextBatchAt: string | null;
  /** How many messages that next batch contains. */
  nextBatchCount: number;
}

/**
 * Reports what a daily-limited campaign still has parked in Redis. The
 * dispatcher gives each participant job a `delay`, so a job's release time is
 * `timestamp + delay`; the earliest such time is the next batch.
 */
const EMPTY_CAMPAIGN_SCHEDULE_INFO: CampaignScheduleInfo = {
  scheduledCount: 0,
  nextBatchAt: null,
  nextBatchCount: 0,
};

const EMPTY_CAMPAIGN_STATS = {
  countRead: 0,
  countSent: 0,
  countFailed: 0,
  countDelivered: 0,
  countPending: 0,
  countCompleted: 0,
  queueCount: 0,
  ...EMPTY_CAMPAIGN_SCHEDULE_INFO,
};

/**
 * Ids of the send sessions that still own a campaign — what the queue keys and
 * job names are scoped by.
 */
export async function getLiveCampaignSendIds(campaignId: string): Promise<string[]> {
  const sends = await prisma.campaignSend.findMany({
    where: { campaignId, status: { in: [...LIVE_SEND_STATUSES] } },
    select: { id: true },
  });
  return sends.map((send) => send.id);
}

/**
 * How many delayed jobs to walk when reading a campaign's pacing schedule.
 *
 * This used to be an unbounded `getDelayed()` on every stats poll, which fetched
 * every delayed job across every campaign and filtered them in JS. With
 * multi-day `dailySendLimit` pacing that set is large and long-lived, and the
 * poll runs while a campaign detail page is open.
 */
const DELAYED_SCAN_PAGE = 1_000;
const DELAYED_SCAN_MAX = 20_000;

export async function getCampaignScheduleInfo(campaignId: string): Promise<CampaignScheduleInfo> {
  const empty: CampaignScheduleInfo = EMPTY_CAMPAIGN_SCHEDULE_INFO;

  try {
    // The cheap exit, and the common one: a campaign with no live send has no
    // delayed jobs, so the queue is never touched at all.
    const sendIds = new Set(await getLiveCampaignSendIds(campaignId));
    if (!sendIds.size) return empty;

    // Delayed jobs are named after their *send session* by
    // `enqueueCampaignMessages`, not their campaign — a campaign can have more
    // than one in flight.
    const releaseTimes: number[] = [];
    for (let start = 0; start < DELAYED_SCAN_MAX; start += DELAYED_SCAN_PAGE) {
      const page = await waMessageQueue.getDelayed(start, start + DELAYED_SCAN_PAGE - 1);
      for (const job of page) {
        if (job?.name && sendIds.has(job.name)) {
          releaseTimes.push(job.timestamp + (job.opts?.delay ?? 0));
        }
      }
      if (page.length < DELAYED_SCAN_PAGE) break;
    }

    if (!releaseTimes.length) return empty;

    const nextBatchAt = Math.min(...releaseTimes);
    const nextBatchCount = releaseTimes.filter(
      (at) => at - nextBatchAt < BATCH_GROUPING_TOLERANCE_MS,
    ).length;

    return {
      scheduledCount: releaseTimes.length,
      nextBatchAt: new Date(nextBatchAt).toISOString(),
      nextBatchCount,
    };
  } catch (error) {
    // Schedule info is decorative; never fail the whole stats call over it.
    console.error("Error reading campaign schedule info:", error);
    return empty;
  }
}

export async function getCampaginStatsById(
  campaignId: string,
  orgId: string,
  selectedDripStage = "all",
) {
  if (selectedDripStage === "all") {
    const stats = await prisma.campaignStats.findFirst({
      where: {
        campaignId,
        campaign: { team: { orgId } },
      },
      include: {
        campaign: {
          select: {
            _count: {
              select: {
                campaignParticipants: {
                  where: {
                    status: CampaignParticipantStatus.PENDING,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!stats) return EMPTY_CAMPAIGN_STATS;
    const [tc, schedule] = await Promise.all([
      getLiveCampaignSendIds(campaignId).then(getCampaignCount),
      getCampaignScheduleInfo(campaignId),
    ]);

    return {
      countRead: stats.totalRead,
      countSent: stats.totalSend,
      countFailed: stats.totalFailed,
      countDelivered: stats.totalDelivered,
      countPending: stats.campaign?._count?.campaignParticipants ?? 0,
      countCompleted: stats.totalCompleted,
      queueCount: tc ?? 0,
      ...schedule,
    };
  } else {
    const stats = await prisma.campaignDripStage.findFirst({
      where: {
        id: selectedDripStage,
        campaignId,
        campaign: { team: { orgId } },
      },
      include: {
        _count: {
          select: {
            CampaignParticipantDripStage: {
              where: {
                status: CampaignParticipantStatus.PENDING,
              },
            },
          },
        },
      },
    });
    if (!stats) return EMPTY_CAMPAIGN_STATS;
    const [tc, schedule] = await Promise.all([
      getLiveCampaignSendIds(campaignId).then(getCampaignCount),
      getCampaignScheduleInfo(campaignId),
    ]);

    return {
      countRead: stats.totalRead,
      countSent: stats.totalSend,
      countFailed: stats.totalFailed,
      countDelivered: stats.totalDelivered,
      countPending: stats._count.CampaignParticipantDripStage ?? 0,
      countCompleted: stats.totalCompleted,
      queueCount: tc ?? 0,
      ...schedule,
    };
  }
}

/**
 * Hands the campaign to the dispatcher as a single instruction. The dispatcher
 * expands it into per-participant jobs; when `dailySendLimit` is set it staggers
 * those jobs across consecutive days instead of releasing them all at once.
 */
export interface EnqueueCampaignMessageInput {
  campaignId: string;
  /**
   * The send session this fan-out belongs to. Required: it is what scopes the
   * BullMQ job ids, and without it a resend to a participant the campaign has
   * already messaged is swallowed as a duplicate.
   */
  campaignSendId: string;
  sendToStatuses: CampaignParticipantStatus[];
  participantId?: string;
  /** An exact cohort, narrower than `sendToStatuses`. Used by the retry engine. */
  participantIds?: string[];
  scheduledAt?: Date;
  dripStageId?: string;
  dailySendLimit?: number;
}

/**
 * Takes an options object rather than positional arguments so that adding
 * `campaignSendId` — another `string` in a run of optional strings — could not
 * compile at a call site while silently shifting the argument after it.
 */
export async function enqueueCampaignMessage({
  campaignId,
  campaignSendId,
  sendToStatuses,
  participantId,
  participantIds,
  scheduledAt,
  dripStageId,
  dailySendLimit,
}: EnqueueCampaignMessageInput): Promise<{ status: boolean; message: string }> {
  try {
    await waCampaignEnqueue.add(
      campaignId,
      {
        campaignId,
        campaignSendId,
        sendToStatuses,
        participantId,
        participantIds,
        scheduledAt,
        dripStageId,
        dailySendLimit,
      },
      {
        removeOnComplete: true,
      },
    );
    return { status: true, message: "Campaign messages enqueued successfully" };
  } catch (error) {
    log.error({ err: error, campaignId }, "Error enqueuing campaign message");
    return {
      status: false,
      message: "Campaign not scheduled, please try again",
    };
  }
}

export { getFlowIdFromTemplateComponents } from "../../utils/waTemplateComponents.js";

export const deleteCampaignParticipantsByCampaignId = async (
  campaignId: string,
): Promise<{ status: boolean; message: string }> => {
  try {
    await waCampaignDequeue.add(campaignId, { campaignId });
    return { status: true, message: "Campaign dequeue requested" };
  } catch (error) {
    log.error({ err: error, campaignId }, "Error requesting campaign dequeue");
    return { status: false, message: "Campaign cancellation not requested, please try again" };
  }
};

// `doesCampaignIdExistInMessageQueue` and
// `updateCampaignMessageQueueRetryCount` were here, reading and writing a
// `CampaignMessageQueue` table nothing ever inserted into. The hardcoded
// `retryCount: 2` in the latter encoded a retry policy no code implemented.
// Retries are real now — see `campaignRetry.service.ts` — and leaving a
// vestigial imitation of one beside it was worse than nothing.

export const getCampaignParticipantCountByStatuses = (
  campaignId: string,
  orgId: string,
  status: Array<CampaignParticipantStatus>,
): Promise<number> => {
  return prisma.campaignParticipant.count({
    where: {
      campaignId,
      campaign: { team: { orgId } },
      status: {
        in: status,
      },
    },
  });
};
