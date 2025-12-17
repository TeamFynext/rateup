import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  SendCampaignInput,
  UpdateCampaignInput,
} from "./campaign.schema.js";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  sendCampaign,
  updateCampaign,
} from "./campaign.service.js";
import { getDbTemplate } from "../../../whatsapp/internal-copy/whatsapp/messageTemplates/wa_templates.service.js";
import { verifyRole } from "../../../../../../utils/auth.js";
import { Role } from "../../../../../../../generated/prisma/client.js";

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignInput }>,
  reply: FastifyReply,
) {
  const { waTemplateId } = request.body;
  const dbTemplate = await getDbTemplate(waTemplateId);
  if (!dbTemplate) {
    return reply.status(400).send({ message: "Template not found" });
  }

  const campaign = await createCampaign({
    ...request.body,
  });
  return reply.status(201).send(campaign);
}

export async function getCampaignsHandler(
  request: FastifyRequest<{ Querystring: GetCampaignsQuery }>,
  reply: FastifyReply,
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
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: UpdateCampaignInput;
  }>,
  reply: FastifyReply,
) {
  const campaign = await updateCampaign(
    request.params.campaignId,
    request.body,
  );
  return reply.status(200).send(campaign);
}

export async function deleteCampaignByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  const campaign = await deleteCampaign(request.params.campaignId);
  return reply.status(200).send(campaign);
}

export async function sendCampaignHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: SendCampaignInput;
  }>,
  reply: FastifyReply,
) {
  if (
    !request.body.sendToStatuses ||
    request.body.sendToStatuses.length === 0
  ) {
    return reply.status(400).send({ message: "sendToStatuses is required" });
  }
  await sendCampaign(
    request.params.campaignId,
    request.body.sendToStatuses,
    request.body.participantId,
  );
  return reply.status(204).send();
}
