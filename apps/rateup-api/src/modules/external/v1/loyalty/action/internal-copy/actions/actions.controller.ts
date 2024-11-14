import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyAction,
  deleteLoyaltyActionById,
  getLoyaltyActionById,
  getLoyaltyActions,
  updateLoyaltyActionById,
} from "./actions.service";
import {
  lActionIdParamInput,
  lActionUpdateInput,
  loyaltyActionInput,
} from "./actions.schema";
import { log } from "../../../../../../../utils/logger";

export async function createLoyaltyActionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await createLoyaltyAction(request.body, request.user.orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyActionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLoyaltyActions(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyActionByIdHandler(
  request: FastifyRequest<{
    Params: lActionIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await getLoyaltyActionById(request.params.actionId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateLoyaltyActionByIdHandler(
  request: FastifyRequest<{
    Params: lActionIdParamInput;
    Body: lActionUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateLoyaltyActionById(
      request.params.actionId,
      request.body,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteLoyaltyActionByIdHandler(
  request: FastifyRequest<{
    Params: lActionIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteLoyaltyActionById(request.params.actionId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
