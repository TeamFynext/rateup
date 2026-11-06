import type { FastifyReply, FastifyRequest } from "fastify";

import type { PaginationQuery } from "../pagination.js";
import * as svc from "./campaigns.service.js";
import type {
  CampaignIdParams,
  CampaignListQuery,
  CreateCampaignBody,
  SendCampaignBody,
} from "./campaigns.schema.js";

/**
 * Thin on purpose: the work is in campaigns.service.ts, failures are thrown as
 * ExternalApiError and shaped by the partner API error handler.
 */

export async function listCampaignsHandler(
  request: FastifyRequest<{ Querystring: CampaignListQuery }>,
) {
  return svc.listCampaigns(request.user.orgId, request.query);
}

export async function getCampaignHandler(request: FastifyRequest<{ Params: CampaignIdParams }>) {
  return svc.getCampaignDetail(request.user.orgId, request.params.campaignId);
}

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignBody }>,
  reply: FastifyReply,
) {
  const campaign = await svc.createCampaignForOrg(request.user.orgId, request.actor!, request.body);
  return reply.code(201).send(campaign);
}

export async function deleteCampaignHandler(request: FastifyRequest<{ Params: CampaignIdParams }>) {
  return svc.deleteCampaignForOrg(request.user.orgId, request.params.campaignId);
}

export async function sendCampaignHandler(
  request: FastifyRequest<{ Params: CampaignIdParams; Body: SendCampaignBody }>,
  reply: FastifyReply,
) {
  const result = await svc.sendCampaignForOrg(
    request.user.orgId,
    request.params.campaignId,
    request.body,
  );
  return reply.code(202).send(result);
}

export async function listCampaignResponsesHandler(
  request: FastifyRequest<{ Params: CampaignIdParams; Querystring: PaginationQuery }>,
) {
  return svc.listCampaignResponses(request.user.orgId, request.params.campaignId, request.query);
}
