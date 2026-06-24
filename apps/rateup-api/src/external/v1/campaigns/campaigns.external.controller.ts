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
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return createCampaignHandler(request as any, reply);
}

export async function getCampaignsExternalController(request: FastifyRequest, reply: FastifyReply) {
  return getCampaignsHandler(request as any, reply);
}

export async function getCampaignResponsesExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getResponseByCampaignByIdHandler(request as any, reply);
}

export async function deleteCampaignByIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return deleteCampaignByIdHandler(request as any, reply);
}

export async function sendCampaignExternalController(request: FastifyRequest, reply: FastifyReply) {
  return sendCampaignHandler(request as any, reply);
}

export async function createCampaignParticipantsFromContactsExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return createCampaignParticipantsFromContactsHandler(request as any, reply);
}

export async function getCampaignParticipantsByCampaignIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getCampaignParticipantsByCampaignIdHandler(request as any, reply);
}
