import { CampaignParticipant } from "@prisma/client";
import {
  CampaignParticipantSource,
  CampaignParticipantStatus,
} from "../../../types/enums";
import prisma from "../../../utils/prisma";
import {
  CreateCampaignParticipantsFromContactsInput,
  CreateCampaignParticipantsFromGroupsInput,
  CreateCampaignParticipantsInput,
} from "./campaignParticipants.schema";
import { mapStatuses } from "../../whatsapp/whatsappSurvey/wasurvey.utils";
import { PaginationQuery } from "../../contact/contact.schema";

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
  const loyaltyGroupMaps = await prisma.loyaltyCustomerMap.findMany({
    where: {
      contactGroupId: {
        in: data.groupIds,
      },
    },
    include: {
      loyaltyCustomer: {
        select: {
          contactId: true,
        },
      },
    },
  });

  let combined = [
    ...contactGroupMaps,
    ...loyaltyGroupMaps?.map(({ loyaltyCustomer, contactGroupId }) => ({
      contactId: loyaltyCustomer.contactId,
      contactGroupId,
    })),
  ];
  // TODO: handle duplicate contactIds
  const campaignParticipants = await prisma.campaignParticipant.createMany({
    data: combined.map(({ contactId, contactGroupId }) => ({
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

export async function getCampaignParticipantsByCampaignId(
  campaignId: string,
  extra = {},
) {
  const campaignParticipants = await prisma.campaignParticipant.findMany({
    where: {
      campaignId,
    },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
          consent: true,
        },
      },
    },
  });

  return campaignParticipants;
}

export async function getCampaignParticipantsByCampaignIdPaginated(
  campaignId: string,
  query?: PaginationQuery,
) {
  const {
    page,
    limit,
    desc = "asc",
    search = "",
    sort = "createdAt",
    ...filter
  } = query;

  let filterData = [];
  if (filter) {
    const params = new URLSearchParams(filter);
    for await (const [key, value] of params.entries()) {
      if (["name", "phone"].includes(key)) {
        filterData.push({
          contact: {
            [key]: {
              contains: value,
              mode: "insensitive",
            },
          },
        });
      } else if ("consent" === key) {
        filterData.push({
          contact: {
            [key]: {
              equals: value?.toLocaleLowerCase() === "true",
            },
          },
        });
      } else if (["createdAt", "status", "sentAt"].includes(key)) {
        filterData.push({
          [key]: {
            equal: value,
            mode: "insensitive",
          },
        });
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      contact: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    });
    filterData.push({
      contact: {
        phone: {
          contains: search,
        },
      },
    });
  }

  const totalCount = await prisma.campaignParticipant.count({
    where: {
      campaignId,
    },
  });

  let searchCount = 0;
  if (filterData.length > 0)
    searchCount = await prisma.campaignParticipant.count({
      where: {
        campaignId,
        OR: filterData,
      },
    });
  else searchCount = totalCount;

  const campaignParticipants = await prisma.campaignParticipant.findMany({
    where:
      filterData?.length > 0
        ? {
            campaignId,
            OR: filterData,
          }
        : {
            campaignId,
          },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
          consent: true,
        },
      },
    },
    skip: page && limit ? Number(page) * Number(limit) : undefined,
    take: limit ? Number(limit) : undefined,
    orderBy: {
      [sort]: desc,
    },
  });

  return { participants: campaignParticipants, totalCount, searchCount };
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
