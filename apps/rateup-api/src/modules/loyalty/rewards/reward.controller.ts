import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyReward,
  deleteLoyaltyReward,
  getActiveLoyaltyRewards,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  updateLoyaltyReward,
} from "./reward.service.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyRewardInput, LoyaltyRewardUpdateInput, RewardIdParam } from "./reward.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

export async function createLoyaltyRewardHandler(
  request: FastifyRequest<{ Body: LoyaltyRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await createLoyaltyReward(request.body, program.id);
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyRewardsHandler(
  request: FastifyRequest<{ Querystring: { active?: string } }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      // if no program, return empty array to avoid 404s on frontend which expects an array in (all data get case)
      return reply.code(200).send([]);
    }

    const result =
      request.query.active === "true"
        ? await getActiveLoyaltyRewards(program.id)
        : await getLoyaltyRewards(program.id);

    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyRewardByIdHandler(
  request: FastifyRequest<{ Params: RewardIdParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await getLoyaltyRewardById(request.params.rewardId);
    if (!result) {
      return reply.code(404).send({ error: "Reward not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function updateLoyaltyRewardHandler(
  request: FastifyRequest<{
    Params: RewardIdParam;
    Body: LoyaltyRewardUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await updateLoyaltyReward(request.params.rewardId, request.body);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function deleteLoyaltyRewardHandler(
  request: FastifyRequest<{ Params: RewardIdParam }>,
  reply: FastifyReply,
) {
  try {
    await deleteLoyaltyReward(request.params.rewardId);
    reply.code(204).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
