import { CampaignParticipantSource, CampaignParticipantStatus } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import {
  CreateCampaignParticipantsFromContactsInput,
  CreateCampaignParticipantsFromGroupsInput,
  CreateCampaignParticipantsInput,
} from "./campaignParticipants.schema.js";
import { mapStatuses } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { PaginationQuery } from "../../contact/contact.schema.js";
import { CampaignParticipant, Prisma } from "../../../../generated/prisma/client.js";

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
    skipDuplicates: true,
  });
  return campaignParticipants;
}
export async function createCampaignParticipantsFromAnotherCampaign(
  campaignId: string,
  data: Partial<Omit<CreateCampaignParticipantsInput, "groupIds" | "contactIds">>,
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
  // `status` is a String column at the DB level (see Prisma schema comment), not the
  // CampaignParticipantStatus enum itself, so compare against the enum's string values.
  const statusValues: string[] = status;
  const campaignParticipants = await prisma.campaignParticipant.createMany({
    data: campaignParticipantsOld
      ?.filter((participant) => statusValues.includes(participant.status.toUpperCase()))
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
  // Create participants from contacts, groups, and other campaigns
  const [fromContacts, fromGroups, fromCampaigns] = await Promise.all([
    createCampaignParticipantsFromContacts(campaignId, {
      contactIds: data.contactIds,
    }),
    createCampaignParticipantsFromGroup(campaignId, {
      groupIds: data.groupIds,
    }),
    createCampaignParticipantsFromAnotherCampaign(campaignId, data),
  ]);

  // Fetch all participant IDs for this campaign
  const participants = await prisma.campaignParticipant.findMany({
    where: { campaignId },
    select: { id: true },
  });

  // Fetch all drip stages for this campaign
  const dripStages = await prisma.campaignDripStage.findMany({
    where: { campaignId },
    orderBy: { delay: "asc" },
  });

  // Prepare data for participant-drip stage mapping
  const participantDripStageData = [];
  for (const participant of participants) {
    for (const stage of dripStages) {
      participantDripStageData.push({
        participantId: participant.id,
        dripStageId: stage.id,
        status: "PENDING",
      });
    }
  }

  // Create mappings in bulk
  if (participantDripStageData.length > 0) {
    await prisma.campaignParticipantDripStage.createMany({
      data: participantDripStageData,
      skipDuplicates: true,
    });
  }

  return { fromContacts, fromGroups, fromCampaigns };
}

export async function getCampaignParticipantsByCampaignId(campaignId: string, _extra = {}) {
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
  query?: PaginationQuery & {
    selectedDripStage?: string;
  },
) {
  const {
    page,
    limit,
    desc = "asc",
    search = "",
    sort = "createdAt",
    selectedDripStage,
    ...filter
  } = query ?? {};

  let filterData: Prisma.CampaignParticipantWhereInput[] = [];
  if (filter) {
    const params = new URLSearchParams(filter);
    for await (const [key, value] of params.entries()) {
      if (key === "name" || key === "phone") {
        filterData.push({
          contact: {
            [key]: {
              contains: value,
              mode: "insensitive",
            },
          },
        });
      } else if (key === "consent") {
        filterData.push({
          contact: {
            consent: {
              equals: value?.toLocaleLowerCase() === "true",
            },
          },
        });
      } else if (key === "status") {
        filterData.push({
          status: {
            equals: value,
            mode: "insensitive",
          },
        });
      } else if (key === "createdAt" || key === "sentAt") {
        // DateTime fields — no `mode` (that's string-only) and the Prisma filter key is
        // `equals`, not `equal` (the previous typo silently produced an invalid filter
        // that was never actually applied).
        filterData.push({
          [key]: {
            equals: value,
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

  const where: Prisma.CampaignParticipantWhereInput =
    filterData?.length > 0
      ? {
          campaignId,
          OR: filterData,
        }
      : {
          campaignId,
        };
  const skip = page && limit ? Number(page) * Number(limit) : undefined;
  const take = limit ? Number(limit) : undefined;
  const orderBy = { [sort]: desc };
  const contactSelect = {
    select: {
      name: true,
      phone: true,
      consent: true,
    },
  } as const;

  // The include shape — and the resulting `.map()` — is branched (rather than a single
  // query with a conditionally-spread `include` key) so each branch's Prisma result type
  // is statically known and concrete, not a union that collapses the drip-stage relation
  // down to `unknown`.
  const participants =
    selectedDripStage && selectedDripStage !== "all"
      ? (
          await prisma.campaignParticipant.findMany({
            where,
            include: {
              contact: contactSelect,
              CampaignParticipantDripStage: {
                where: {
                  dripStageId: selectedDripStage,
                },
              },
            },
            skip,
            take,
            orderBy,
          })
        ).map((campaignParticipant) => {
          const dripStage = campaignParticipant.CampaignParticipantDripStage[0];
          return {
            ...campaignParticipant,
            status: dripStage?.status ?? campaignParticipant.status,
            dripStageId: dripStage?.dripStageId ?? null,
            sentAt: dripStage?.sentAt ?? campaignParticipant.sentAt,
            createdAt: dripStage?.createdAt ?? campaignParticipant.createdAt,
          };
        })
      : (
          await prisma.campaignParticipant.findMany({
            where,
            include: {
              contact: contactSelect,
            },
            skip,
            take,
            orderBy,
          })
        ).map((campaignParticipant) => {
          const dripStageId: string | null = null;
          return {
            ...campaignParticipant,
            dripStageId,
          };
        });

  return {
    participants,
    totalCount,
    searchCount,
  };
}

export async function getCampaignParticipantById(campaignParticipantId: string) {
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
export async function getCampaignParticipantsByIds(campaignParticipantIds: string[]) {
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

export async function deleteCampaignParticipantById(campaignParticipantId: string) {
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
export async function updateDripCampaignParticipant(
  id: string,
  data: Partial<CampaignParticipant>,
) {
  const campaignParticipant = await prisma.campaignParticipantDripStage.update({
    where: {
      id,
    },
    data,
  });
  return campaignParticipant;
}

export async function multipleDeleteCampaignParticipant(campaignParticipantIds: string[]) {
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
  if (!waMessage) {
    throw new Error(`WaMessage with messageId ${messageId} not found.`);
  }
  const mapData = await prisma.waMessageCampaginParticipantMap.create({
    data: {
      campaignParticipantId,
      waMessageId: waMessage.id,
    },
  });
  return mapData;
}
