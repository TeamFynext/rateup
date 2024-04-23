import prisma from "../../utils/prisma";
import { UpdateCampaignInput } from "./campaign.schema";
import { sendCampaignToParticipants } from "../whatsapp/whatsappSurvey/wasurvey.controller";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { log } from "../../utils/logger";

export async function getCampaignById(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
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
        },
      },
    },
  });
  return campaign;
}

export async function getCampaignsByTeamId(teamId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      teamId,
    },
    include: {
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

export async function createCampaign(data: any) {
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      type: data.type,
      teamId: data.teamId,
      waTemplateId: data.waTemplateId ?? undefined,
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

export async function startCampaign(campaignId: string) {
  await updateCampaign(campaignId, {
    status: CampaignStatus.ACTIVE,
    startedAt: new Date(),
  });
  log.trace("updated campaign status to active");
  await sendCampaignToParticipants(campaignId);
  // add state indicating survey is sent to all participants?
}
