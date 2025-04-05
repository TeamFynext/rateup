import prisma from "../../utils/prisma";
import { CreateCampaignInput, UpdateCampaignInput } from "./campaign.schema";
import { sendCampaignToParticipants } from "../whatsapp/whatsappSurvey/wasurvey.controller";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  WaTemplateComponentType,
} from "../../types/enums";
import { log } from "../../utils/logger";
import dayjs from "dayjs";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service";
import xlsx from "node-xlsx";
import { getCampaignParticipantsByCampaignId } from "./campaignParticipants/campaignParticipants.service";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";

import IORedis from "ioredis";
import {
  WaTemplateComponent,
  WHATSAPP_BUTTON_TYPE,
} from "../../types/whatsapp.types";

const redisURL = new URL(process.env.REDIS_URL);
const redisConnection = new IORedis({
  family: 0,
  host: redisURL.hostname,
  port: parseInt(redisURL.port),
  username: redisURL.username,
  password: redisURL.password,
  maxRetriesPerRequest: null,
});

export interface WaMessageStats {
  read?: boolean;
  sent?: boolean;
  delivered?: boolean;
  [key: string]: any;
}
type campaginExtentend = {
  team: {
    id: string;
    createdAt: Date;
    name: string;
    code: string;
    googleLink: string;
    tags: string[];
    orgId: string;
    org: {
      WaAccountSettings: {
        contactTags: string[];
      };
    };
  };
  waTemplate: {
    data: {};
  };
  campaignParticipants: {
    id: string;
    status: string;
    createdAt: Date;
    sentAt?: Date;
    contact?: {
      name: string;
      phone: string;
    };
    WaMessageCampaginParticipantMap: {
      campaignParticipantId: string;
      waMessageId: string;
      waMessage: {
        stats: WaMessageStats;
        waCreatedAt: Date;
      };
    }[];
  }[];
  flowId?: string;
  stats?: {
    countRead?: number;
    countSent?: number;
    countFailed?: number;
    countDelivered?: number;
    countPending?: number;
    countCompleted?: number;
  };
  contactTags?: string[];
  name?: string;
};

export function getLatestStatus(participant = []) {
  let latestStatus = null;
  let latestTimestamp = null;

  participant?.forEach((mapping) => {
    Object.entries(mapping?.waMessage?.stats ?? {}).forEach(
      ([status, timestamp]) => {
        if (
          timestamp &&
          (!latestTimestamp ||
            dayjs(timestamp as string).isAfter(latestTimestamp))
        ) {
          latestTimestamp = dayjs(timestamp as string);
          latestStatus = status;
        }
      },
    );
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

  const campaign =
    await prisma.$queryRaw`SELECT c.*, wt."data" as "templateData", t."name" as "teamName", wf."version" as "flowVersion" FROM "Campaign" c 
  LEFT JOIN "WaTemplate" wt ON wt.id = c."waTemplateId" LEFT JOIN "Team" t ON t.id = c."teamId"
  LEFT JOIN "WaFlow" wf ON wf."dbFlowId" = NULLIF(c."flowId",'')::uuid WHERE c.id = ${campaignId}::uuid;`;
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

type CampaignWithExtras = Prisma.CampaignGetPayload<{
  include: {
    team: {
      select: {
        name: true;
      };
    };
    _count: {
      select: {
        campaignParticipants: true;
      };
    };
  };
}> & { flowVersion?: string };

export async function getCampaignsByOrgId(orgId: string) {
  const campaigns = await prisma.$queryRaw`SELECT 
  c.id,
  c."name",
  c."createdAt",
  c."status",
  c."teamId",
  t."name" AS "teamName",
  COUNT(cp.id)::INTEGER AS "campaignParticipantsCount"
FROM "Campaign" c
LEFT JOIN "Team" t ON c."teamId" = t.id
LEFT JOIN "CampaignParticipant" cp ON c.id = cp."campaignId"
WHERE t."orgId" = ${orgId}::uuid
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
    },
  });
  await prisma.campaignStats.create({
    data: {
      campaignId: campaign.id,
    },
  });
  return campaign;
}

export async function updateCampaign(
  campaignId: string,
  data: UpdateCampaignInput,
) {
  return await prisma.campaign.update({
    where: {
      id: campaignId,
    },
    data,
  });
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
  await sendCampaignToParticipants(
    campaignId,
    sendToStatuses,
    participantId,
    userId,
  );
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
    await sendCampaign(
      campaign.id,
      campaign.scheduledStatuses as CampaignParticipantStatus[],
    );
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
      const questionMap = questions.reduce(
        (map, { id, title, description, label }) => {
          map[id] =
            Object.values(title)?.[0] ||
            Object.values(description)?.[0] ||
            Object.values(label)?.[0];
          return map;
        },
        {},
      );
      // Map over each response to replace questionId with the corresponding title
      const updatedResponses = responses.map(
        ({ questionId, response = {}, ...rest }) => ({
          ...rest,
          response: Object.values(response)?.[0],
          title: questionMap[questionId],
        }),
      );

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

export const getResponseExcelByCampaignById = async (id: string) => {
  const [campaign, participants, stats] = await Promise.all([
    getCampaignById(id),
    getCampaignParticipantsByCampaignId(id),
    getCampaginStatsById(id),
  ]);
  const headerArray = [
    "Created At",
    "Participant Name",
    "Phone",
    "Status",
    "Sent At",
  ];
  const bodyArray = participants?.map((participant) => [
    participant?.createdAt,
    participant?.contact?.name,
    participant?.contact?.phone,
    participant?.status,
    participant?.sentAt,
  ]);

  const statsHeaderArray = [
    "Count Pending",
    "Count Read",
    "Count Sent",
    "Count Failed",
    "Count Delivered",
    "Count Completed",
  ];
  const statsBodyArray = [
    stats?.countPending,
    stats?.countRead,
    stats?.countSent,
    stats?.countFailed,
    stats?.countDelivered,
    stats?.countCompleted,
  ];

  const buffer = xlsx.build([
    {
      name: "Stats",
      data: [statsHeaderArray, statsBodyArray],
      options: {},
    },
    {
      name: "Participants",
      data: [headerArray, ...bodyArray],
      options: {},
    },
  ]);

  return [campaign?.name, buffer];
};

export async function getCampaginStatsById(campaignId: string) {
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
    };
  }
  const queueCount = await queue.getJobCounts();

  return {
    countRead: stats.totalRead,
    countSent: stats.totalSend,
    countFailed: stats.totalFailed,
    countDelivered: stats.totalDelivered,
    countPending: stats.campaign?._count?.campaignParticipants ?? 0,
    countCompleted: stats.totalCompleted,
    queueCount: queueCount.waiting + queueCount.delayed,
  };
}

const queue = new Queue("waMessageQueue", { connection: redisConnection });

interface Campaign {
  useUserConsent: boolean;
}

interface CampaignParticipant {
  id: string;
  phone: string;
  name: string;
  tags: string[];
  orgId: string;
  teamId: string;
  dynamicTags: string[];
  data: any;
  defaultValues: any;
}

export async function enqueueCampaignMessage(
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  participantId?: string,
  scheduledAt?: Date,
): Promise<{ status: boolean; message: string }> {
  try {
    const jobs = await queue.getJobs([
      "delayed",
      "waiting",
      "active",
      "failed",
      "paused",
    ]);
    const count = jobs.filter((job) => job.name === campaignId).length;
    if (count > 0) {
      return {
        status: false,
        message: "Campaign already scheduled",
      };
    }

    // Fetch campaign settings
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { useUserConsent: true },
    });

    // Define the contact consent condition
    const contactConsentCondition = campaign?.useUserConsent
      ? Prisma.sql`AND c.consent = true`
      : Prisma.sql``;

    // Fetch participants based on the provided conditions
    const campaignParticipants = await prisma.$queryRaw<CampaignParticipant[]>`
      SELECT cp.id, c.phone, c.name, c.tags, c."orgId", 
             camp."dynamicTags", camp."teamId", wt.data, wt."defaultValues"
      FROM "CampaignParticipant" cp
      JOIN "Contact" c ON cp."contactId" = c.id
      JOIN "Campaign" camp ON cp."campaignId" = camp.id
      JOIN "WaTemplate" wt ON camp."waTemplateId" = wt.id
      WHERE cp."campaignId" = ${campaignId}::uuid
        ${participantId ? Prisma.sql`AND cp.id = ${participantId}::uuid` : Prisma.sql`AND cp.status IN (${Prisma.join(sendToStatuses)})`}
        ${contactConsentCondition}
    `;

    if (campaignParticipants.length === 0) {
      return {
        message: "No participants found matching the conditions",
        status: false,
      };
    }

    const flowId = getFlowIdFromTemplateComponents(
      campaignParticipants[0]?.data?.components,
    );

    const surveyTeamMap = flowId
      ? await prisma.surveyTeamMap.findFirst({
          where: {
            teamId: campaignParticipants[0].teamId,
            survey: {
              WaFlow: {
                flowId,
              },
            },
          },
          select: { id: true },
        })
      : null;

    // Enqueue messages
    await queue.addBulk(
      campaignParticipants.map((participant) => ({
        name: campaignId,
        data: {
          ...participant,
          scheduledAt,
          campaignId,
          surveyTeamMapId: surveyTeamMap?.id,
        },
        opts: {
          delay: scheduledAt
            ? dayjs(scheduledAt).diff(dayjs(), "millisecond")
            : undefined,
          removeOnComplete: true,
          deduplication: { id: participant?.id },
        },
      })),
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

export const deleteCampaignParticipantsByCampaignId = async (
  campaignId: string,
) => {
  const d = await queue.getJobs();
  d.filter((job) => job.name === campaignId).forEach((job) => job.remove());
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
