import prisma from "../../utils/prisma.js";
import { CreateCampaignInput, UpdateCampaignInput } from "./campaign.schema.js";
import { sendCampaignToParticipants } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  WaTemplateComponentType,
} from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import dayjs from "dayjs";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service.js";
import { SpreadsheetExportFormat } from "../../utils/spreadsheet.js";
import { write } from "hucre";

import { WaTemplateComponent, WHATSAPP_BUTTON_TYPE } from "../../types/whatsapp.types.js";
import {
  getCampaignCount,
  waCampaignDequeue,
  waCampaignEnqueue,
  waMessageQueue,
} from "../../utils/redisConnection.js";
import { Prisma } from "../../../generated/prisma/client.js";

export interface WaMessageStats {
  read?: boolean;
  sent?: boolean;
  delivered?: boolean;
  [key: string]: any;
}

export function getLatestStatus(participant = []) {
  let latestStatus = null;
  let latestTimestamp = null;

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

export async function getCampaignById(campaignId: string) {
  //   const campaignTemp: Array<campaginExtentend> = await prisma.$queryRaw`
  //   WITH campaign_data AS (
  //   SELECT
  //     c.*,
  //     t.id as team_id,
  //     t."orgId",
  //     t.name as "teamName",
  //     was."contactTags",
  //     wt.data as template_data
  //   FROM "Campaign" c
  //   LEFT JOIN "Team" t ON c."teamId" = t.id
  //   LEFT JOIN "Org" o ON t."orgId" = o.id
  //   LEFT JOIN "WaAccountSettings" was ON o.id = was."orgId"
  //   LEFT JOIN "WaTemplate" wt ON c."waTemplateId" = wt.id
  //   WHERE c.id = ${campaignId}::uuid
  // ),
  // participant_data AS (
  //   SELECT
  //     cp.*,
  //     c.name as name,
  //     c.phone as contact_phone,
  //     c.consent,
  //     wm.stats as message_stats,
  //     wm."waCreatedAt" as message_created_at,
  //     camp."flowId"
  //   FROM "CampaignParticipant" cp
  //   LEFT JOIN "Contact" c ON cp."contactId" = c.id
  //   LEFT JOIN "WaMessageCampaginParticipantMap" wmap ON cp.id = wmap."campaignParticipantId"
  //   LEFT JOIN "WaMessage" wm ON wmap."waMessageId" = wm.id
  //   LEFT JOIN "Campaign" camp ON cp."campaignId" = camp.id
  //   WHERE cp."campaignId" = ${campaignId}::uuid
  // )
  // SELECT
  //   cd.*,
  //   json_build_object(
  //     'id', cd.team_id,
  //     'name', cd."teamName"
  //   ) as team,
  //   COALESCE(json_agg(
  //     CASE WHEN pd.id IS NOT NULL THEN
  //       json_build_object(
  //         'id', pd.id,
  //         'status', pd.status,
  //         'contact', json_build_object(
  //           'name', pd.name,
  //           'phone', pd.contact_phone,
  //           'consent', pd.consent
  //         ),
  //         'WaMessageCampaginParticipantMap', json_build_object(
  //           'waMessage', json_build_object(
  //             'stats', pd.message_stats,
  //             'waCreatedAt', pd.message_created_at
  //           )
  //         ),
  //         'campaign', json_build_object(
  //           'flowId', pd."flowId"
  //         )
  //       )
  //     END
  //   ) FILTER (WHERE pd.id IS NOT NULL), '[]') as "campaignParticipants"
  // FROM campaign_data cd
  // LEFT JOIN participant_data pd ON cd.id = pd."campaignId"
  // GROUP BY
  //   cd.id,
  //   cd.team_id,
  //   cd."teamName",
  //   cd."orgId",
  //   cd."contactTags",
  //   cd.template_data,
  //   cd."createdAt",
  //   cd."teamId",
  //   cd."waTemplateId",
  //   cd."flowId",
  //   cd."name",
  //   cd."status",
  //   cd."startedAt",
  //   cd."endedAt",
  //   cd.type,
  //   cd."campaignSentAt",
  //   cd."errorMessage",
  //   cd."scheduledStatuses",
  //   cd."dynamicTags",
  //   cd."useUserConsent"`;
  //   let campaign = campaignTemp?.[0];

  //   if (!campaign) {
  //     throw new Error(`Campaign with ID ${campaignId} not found.`);
  //   }
  // // Process participants
  // let countRead = 0,
  //   countSent = 0,
  //   countFailed = 0,
  //   countDelivered = 0,
  //   countPending = 0,
  //   countCompleted = 0;

  // campaign.campaignParticipants = campaign?.campaignParticipants || [];
  // const groupedParticipants = campaign?.campaignParticipants?.reduce(
  //   (acc, participant) => {
  //     // Check if the participant ID is already in the map
  //     if (!acc[participant.id]) {
  //       acc[participant.id] = {
  //         ...participant,
  //         WaMessageCampaginParticipantMap: [
  //           participant.WaMessageCampaginParticipantMap,
  //         ],
  //       };
  //     } else {
  //       // Merge the WaMessageCampaginParticipantMap for the same participant
  //       acc[participant.id].WaMessageCampaginParticipantMap.push(
  //         participant.WaMessageCampaginParticipantMap,
  //       );
  //     }
  //     return acc;
  //   },
  //   {},
  // );

  // // Convert the map back into an array
  // campaign.campaignParticipants = Object.values(groupedParticipants);
  // for (const participant of campaign.campaignParticipants) {
  //   const participantStatus = participant.status;
  //   const participantMessages = participant?.WaMessageCampaginParticipantMap;

  //   const latestStatus = getLatestStatus(participantMessages);

  //   if (participantStatus === CampaignParticipantStatus.PENDING) {
  //     countPending++;
  //   } else if (participantStatus === CampaignParticipantStatus.FAILED) {
  //     countFailed++;
  //   } else {
  //     participantMessages.forEach(
  //       (item: {
  //         waMessage: {
  //           stats: WaMessageStats;
  //         };
  //       }) => {
  //         if (item.waMessage.stats?.read) countRead++;
  //         if (item.waMessage.stats?.sent) countSent++;
  //         if (item.waMessage.stats?.delivered) countDelivered++;
  //       },
  //     );
  //   }

  //   if (latestStatus?.toUpperCase() === CampaignParticipantStatus.FAILED) {
  //     countFailed++;
  //   }

  //   if (
  //     campaign.flowId &&
  //     participantStatus === CampaignParticipantStatus.COMPLETED
  //   ) {
  //     countCompleted++;
  //   }

  //   participant.waStatus = latestStatus;
  // }

  // return {
  //   ...campaign,
  //   stats: {
  //     countRead,
  //     countSent,
  //     countFailed,
  //     countDelivered,
  //     countPending,
  //     countCompleted,
  //   },
  // };

  const campaign = await prisma.$queryRaw`
      SELECT 
        c.*, 
        wt."data" as "templateData", 
        t."name" as "teamName", 
        wf."version" as "flowVersion",
        (
          SELECT COALESCE(json_agg(cds), '[]'::json)
          FROM "CampaignDripStage" cds
          WHERE cds."campaignId" = c.id
        ) as "dripStages"
      FROM "Campaign" c 
      LEFT JOIN "WaTemplate" wt ON wt.id = c."waTemplateId" 
      LEFT JOIN "Team" t ON t.id = c."teamId"
      LEFT JOIN "WaFlow" wf ON wf."dbFlowId" = NULLIF(c."flowId",'')::uuid 
      WHERE c.id = ${campaignId}::uuid`;
  return campaign[0];
}

export async function getCampaignsByTeamId(teamId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      teamId,
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
  const campaigns = await prisma.$queryRaw`SELECT 
    c.id,
    c."name",
    c."createdAt",
    c."status",
    c."teamId",
    c.type,
    t."name" AS "teamName",
  COUNT(cp.id)::INTEGER AS "campaignParticipantsCount"
  FROM "Campaign" c
  LEFT JOIN "Team" t ON c."teamId" = t.id
  LEFT JOIN "CampaignParticipant" cp ON c.id = cp."campaignId"
  WHERE t."orgId" = ${orgId}::uuid
  ${type ? Prisma.sql`AND c.type = ${type}` : Prisma.empty}
  GROUP BY c.id, c."name", c."createdAt", c."status", c."teamId",t."name";`;
  return campaigns;
}

export async function createCampaign(data: CreateCampaignInput) {
  let flowId = "";
  if (data.flowId) {
    const flow = await prisma.waFlow.findFirst({
      where: {
        flowId: data.flowId,
      },
    });
    flowId = flow.dbFlowId;
  }
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      type: data.type,
      teamId: data.teamId,
      waTemplateId: data.waTemplateId ?? undefined,
      flowId: flowId,
      dynamicTags: data.dynamicTags ?? [],
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

export async function updateCampaign(campaignId: string, data: UpdateCampaignInput) {
  const { dripStages, startedAt, ...rest } = data;

  if (startedAt) {
    const existingCampaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        startedAt: null,
      },
    });
    if (existingCampaign) {
      await prisma.campaign.update({
        where: {
          id: campaignId,
        },
        data: {
          startedAt,
        },
      });
    }
  }

  // Update the campaign basic info
  const updatedCampaign = await prisma.campaign.update({
    where: {
      id: campaignId,
    },
    data: rest,
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
        // Update existing drip stage
        await prisma.campaignDripStage.update({
          where: { id: step.id },
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
        },
      });
    }
  }

  return updatedCampaign;
}

export async function deleteCampaign(campaignId: string) {
  return await prisma.campaign.delete({
    where: {
      id: campaignId,
    },
  });
}

export async function sendCampaign(
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  participantId?: string,
  userId?: string,
) {
  await updateCampaign(campaignId, {
    status: CampaignStatus.ACTIVE,
    startedAt: new Date(),
    campaignSentAt: null,
    errorMessage: null,
    scheduledStatuses: [],
  });
  log.trace("updated campaign status to active");
  await sendCampaignToParticipants(campaignId, sendToStatuses, participantId, userId);
  // add state indicating survey is sent to all participants?
}

export async function getCampaignFilterForFlows(surveyId: string) {
  const flow = await getFlowBySurveyId(surveyId);
  if (!flow) return;
  const result = await prisma.campaign.findMany({
    where: {
      flowId: flow.dbFlowId,
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

  for await (const campaign of campaignsToBeSent) {
    await sendCampaign(campaign.id, campaign.scheduledStatuses as CampaignParticipantStatus[]);
  }

  log.info(`sent ${campaignsToBeSent.length} campaings. At ${currentTime}`);
}

export const getResponseByCampaignById = async (id: string) => {
  const responses: any[] = await prisma.$queryRaw`
  SELECT sr.id, sr."createdAt", 
    sr.responses,
    sr.language, sr.tag, sr."surveyTeamMapId",sr.language, s.questions,c."teamId",co.phone
  FROM "SurveyResponse" sr
  INNER JOIN "SurveyTeamMap" stm ON sr."surveyTeamMapId" = stm.id
  INNER JOIN "Campaign" c ON c."teamId" = stm."teamId"
  INNER JOIN "WaFlow" wf ON wf."dbFlowId"::text = c."flowId"::text AND wf."surveyId" = stm."surveyId"
  INNER JOIN "Survey" s ON s.id = stm."surveyId"
  LEFT JOIN "Contact" co ON sr."contactId" = co.id
  WHERE c.id::text = ${id}::text`;

  const responsesWithTitles = responses.map(
    ({ id, createdAt, tag, phone, language, teamId, responses, questions }) => {
      // Create a mapping of questionId to title for easier lookup
      const questionMap = questions.reduce((map, { id, title, description, label }) => {
        map[id] =
          Object.values(title)?.[0] || Object.values(description)?.[0] || Object.values(label)?.[0];
        return map;
      }, {});
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
  selectedDripStage?: string,
  format: SpreadsheetExportFormat = "xlsx",
) => {
  const stats = await getCampaginStatsById(id, selectedDripStage);
  const pageSize = 10000; // Number of records per batch
  let page = 0;
  let hasMoreRecords = true;
  let campaignParticipants = [];
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { name: true },
  });

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
          campaign: { name: campaign?.name },
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

  return { title: campaign?.name, data: buffer };
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
export async function getCampaignScheduleInfo(campaignId: string): Promise<CampaignScheduleInfo> {
  const empty: CampaignScheduleInfo = {
    scheduledCount: 0,
    nextBatchAt: null,
    nextBatchCount: 0,
  };

  try {
    // Delayed jobs are named after their campaign by `enqueueCampaignMessages`.
    const delayed = await waMessageQueue.getDelayed();
    const releaseTimes = delayed
      .filter((job) => job?.name === campaignId)
      .map((job) => job.timestamp + (job.opts?.delay ?? 0));

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

export async function getCampaginStatsById(campaignId: string, selectedDripStage = "all") {
  if (selectedDripStage === "all") {
    const stats = await prisma.campaignStats.findUnique({
      where: {
        campaignId,
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
    if (!stats) {
      return {
        countRead: 0,
        countSent: 0,
        countFailed: 0,
        countDelivered: 0,
        countPending: 0,
        countCompleted: 0,
        scheduledCount: 0,
        nextBatchAt: null,
        nextBatchCount: 0,
      };
    }
    const [tc, schedule] = await Promise.all([
      getCampaignCount(campaignId),
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
    const stats = await prisma.campaignDripStage.findUnique({
      where: {
        id: selectedDripStage,
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
    if (!stats) {
      return {
        countRead: 0,
        countSent: 0,
        countFailed: 0,
        countDelivered: 0,
        countPending: 0,
        countCompleted: 0,
      };
    }
    const tc = await getCampaignCount(campaignId);

    return {
      countRead: stats.totalRead,
      countSent: stats.totalSend,
      countFailed: stats.totalFailed,
      countDelivered: stats.totalDelivered,
      countPending: stats._count.CampaignParticipantDripStage ?? 0,
      countCompleted: stats.totalCompleted,
      queueCount: tc ?? 0,
    };
  }
}

/**
 * Hands the campaign to the dispatcher as a single instruction. The dispatcher
 * expands it into per-participant jobs; when `dailySendLimit` is set it staggers
 * those jobs across consecutive days instead of releasing them all at once.
 */
export async function enqueueCampaignMessage(
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  participantId?: string,
  scheduledAt?: Date,
  dripStageId?: string,
  dailySendLimit?: number,
): Promise<{ status: boolean; message: string }> {
  try {
    waCampaignEnqueue.add(
      campaignId,
      {
        campaignId,
        sendToStatuses,
        participantId,
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
    console.error("Error enqueuing campaign message:", error);
    return {
      status: false,
      message: "Campaign not scheduled, please try again",
    };
  }
}

export function getFlowIdFromTemplateComponents(
  components: WaTemplateComponent[],
): string | undefined {
  const flowId = components
    .find((c) => c.type.toLocaleLowerCase() === WaTemplateComponentType.BUTTONS)
    ?.buttons.find((b) => b.type === WHATSAPP_BUTTON_TYPE.FLOW)
    ?.flow_id?.toString();

  return flowId;
}

export const deleteCampaignParticipantsByCampaignId = async (campaignId: string) => {
  waCampaignDequeue.add(campaignId, { campaignId });
};

export async function doesCampaignIdExistInMessageQueue(campaignId: string) {
  const exists = await prisma.campaignMessageQueue.findFirst({
    where: {
      campaignParticipant: {
        campaignId,
      },
    },
  });
  return !!exists;
}
export const updateCampaignMessageQueueRetryCount = (campaignId) => {
  return prisma.campaignMessageQueue.updateMany({
    where: {
      campaignParticipant: {
        campaignId,
      },
      retryCount: 2,
    },
    data: {
      retryCount: 0,
    },
  });
};

export const getCampaignParticipantCountByStatuses = (
  campaignId: string,
  status: Array<CampaignParticipantStatus>,
): Promise<number> => {
  return prisma.campaignParticipant.count({
    where: {
      campaignId,
      status: {
        in: status,
      },
    },
  });
};
