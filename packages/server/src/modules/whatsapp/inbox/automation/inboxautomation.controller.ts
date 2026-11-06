import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import {
  enableInboxAutomation,
  getInboxAutomation,
  updateInboxAutomation,
  deleteInboxAutomation,
} from "./inboxautomation.service.js";
import {
  UpdateInboxAutomationInput,
  GetInboxAutomationQuery,
  DeleteInboxAutomationQuery,
  EnableInboxAutomationInput,
} from "./inboxautomation.schema.js";

export async function enableInboxAutomationHandler(
  request: FastifyRequest<{ Body: EnableInboxAutomationInput }>,
  reply: FastifyReply,
) {
  try {
    const { condition } = request.body;
    const res = await enableInboxAutomation(request.user.orgId, condition);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getInboxAutomationHandler(
  request: FastifyRequest<{ Querystring: GetInboxAutomationQuery }>,
  reply: FastifyReply,
) {
  try {
    const res = await getInboxAutomation(request.user.orgId, request.query.condition);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateInboxAutomationHandler(
  request: FastifyRequest<{ Body: UpdateInboxAutomationInput }>,
  reply: FastifyReply,
) {
  try {
    const { condition, ...rest } = request.body;
    console.log(request.body);
    const res = await updateInboxAutomation(request.user.orgId, condition, rest);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteInboxAutomationHandler(
  request: FastifyRequest<{ Querystring: DeleteInboxAutomationQuery }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteInboxAutomation(request.user.orgId, request.query.condition);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
