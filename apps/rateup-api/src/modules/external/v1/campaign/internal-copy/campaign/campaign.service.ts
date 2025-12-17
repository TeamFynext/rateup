import dayjs from "dayjs";
import prisma from "../../../../../../utils/prisma.js";
import {
  CampaignParticipantStatus,
  CampaignStatus,
} from "../../../../../../types/enums.js";
import { CreateCampaignInput, UpdateCampaignInput } from "./campaign.schema.js";
import { log } from "../../../../../../utils/logger.js";
import { sendCampaignToParticipants } from "../../../../../whatsapp/whatsappSurvey/wasurvey.controller.js";

type campaginExtentend = {
  team: {
    id: string;
    createdAt: Date;
    name: string;
    code: string;
    googleLink: string;
    tags: string[];
    orgId: string;
  };
  waTemplate: {
    data: {};
  };
  campaignParticipants: {
    status: string;
    WaMessageCampaginParticipantMap: any[];
    waStatus?: string;
  }[];
  flowId?: string;
  stats?: {};
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
      team: true,
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
      countFailed++;
    }
    const FlowId = campaign?.flowId;
    if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED)
      countCompleted++;
    participant.waStatus = latestStatus;
    delete participant.WaMessageCampaginParticipantMap;
  });

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
) {
  await updateCampaign(campaignId, {
    status: CampaignStatus.ACTIVE,
    startedAt: new Date(),
  });
  log.trace("updated campaign status to active");
  await sendCampaignToParticipants(campaignId, sendToStatuses, participantId);
  // add state indicating survey is sent to all participants?
}
