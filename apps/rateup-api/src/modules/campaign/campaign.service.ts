import prisma from "../../utils/prisma";
import { CreateCampaignInput, UpdateCampaignInput } from "./campaign.schema";
import { sendSurveyToParticipants } from "../whatsapp/whatsappSurvey/wasurvey.controller";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { log } from "../../utils/logger";

export async function getCampaignById(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
    include: {
      team: true,
      surveyTeamMap: {
        select: {
          survey: {
            include: {
              WaFlow: true,
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

export async function createCampaign(data: CreateCampaignInput) {
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      type: data.type,
      teamId: data.teamId,
      surveyTeamMapId: data.surveyTeamMapId,
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
  await sendSurveyToParticipants(campaignId);
  // add state indicating survey is sent to all participants?
}
