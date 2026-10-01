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
import { CampaignNotFoundError } from "../campaign.errors.js";
import { whatsappContactWhere } from "../../contact/contact.channel.js";
import { buildContactListWhere } from "../../contact/contact.listQuery.js";

async function assertCampaignInOrg(campaignId: string, orgId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { id: true },
  });
  if (!campaign) throw new CampaignNotFoundError();
  return campaign.id;
}

export async function createCampaignParticipantsFromGroup(
  campaignId: string,
  orgId: string,
  data: CreateCampaignParticipantsFromGroupsInput,
) {
  await assertCampaignInOrg(campaignId, orgId);
  const contactGroupMaps = await prisma.contactGroupMap.findMany({
    where: {
      contactGroupId: {
        in: data.groupIds,
      },
      contactGroup: { team: { orgId } },
      // A group can hold contacts from any channel; only the WhatsApp ones are reachable by a
      // campaign. With a filter, only the members it matches are taken.
      contact: data.groupFilter
        ? {
            ...whatsappContactWhere,
            ...buildContactListWhere(orgId, data.groupFilter as PaginationQuery),
          }
        : whatsappContactWhere,
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
  orgId: string,
  data: CreateCampaignParticipantsFromContactsInput,
) {
  await assertCampaignInOrg(campaignId, orgId);
  // Picked ids, plus — when a filter came along — everyone the contacts list matched for it.
  const picked: Prisma.ContactWhereInput = { id: { in: data.contactIds } };
  const contacts = await prisma.contact.findMany({
    where: data.filter
      ? {
          orgId,
          ...whatsappContactWhere,
          OR: [picked, buildContactListWhere(orgId, data.filter as PaginationQuery)],
        }
      : { ...picked, orgId, ...whatsappContactWhere },
    select: { id: true },
  });
  const campaignParticipants = await prisma.campaignParticipant.createMany({
    data: contacts.map(({ id }) => ({
      campaignId,
      contactId: id,
      source: CampaignParticipantSource.INDIVIDUAL,
      status: CampaignParticipantStatus.PENDING,
    })),
    skipDuplicates: true,
  });
  return campaignParticipants;
}
export async function createCampaignParticipantsFromAnotherCampaign(
  campaignId: string,
  orgId: string,
  data: Partial<Omit<CreateCampaignParticipantsInput, "groupIds" | "contactIds">>,
) {
  await assertCampaignInOrg(campaignId, orgId);
  const campaignParticipantsOld = await prisma.campaignParticipant.findMany({
    where: {
      campaignId: {
        in: data.campaignIds,
      },
      campaign: { team: { orgId } },
      contact: whatsappContactWhere,
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
      ?.map(({ contactId, contactGroupId, source }) => ({
        campaignId,
        contactId: contactId,
        source: source ?? CampaignParticipantSource.INDIVIDUAL,
        contactGroupId: contactGroupId,
        status: CampaignParticipantStatus.PENDING,
      })),
    skipDuplicates: true,
  });
  return campaignParticipants;
}
export async function createCampaignParticipants(
  campaignId: string,
  orgId: string,
  data: CreateCampaignParticipantsInput,
) {
  await assertCampaignInOrg(campaignId, orgId);
  // Create participants from contacts, groups, and other campaigns
  const [fromContacts, fromGroups, fromCampaigns] = await Promise.all([
    createCampaignParticipantsFromContacts(campaignId, orgId, {
      contactIds: data.contactIds,
      filter: data.filter,
    }),
    createCampaignParticipantsFromGroup(campaignId, orgId, {
      groupIds: data.groupIds,
      groupFilter: data.groupFilter,
    }),
    createCampaignParticipantsFromAnotherCampaign(campaignId, orgId, data),
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

/** One row's worth of attempt history, as the participants table renders it. */
export interface ParticipantAttempt {
  attemptNo: number;
  trigger: string;
  /** "DELIVERED" | "FAILED" | "SENT" — what this particular attempt achieved. */
  outcome: "DELIVERED" | "READ" | "FAILED" | "SENT";
  at: Date | null;
  errorCode: number | null;
}

/** The `stats` jsonb each WaMessage carries: a timestamp per status, or "". */
interface MessageStats {
  sent?: string;
  delivered?: string;
  read?: string;
  failed?: string;
}

function readStats(value: unknown): MessageStats {
  return value && typeof value === "object" ? (value as MessageStats) : {};
}

/**
 * Fold a participant's messages into one attempt list plus the summary the table
 * shows: how many attempts, when the last one was, why the latest failed, and
 * whether it was read.
 *
 * Derived rather than stored: a participant's history *is* its messages, and a
 * denormalised copy would be one more thing to keep in step with a status
 * webhook that can arrive hours later.
 */
function summariseAttempts(
  // Optional because the relation is only included by the queries that render
  // the attempts column; a caller that selects without it gets an empty history
  // rather than a crash.
  maps: {
    campaignSend: { attemptNo: number; trigger: string } | null;
    waMessage: {
      createdAt: Date;
      errorCode: number | null;
      errorMessage: string | null;
      stats: unknown;
      messageId: string | null;
    };
  }[] = [],
) {
  const attempts: ParticipantAttempt[] = maps.map((map) => {
    const stats = readStats(map.waMessage.stats);
    const outcome: ParticipantAttempt["outcome"] = stats.read
      ? "READ"
      : stats.delivered
        ? "DELIVERED"
        : stats.failed || map.waMessage.errorCode !== null
          ? "FAILED"
          : "SENT";
    return {
      attemptNo: map.campaignSend?.attemptNo ?? 0,
      trigger: map.campaignSend?.trigger ?? "MANUAL",
      outcome,
      at: map.waMessage.createdAt,
      errorCode: map.waMessage.errorCode,
    };
  });

  const latest = attempts.at(-1) ?? null;
  const readAt = maps
    .map((map) => readStats(map.waMessage.stats).read)
    .filter((value): value is string => Boolean(value))
    .at(-1);

  return {
    attempts,
    attemptCount: attempts.length,
    lastAttemptAt: latest?.at ?? null,
    // The most recent failure's reason, not the first: an earlier attempt's
    // error is history once a later one has been made.
    failureCode: latest?.outcome === "FAILED" ? (latest.errorCode ?? null) : null,
    failureMessage:
      latest?.outcome === "FAILED" ? (maps.at(-1)?.waMessage.errorMessage ?? null) : null,
    readAt: readAt ?? null,
  };
}

export async function getCampaignParticipantsByCampaignIdPaginated(
  campaignId: string,
  orgId: string,
  query?: PaginationQuery & {
    selectedDripStage?: string;
  },
) {
  await assertCampaignInOrg(campaignId, orgId);
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
      id: true,
      name: true,
      phone: true,
      consent: true,
    },
  } as const;

  /**
   * Every message this participant has been sent, with the attempt it belonged
   * to. The participants table shows one chip per attempt, so a recipient who
   * failed on the initial send and landed on retry 1 reads as exactly that
   * rather than as a single "SENT".
   */
  const messagesInclude = {
    select: {
      campaignSend: { select: { attemptNo: true, trigger: true } },
      waMessage: {
        select: {
          createdAt: true,
          errorCode: true,
          errorMessage: true,
          stats: true,
          messageId: true,
        },
      },
    },
    orderBy: { campaignSend: { attemptNo: "asc" } },
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
              WaMessageCampaginParticipantMap: messagesInclude,
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
            ...summariseAttempts(campaignParticipant.WaMessageCampaginParticipantMap),
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
              WaMessageCampaginParticipantMap: messagesInclude,
            },
            skip,
            take,
            orderBy,
          })
        ).map((campaignParticipant) => {
          const dripStageId: string | null = null;
          return {
            ...campaignParticipant,
            ...summariseAttempts(campaignParticipant.WaMessageCampaginParticipantMap),
            dripStageId,
          };
        });

  return {
    participants,
    totalCount,
    searchCount,
  };
}

export async function getCampaignParticipantById(campaignParticipantId: string, orgId: string) {
  const campaignParticipant = await prisma.campaignParticipant.findFirst({
    where: {
      id: campaignParticipantId,
      campaign: { team: { orgId } },
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

export async function deleteCampaignParticipantById(campaignParticipantId: string, orgId: string) {
  const campaignParticipant = await prisma.campaignParticipant.delete({
    where: {
      id: campaignParticipantId,
      campaign: { team: { orgId } },
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

export async function multipleDeleteCampaignParticipant(
  campaignParticipantIds: string[],
  orgId: string,
) {
  const campaignParticipant = await prisma.campaignParticipant.deleteMany({
    where: {
      id: {
        in: campaignParticipantIds,
      },
      campaign: { team: { orgId } },
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
