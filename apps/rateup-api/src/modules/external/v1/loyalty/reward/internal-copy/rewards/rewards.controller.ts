import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyReward,
  deleteLoyaltyRewardById,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  updateLoyaltyRewardById,
} from "./rewards.service";
import { lRewardIdParamInput, lRewardIdUpdateInput } from "./rewards.schema";
import { loyaltyActionInput } from "../../../action/internal-copy/actions/actions.schema";
import { log } from "../../../../../../../utils/logger";

export async function createLoyaltyRewardHandler(
  request: FastifyRequest<{ Body: loyaltyActionInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createLoyaltyReward(request.body, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyRewardsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLoyaltyRewards(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyRewardByIdHandler(
  request: FastifyRequest<{
    Params: lRewardIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await getLoyaltyRewardById(request.params.rewardId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateLoyaltyRewardByIdHandler(
  request: FastifyRequest<{
    Params: lRewardIdParamInput;
    Body: lRewardIdUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateLoyaltyRewardById(
      request.body,
      request.params.rewardId,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteLoyaltyRewardByIdHandler(
  request: FastifyRequest<{
    Params: lRewardIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteLoyaltyRewardById(request.params.rewardId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
