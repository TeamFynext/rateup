import { FastifyReply } from "fastify";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignsHandler,
  getResponseByCampaignByIdHandler,
  sendCampaignHandler,
} from "../../../modules/campaign/campaign.controller.js";
import {
  createCampaignParticipantsFromContactsHandler,
  getCampaignParticipantsByCampaignIdHandler,
} from "../../../modules/campaign/campaignParticipants/campaignParticipants.controller.js";
import prisma from "../../../utils/prisma.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `createCampaign` checks the team and the flow against the org, but writes `waTemplateId`
 * and every drip stage's `templateId` as given — a campaign could be pointed at another
 * org's template. Answered in the campaign handlers' `{ message, code }` shape.
 */
async function hasForeignTemplate(orgId: string, templateIds: string[]) {
  const ids = [...new Set(templateIds)];
  if (ids.length === 0) return false;
  if (ids.some((id) => !UUID.test(id))) return true;
  const owned = await prisma.waTemplate.count({ where: { id: { in: ids }, orgId } });
  return owned !== ids.length;
}

export async function createCampaignExternalController(
  request: Parameters<typeof createCampaignHandler>[0],
  reply: FastifyReply,
) {
  const { waTemplateId, dripStages } = request.body;
  const templateIds = [
    ...(waTemplateId ? [waTemplateId] : []),
    ...(dripStages ?? []).map((stage) => stage.templateId),
  ];
  if (await hasForeignTemplate(request.user.orgId, templateIds)) {
    return reply.status(404).send({ message: "Template not found", code: "TEMPLATE_NOT_FOUND" });
  }
  return createCampaignHandler(request, reply);
}

export async function getCampaignsExternalController(
  request: Parameters<typeof getCampaignsHandler>[0],
  reply: FastifyReply,
) {
  return getCampaignsHandler(request, reply);
}

export async function getCampaignResponsesExternalController(
  request: Parameters<typeof getResponseByCampaignByIdHandler>[0],
  reply: FastifyReply,
) {
  return getResponseByCampaignByIdHandler(request, reply);
}

export async function deleteCampaignByIdExternalController(
  request: Parameters<typeof deleteCampaignByIdHandler>[0],
  reply: FastifyReply,
) {
  return deleteCampaignByIdHandler(request, reply);
}

export async function sendCampaignExternalController(
  request: Parameters<typeof sendCampaignHandler>[0],
  reply: FastifyReply,
) {
  return sendCampaignHandler(request, reply);
}

export async function createCampaignParticipantsFromContactsExternalController(
  request: Parameters<typeof createCampaignParticipantsFromContactsHandler>[0],
  reply: FastifyReply,
) {
  return createCampaignParticipantsFromContactsHandler(request, reply);
}

export async function getCampaignParticipantsByCampaignIdExternalController(
  request: Parameters<typeof getCampaignParticipantsByCampaignIdHandler>[0],
  reply: FastifyReply,
) {
  return getCampaignParticipantsByCampaignIdHandler(request, reply);
}
