import prisma from "../../utils/prisma";
import { CreateCampaignInput, UpdateCampaignInput } from "./campaign.schema";
import { sendCampaignToParticipants } from "../whatsapp/whatsappSurvey/wasurvey.controller";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  SubscriptionFeaturePathName,
} from "../../types/enums";
import { log } from "../../utils/logger";
import dayjs from "dayjs";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service";
import { getSubscription, getUsageStats } from "./campaign.auth";
import xlsx from "node-xlsx";

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
        orgId: string;
        contactTags: string[];
      };
    };
  };
  waTemplate: {
    data: {};
  };
  campaignParticipants: {
    status: string;
    WaMessageCampaginParticipantMap: any[];
    waStatus?: string;
    createdAt: Date;
    sentAt?: Date;
    contact?: {
      name: string;
      phone: string;
    };
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
export function getLatestStatus(participant) {
  let latestStatus = null;
  let latestTimestamp = null;

  participant.WaMessageCampaginParticipantMap.forEach((mapping) => {
    Object.entries(mapping.waMessage.stats).forEach(([status, timestamp]) => {
      if (
        timestamp &&
        (!latestTimestamp ||
          dayjs(timestamp as string).isAfter(latestTimestamp))
      ) {
        latestTimestamp = dayjs(timestamp as string);
        latestStatus = status;
      }
    });
  });

  return latestStatus;
}

export async function getCampaignById(campaignId: string) {
  const campaign: campaginExtentend = await prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
    include: {
      team: {
        include: {
          org: {
            select: {
              WaAccountSettings: true,
            },
          },
        },
      },
      waTemplate: {
        select: {
          data: true,
        },
      },
      campaignParticipants: {
        include: {
          contact: true,
          campaign: {
            select: {
              flowId: true,
            },
          },
          WaMessageCampaginParticipantMap: {
            include: {
              waMessage: {
                select: {
                  stats: true,
                  waCreatedAt: true,
                },
              },
            },
            orderBy: {
              waMessage: {
                waCreatedAt: "desc",
              },
            },
          },
        },
      },
    },
  });
  let countRead = 0;
  let countSent = 0;
  let countFailed = 0;
  let countDelivered = 0;
  let countPending = 0;
  let countCompleted = 0;

  function updateCounters(stats) {
    if (stats.read) countRead++;
    if (stats.sent) countSent++;
    if (stats.delivered) countDelivered++;
  }

  campaign.campaignParticipants.forEach((participant) => {
    const participantStatus = participant.status;
    const latestStatus = getLatestStatus(participant);

    if (participantStatus === CampaignParticipantStatus.PENDING) {
      countPending++;
    } else if (participantStatus === CampaignParticipantStatus.FAILED) {
      countFailed++;
    } else {
      participant.WaMessageCampaginParticipantMap.forEach((item) => {
        updateCounters(item.waMessage.stats);
      });
    }
    if (latestStatus?.toUpperCase() === CampaignParticipantStatus.FAILED) {
      countSent--;
      countFailed++;
    }
    const FlowId = campaign?.flowId;
    if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED)
      countCompleted++;
    participant.waStatus = latestStatus;
    delete participant.WaMessageCampaginParticipantMap;
  });
  campaign.contactTags = campaign.team.org?.WaAccountSettings?.contactTags;
  delete campaign.team.org;

  campaign.stats = {
    countRead,
    countSent,
    countFailed,
    countDelivered,
    countPending,
    countCompleted,
  };
  return campaign;
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
export async function getCampaignsByOrgId(orgId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      team: {
        orgId,
      },
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          campaignParticipants: true,
        },
      },
    },
  });
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
      campaignParticipants: {
        select: {
          contactId: true,
        },
      },
    },
  });
  return result.map(({ name, id, campaignParticipants }) => ({
    campaignName: name,
    campaignId: id,
    participantsContactIds: campaignParticipants.map(
      ({ contactId }) => contactId,
    ),
  }));
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

  const orgId = campaignsToBeSent?.[0].team.orgId;

  const [usage, subscription] = await Promise.all([
    getUsageStats(orgId),
    getSubscription(orgId),
  ]);

  if (!usage || !subscription) {
    let errorMessage = "Usage stats or subscription not found";
    await updateCampaign(campaignsToBeSent?.[0].id, {
      status: CampaignStatus.INACTIVE,
      errorMessage: errorMessage,
    });
    log.error(errorMessage, "in schedule", orgId);
    return;
  }

  const newMessagesCount = campaignsToBeSent.length;

  const monthlyMessageLimit =
    subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
      ?.monthlyMessageLimit ?? 0;

  if (
    (usage.monthlyMessagesCount ?? 0) + newMessagesCount >
    monthlyMessageLimit
  ) {
    let errorMessage =
      usage.monthlyMessagesCount >= monthlyMessageLimit
        ? "You have reached the maximum monthly limit of messages."
        : `Sending messages to all participants will exceed the monthly limit. Please reduce the number of messages by ${
            monthlyMessageLimit - usage.monthlyMessagesCount
          } to proceed.`;
    await updateCampaign(campaignsToBeSent?.[0].id, {
      status: CampaignStatus.ACTIVE,
      errorMessage: errorMessage,
    });
    log.error(errorMessage, "in schedule", orgId);
    return;
  }
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
  const campaign = await getCampaignById(id);
  const headerArray = [
    "Created At",
    "Participant Name",
    "Phone",
    "Status",
    "Sent At",
  ];
  const bodyArray = campaign.campaignParticipants.map((participant) => [
    participant?.createdAt,
    participant?.contact?.name,
    participant?.contact?.phone,
    participant?.waStatus || participant?.status,
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
    campaign?.stats?.countPending,
    campaign?.stats?.countRead,
    campaign?.stats?.countSent,
    campaign?.stats?.countFailed,
    campaign?.stats?.countDelivered,
    campaign?.stats?.countCompleted,
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
