import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";

import {
  IdParamInput,
  LoyaltyTemplateInput,
  UpdateLoyaltyTemplateInput,
} from "./settings.schema.js";
import {
  createLoyaltyWaCommand,
  deleteLoyaltyWaCommandById,
  getAllLoyaltyWaCommands,
  getLoyaltyWaCommand,
  updateLoyaltyWaCommand,
} from "./settings.service.js";
import { getAutomatedRepliesByKeyWeords } from "../../whatsapp/automatedReply/wa_automatedReply.service.js";

export async function createLoyaltyTemplateHandler(
  request: FastifyRequest<{ Body: LoyaltyTemplateInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createLoyaltyWaCommand({ orgId, ...request.body });
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateLoyaltyTemplateHandler(
  request: FastifyRequest<{
    Body: UpdateLoyaltyTemplateInput;
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const res = await updateLoyaltyWaCommand(id, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyTemplateHandler(
  request: FastifyRequest<{ Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const res = await getLoyaltyWaCommand(id);
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
    const res = await getAllLoyaltyWaCommands(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function checkIfCommandExistInAutomation(
  request: FastifyRequest<{ Body: LoyaltyTemplateInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { requestMessage } = request.body;
    const res = await getAutomatedRepliesByKeyWeords(orgId, requestMessage);
    if (res)
      return reply
        .code(403)
        .send("The request message already used in automation");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteLoyaltyTemplateHandler(
  request: FastifyRequest<{ Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const res = await deleteLoyaltyWaCommandById(id);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
