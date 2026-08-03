import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";

import {
  IdParamInput,
  LoyaltyTemplateInput,
  UpdateLoyaltyTemplateInput,
  EventTriggerInput,
  UpdateEventTriggerInput,
  ProgramIdQueryInput,
} from "./settings.schema.js";
import {
  createLoyaltyWaCommand,
  deleteLoyaltyWaCommandById,
  getAllLoyaltyWaCommands,
  getLoyaltyWaCommand,
  updateLoyaltyWaCommand,
  createEventTrigger,
  updateEventTrigger,
  getEventTrigger,
  getAllEventTriggers,
  deleteEventTrigger,
} from "./settings.service.js";
import { getAutomatedRepliesByKeyWeords } from "../../whatsapp/automatedReply/wa_automatedReply.service.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

async function requireProgramId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const program = await getLoyaltyProgramByOrg(request.user.orgId);
  if (!program) {
    reply.code(404).send({ error: "Loyalty program not found" });
    return null;
  }
  return program.id;
}

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
    const res = await updateLoyaltyWaCommand(id, request.body, request.user.orgId);
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
    const res = await getLoyaltyWaCommand(id, request.user.orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getAllLoyaltyTemplateHandler(request: FastifyRequest, reply: FastifyReply) {
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
    if (res) return reply.code(403).send("The request message already used in automation");
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
    const res = await deleteLoyaltyWaCommandById(id, request.user.orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

// Event Trigger Handlers
export async function createEventTriggerHandler(
  request: FastifyRequest<{ Body: EventTriggerInput }>,
  reply: FastifyReply,
) {
  try {
    const programId = await requireProgramId(request, reply);
    if (!programId) return;
    const res = await createEventTrigger(request.body, programId);
    reply.code(201).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateEventTriggerHandler(
  request: FastifyRequest<{
    Body: UpdateEventTriggerInput;
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const programId = await requireProgramId(request, reply);
    if (!programId) return;
    const { id } = request.params;
    const res = await updateEventTrigger(id, request.body, programId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getEventTriggerHandler(
  request: FastifyRequest<{ Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const programId = await requireProgramId(request, reply);
    if (!programId) return;
    const { id } = request.params;
    const res = await getEventTrigger(id, programId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getAllEventTriggersHandler(
  request: FastifyRequest<{ Querystring: ProgramIdQueryInput }>,
  reply: FastifyReply,
) {
  try {
    const programId = await requireProgramId(request, reply);
    if (!programId) return;
    const res = await getAllEventTriggers(programId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteEventTriggerHandler(
  request: FastifyRequest<{ Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const programId = await requireProgramId(request, reply);
    if (!programId) return;
    const { id } = request.params;
    const res = await deleteEventTrigger(id, programId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
