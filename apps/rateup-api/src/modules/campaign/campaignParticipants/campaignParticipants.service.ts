import { CampaignParticipant } from "@prisma/client";
import { CampaignParticipantSource, CampaignParticipantStatus } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { CreateCampaignParticipantsFromContactsInput, CreateCampaignParticipantsFromGroupsInput } from "./campaignParticipants.schema";

export async function createCampaignParticipantsFromGroup(campaignId: string, data: CreateCampaignParticipantsFromGroupsInput) {
    const contactGroupMaps = await prisma.contactGroupMap.findMany({
        where: {
            contactGroupId: {
                in: data.groupIds
            }
        }
    })
    // TODO: handle duplicate contactIds
    const campaignParticipants = await prisma.campaignParticipant.createMany({
        data: contactGroupMaps.map(({ contactId, contactGroupId }) => ({
            campaignId,
            contactId: contactId,
            source: CampaignParticipantSource.GROUP,
            contactGroupId: contactGroupId,
            status: CampaignParticipantStatus.PENDING
        })),
        skipDuplicates: true
    })
    return campaignParticipants;
}

export async function createCampaignParticipantsFromContacts(campaignId: string, data: CreateCampaignParticipantsFromContactsInput) {
    const campaignParticipants = await prisma.campaignParticipant.createMany({
        data: data.contactIds.map((contactId) => ({
            campaignId,
            contactId: contactId,
            source: CampaignParticipantSource.INDIVIDUAL,
            status: CampaignParticipantStatus.PENDING
        }))
    })
    return campaignParticipants;
}

export async function getCampaignParticipantsByCampaignId(campaignId: string) {
    const campaignParticipants = await prisma.campaignParticipant.findMany({
        where: {
            campaignId
        }
    })
    return campaignParticipants;
}

export async function getCampaignParticipantById(campaignParticipantId: string) {
    const campaignParticipant = await prisma.campaignParticipant.findUnique({
        where: {
            id: campaignParticipantId
        }
    })
    return campaignParticipant;
}

/**
 * Returns participants with contact details
 */
export async function getCampaignParticipantsByIds(campaignParticipantIds: string[]) {
    const campaignParticipants = await prisma.campaignParticipant.findMany({
        where: {
            id: {
                in: campaignParticipantIds
            }
        },
        include: {
            contact: true
        }
    })
    return campaignParticipants;
}

export async function deleteCampaignParticipantById(campaignParticipantId: string) {
    const campaignParticipant = await prisma.campaignParticipant.delete({
        where: {
            id: campaignParticipantId
        }
    })
    return campaignParticipant;
}

export async function updateCampaignParticipant(campaignParticipantId: string, data: Partial<CampaignParticipant>) {
    const campaignParticipant = await prisma.campaignParticipant.update({
        where: {
            id: campaignParticipantId
        },
        data
    })
    return campaignParticipant;
}