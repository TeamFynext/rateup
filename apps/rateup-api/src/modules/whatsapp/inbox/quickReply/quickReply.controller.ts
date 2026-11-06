import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import { ByQuickReplyIdParam, QuickReplyBody, UpdateQuickReplyInput } from "./quickReply.schema.js";
import {
  createWaQuickReply,
  deleteWaQuickReplyById,
  getWaQuickReplies,
  getWaQuickReplyById,
  updateWaQuickReplyById,
} from "./quickReply.service.js";

export async function createWaQuickReplyHandler(
  request: FastifyRequest<{ Body: QuickReplyBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await createWaQuickReply(request.body, request.user.orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getWaQuickRepliesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await getWaQuickReplies(request.user.orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getWaQuickReplyByIdHandler(
  request: FastifyRequest<{ Params: ByQuickReplyIdParam }>,
  reply: FastifyReply,
) {
  try {
    const res = await getWaQuickReplyById(request.params.quickReplyId, request.user.orgId);
    if (!res) {
      return reply.code(404).send("Quick reply not found");
    }
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteWaQuickReplyByIdHandler(
  request: FastifyRequest<{ Params: ByQuickReplyIdParam }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteWaQuickReplyById(request.params.quickReplyId, request.user.orgId);
    reply.code(200).send(res);
  } catch (e) {
    if (e instanceof Error && e.message === "Quick reply not found") {
      return reply.code(404).send(e.message);
    }
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateWaQuickReplyByIdHandler(
  request: FastifyRequest<{
    Params: ByQuickReplyIdParam;
    Body: UpdateQuickReplyInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateWaQuickReplyById(
      request.params.quickReplyId,
      request.user.orgId,
      request.body,
    );
    reply.code(200).send(res);
  } catch (e) {
    if (e instanceof Error && e.message === "Quick reply not found") {
      return reply.code(404).send(e.message);
    }
    log.error(e);
    reply.code(500).send(e);
  }
}
