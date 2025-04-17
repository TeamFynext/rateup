import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger";
import {
  ByQuickReplyIdParam,
  QuickReplyBody,
  UpdateOrderBody,
  UpdateQuickReplyInput,
} from "./quickReply.schema";
import {
  createWaQuickReply,
  deleteWaQuickReplyById,
  getWaQuickReplies,
  getWaQuickReplyById,
  QuickReply,
  updateWaQuickReplyById,
  updateWaQuickReplyOrder,
} from "./quickReply.service";

export async function createWaQuickReplyHandler(
  request: FastifyRequest<{ Body: QuickReplyBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await createWaQuickReply(
      request.body as QuickReply,
      request.user.orgId,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getWaQuickRepliesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
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
    const res = await getWaQuickReplyById(request.params.quickReplyId);
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
    const res = await deleteWaQuickReplyById(request.params.quickReplyId);
    reply.code(200).send(res);
  } catch (e) {
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
      request.body,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateWaQuickReplyOrderHandler(
  request: FastifyRequest<{
    Body: UpdateOrderBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateWaQuickReplyOrder(request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
