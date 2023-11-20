import { FastifyRequest, FastifyReply } from "fastify";
import { ByCampaignIdParams, CreateCampaignInput, GetCampaignsQuery, UpdateCampaignInput } from "./campaign.schema";
import { createCampaign, deleteCampaign, getCampaignById, getCampaignsByOrgId, getCampaignsByTeamId, startCampaign, updateCampaign } from "./campaign.service";
import { Role } from "@prisma/client";
import { verifyRole } from "../../utils/auth";
import { CampaignStatus } from "../../types/enums";

export async function createCampaignHandler(
    request: FastifyRequest<{ Body: CreateCampaignInput }>,
    reply: FastifyReply
) {
    const campaign = await createCampaign(request.body);
    return reply.status(201).send(campaign);
}

export async function getCampaignsHandler(
    request: FastifyRequest<{ Querystring: GetCampaignsQuery }>,
    reply: FastifyReply
) {
    let res = null;
    if (request.query.campaignId) {
        // get individual contact group by id
        res = await getCampaignById(request.query.campaignId);
    } else if (request.query.teamId) {
        // get all contact groups for a specific team
        res = await getCampaignsByTeamId(request.query.teamId);
    } else {
        // get all contact groups for all teams
        if (verifyRole(request, reply, Role.SUPER_ADMIN)) {
            res = await getCampaignsByOrgId(request.user.orgId);
        }
    }
    return reply.code(200).send(res);
}

export async function updateCampaignByIdHandler(
    request: FastifyRequest<{ Params: ByCampaignIdParams, Body: UpdateCampaignInput }>,
    reply: FastifyReply
) {
    const campaign = await updateCampaign(request.params.campaignId, request.body);
    if(request.body.status === CampaignStatus.ACTIVE) await startCampaign(request.params.campaignId)
    return reply.status(200).send(campaign);
}

export async function deleteCampaignByIdHandler(
    request: FastifyRequest<{ Params: ByCampaignIdParams }>,
    reply: FastifyReply
) {
    const campaign = await deleteCampaign(request.params.campaignId);
    return reply.status(200).send(campaign);
}

export async function startCampaignHandler(
    request: FastifyRequest<{ Params: ByCampaignIdParams }>,
    reply: FastifyReply
) {
    await startCampaign(request.params.campaignId);
    return reply.status(204).send();
}