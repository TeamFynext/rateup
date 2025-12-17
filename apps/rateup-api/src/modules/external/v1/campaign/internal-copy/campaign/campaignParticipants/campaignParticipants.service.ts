import { CampaignParticipant } from "../../../../../../../../generated/prisma/client.js";
import {
  CreateCampaignParticipantsFromContactsInput,
  CreateCampaignParticipantsFromGroupsInput,
  CreateCampaignParticipantsInput,
} from "./campaignParticipants.schema.js";
import { getLatestStatus } from "../campaign.service.js";
import {
  CampaignParticipantSource,
  CampaignParticipantStatus,
} from "../../../../../../../types/enums.js";
import prisma from "../../../../../../../utils/prisma.js";
import { mapStatuses } from "../../../../whatsapp/internal-copy/whatsapp/whatsappSurvey/wasurvey.utils.js";

export async function createCampaignParticipantsFromGroup(
  campaignId: string,
  data: CreateCampaignParticipantsFromGroupsInput,
) {
  const contactGroupMaps = await prisma.contactGroupMap.findMany({
    where: {
      contactGroupId: {
        in: data.groupIds,
      },
    },
  });
  // TODO: handle duplicate contactIds
  const campaignParticipants = await prisma.campaignParticipant.createMany({
    data: contactGroupMaps.map(({ contactId, contactGroupId }) => ({
      campaignId,
      contactId: contactId,
      source: CampaignParticipantSource.GROUP,
      contactGroupId: contactGroupId,
      status: CampaignParticipantStatus.PENDING,
    })),
    skipDuplicates: true,
  });
  return campaignParticipants;
}

export async function createCampaignParticipantsFromContacts(
  campaignId: string,
  data: CreateCampaignParticipantsFromContactsInput,
) {
  const campaignParticipants = await prisma.campaignParticipant.createMany({
    data: data.contactIds.map((contactId) => ({
      campaignId,
      contactId: contactId,
      source: CampaignParticipantSource.INDIVIDUAL,
      status: CampaignParticipantStatus.PENDING,
    })),
  });
  return campaignParticipants;
}
export async function createCampaignParticipantsFromAnotherCampaign(
  campaignId: string,
  data: Partial<
    Omit<CreateCampaignParticipantsInput, "groupIds" | "contactIds">
  >,
) {
  const campaignParticipantsOld = await prisma.campaignParticipant.findMany({
    where: {
      campaignId: {
        in: data.campaignIds,
      },
    },
    include: {
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
            },
          },
        },
      },
    },
  });
  campaignParticipantsOld?.forEach((participant) => {
    const participantStatus = participant.status;
    let latestStatus = getLatestStatus(participant);
    const FlowId = participant?.campaign?.flowId;
    if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED)
      latestStatus = CampaignParticipantStatus.COMPLETED;
    else if (participantStatus === CampaignParticipantStatus.FAILED)
      latestStatus = CampaignParticipantStatus.FAILED;
    participant.status = latestStatus ?? CampaignParticipantStatus.PENDING;
  });
  const status = mapStatuses(data.status);
  const campaignParticipants = await prisma.campaignParticipant.createMany({
    data: campaignParticipantsOld
      ?.filter((participant) =>
        status.includes(participant.status?.toUpperCase()),
      )
      ?.map(({ contactId, contactGroupId }) => ({
        campaignId,
        contactId: contactId,
        source: CampaignParticipantSource.GROUP,
        contactGroupId: contactGroupId,
        status: CampaignParticipantStatus.PENDING,
      })),
    skipDuplicates: true,
  });
  return campaignParticipants;
}
export async function createCampaignParticipants(
  campaignId: string,
  data: CreateCampaignParticipantsInput,
) {
  const promise = Promise.all([
    createCampaignParticipantsFromContacts(campaignId, {
      contactIds: data.contactIds,
    }),
    createCampaignParticipantsFromGroup(campaignId, {
      groupIds: data.groupIds,
    }),
    createCampaignParticipantsFromAnotherCampaign(campaignId, data),
  ]);
  promise.then((results) => results).catch((error) => error);
}

export async function getCampaignParticipantsByCampaignId(campaignId: string) {
  const campaignParticipants = await prisma.campaignParticipant.findMany({
    where: {
      campaignId,
    },
  });
  return campaignParticipants;
}

export async function getCampaignParticipantById(
  campaignParticipantId: string,
) {
  const campaignParticipant = await prisma.campaignParticipant.findUnique({
    where: {
      id: campaignParticipantId,
    },
  });
  return campaignParticipant;
}

/**
 * Returns participants with contact details
 */
export async function getCampaignParticipantsByIds(
  campaignParticipantIds: string[],
) {
  const campaignParticipants = await prisma.campaignParticipant.findMany({
    where: {
      id: {
        in: campaignParticipantIds,
      },
    },
    include: {
      contact: true,
    },
  });
  return campaignParticipants;
}

export async function deleteCampaignParticipantById(
  campaignParticipantId: string,
) {
  const campaignParticipant = await prisma.campaignParticipant.delete({
    where: {
      id: campaignParticipantId,
    },
  });
  return campaignParticipant;
}

export async function updateCampaignParticipant(
  campaignParticipantId: string,
  data: Partial<CampaignParticipant>,
) {
  const campaignParticipant = await prisma.campaignParticipant.update({
    where: {
      id: campaignParticipantId,
    },
    data,
  });
  return campaignParticipant;
}

export async function multipleDeleteCampaignParticipant(
  campaignParticipantIds: string[],
) {
  const campaignParticipant = await prisma.campaignParticipant.deleteMany({
    where: {
      id: {
        in: campaignParticipantIds,
      },
    },
  });
  return campaignParticipant;
}
export async function addWaMessageCampaignParticipantMap(
  campaignParticipantId: string,
  messageId: string,
) {
  const waMessage = await prisma.waMessage.findFirst({
    where: {
      messageId,
    },
  });
  const mapData = await prisma.waMessageCampaginParticipantMap.create({
    data: {
      campaignParticipantId,
      waMessageId: waMessage?.id,
    },
  });
  return mapData;
}
