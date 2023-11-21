import { FastifyRequest, FastifyReply } from "fastify";
import { CreateCampaignParticipantsFromContactsInput, CreateCampaignParticipantsFromGroupsInput, ByCampaignParticipantIdParams, CreateCampaignParticipantsInput } from "./campaignParticipants.schema";
import { createCampaignParticipants, createCampaignParticipantsFromContacts, createCampaignParticipantsFromGroup, deleteCampaignParticipantById, getCampaignParticipantById, getCampaignParticipantsByCampaignId } from "./campaignParticipants.service";
import { ByCampaignIdParams } from "../campaign.schema";

export async function createCampaignParticipantsFromContactsHandler(
    request: FastifyRequest<{
        Body: CreateCampaignParticipantsFromContactsInput,
        Params: ByCampaignIdParams
    }>,
    reply: FastifyReply
) {
    const campaignParticipants = await createCampaignParticipantsFromContacts(request.params.campaignId, request.body);
    reply.send(campaignParticipants);
}

export async function createCampaignParticipantsFromGroupHandler(
    request: FastifyRequest<{ 
        Body: CreateCampaignParticipantsFromGroupsInput,
        Params: ByCampaignIdParams
     }>,
    reply: FastifyReply
) {
    const campaignParticipants = await createCampaignParticipantsFromGroup(request.params.campaignId, request.body);
    reply.send(campaignParticipants);
}

export async function createCampaignParticipantsHandler(
    request: FastifyRequest<{ 
        Body: CreateCampaignParticipantsInput,
        Params: ByCampaignIdParams
     }>,
    reply: FastifyReply
) {
    const campaignParticipants = await createCampaignParticipants(request.params.campaignId, request.body);
    reply.send(campaignParticipants);
}

export async function getCampaignParticipantsByCampaignIdHandler(
    request: FastifyRequest<{ Params: ByCampaignIdParams }>,
    reply: FastifyReply
) {
    const campaignParticipants = await getCampaignParticipantsByCampaignId(request.params.campaignId);
    reply.send(campaignParticipants);
}

export async function getCampaignParticipantByIdHandler(
    request: FastifyRequest<{ Params: ByCampaignParticipantIdParams }>,
    reply: FastifyReply
) {
    const campaignParticipant = await getCampaignParticipantById(request.params.campaignParticipantId);
    reply.send(campaignParticipant);
}

export async function deleteCampaignParticipantByIdHandler(
    request: FastifyRequest<{ Params: ByCampaignParticipantIdParams }>,
    reply: FastifyReply
) {
    const campaignParticipant = await deleteCampaignParticipantById(request.params.campaignParticipantId);
    reply.send(campaignParticipant);
}
