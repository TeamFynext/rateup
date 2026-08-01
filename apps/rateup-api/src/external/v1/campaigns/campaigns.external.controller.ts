import { FastifyReply, FastifyRequest } from "fastify";
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

export async function createCampaignExternalController(
  request: Parameters<typeof createCampaignHandler>[0],
  reply: FastifyReply,
) {
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
