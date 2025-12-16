import { FastifyRequest } from "fastify/types/request";
import {
  ByWaAutomatedReplyIdParams,
  CreateAutomatedReplySchema,
  InitiateAutomatedReplyBody,
} from "./wa_automatedReply.schema";
import { FastifyReply } from "fastify";
import {
  createAutomatedReply,
  deleteAutomatedReply,
  getAutomatedRepliesByOrgId,
  getAutomatedRepliesMessagId,
  getAutomatedReplyById,
  updateAutomatedReply,
  verifyAutomationTriggerLimit,
} from "./wa_automatedReply.service";
import { ByTeamIdParams } from "../../team/team.schema";
import { log } from "../../../utils/logger";
import { handleAutomatedReply } from "../whatsappSurvey/wasurvey.controller";
import connection from "../../../utils/redisConnection";

export async function getAutomatedRepliesMessagIdHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const automatedReplies = await getAutomatedRepliesMessagId(
    req.params.id,
    req.user.orgId,
  );
  reply.send(automatedReplies);
}

export async function getAllAutomatedRepliesByOrgIdHandler(
  req: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  const automatedReplies = await getAutomatedRepliesByOrgId(req.user.orgId);
  reply.send(automatedReplies);
}
export async function getAutomatedRepliesByIdHandler(
  req: FastifyRequest<{ Params: ByWaAutomatedReplyIdParams }>,
  reply: FastifyReply,
) {
  const automatedReply = await getAutomatedReplyById(
    req.params.waAutomatedReplyId,
  );
  reply.send(automatedReply);
}

export async function createAutomatedReplyHandler(
  req: FastifyRequest<{ Body: CreateAutomatedReplySchema }>,
  reply: FastifyReply,
) {
  try {
    const automatedReply = await createAutomatedReply(req.body, req.user.orgId);
    reply.code(201).send(automatedReply);
  } catch (error) {
    if (error.code === "P2002") {
      reply
        .code(409)
        .send("Some specified keywords already exist for this organization.");
    } else {
      log.error(error);
      reply
        .code(500)
        .send(error?.message || "error in creating automatedReply");
    }
  }
}

export async function updateAutomatedReplyHandler(
  req: FastifyRequest<{
    Params: ByWaAutomatedReplyIdParams;
    Body: CreateAutomatedReplySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    await updateAutomatedReply(
      req.params.waAutomatedReplyId,
      req.body,
      req.user.orgId,
    );
    reply.code(204).send();
  } catch (error) {
    if (error.code === "P2002") {
      reply
        .code(409)
        .send("Some specified keywords already exist for this organization.");
    } else {
      log.error(error);
      reply
        .code(500)
        .send(error?.message || "error in updating automatedReply");
    }
  }
}

export async function deleteAutomatedReplyHandler(
  req: FastifyRequest<{ Params: ByWaAutomatedReplyIdParams }>,
  reply: FastifyReply,
) {
  const automationId = req.params.waAutomatedReplyId;
  const automatedReply = await deleteAutomatedReply(automationId);
  const keys = await connection.keys(`round_robin_index:*:${automationId}:*`);
  if (keys.length) {
    await connection.del(...keys);
  }
  reply.send(automatedReply);
}

export async function initiateAutomatedReplyByIdHandler(
  req: FastifyRequest<{
    Params: ByWaAutomatedReplyIdParams;
    Body: InitiateAutomatedReplyBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { phone } = req.body;
    const automatedReply = await handleAutomatedReply(
      req.user.orgId,
      null,
      null,
      phone,
      null,
      req.params.waAutomatedReplyId,
    );
    reply.code(200).send(automatedReply);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function verifyAutomationTriggerLimitHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    if (!(await verifyAutomationTriggerLimit(orgId))) {
      return reply
        .code(403)
        .send("Automation Trigger is inactive or limit reached");
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
