import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import {
  createLoyaltyTemplate,
  getAllLoyaltyTemplates,
  getLoyaltyTemplate,
  updateLoyaltyTemplate,
} from "./settings.service";
import {
  ByTypeQueryInput,
  LoyaltyTemplateInput,
  UpdateLoyaltyTemplateInput,
} from "./settings.schema";

export async function createLoyaltyTemplateHandler(
  request: FastifyRequest<{ Body: LoyaltyTemplateInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createLoyaltyTemplate({ orgId, ...request.body });
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateLoyaltyTemplateHandler(
  request: FastifyRequest<{
    Body: UpdateLoyaltyTemplateInput;
    Querystring: ByTypeQueryInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { type } = request.query;
    const res = await updateLoyaltyTemplate(type, orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyTemplateHandler(
  request: FastifyRequest<{ Querystring: ByTypeQueryInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { type } = request.query;
    const res = await getLoyaltyTemplate(type, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getAllLoyaltyTemplateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getAllLoyaltyTemplates(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
