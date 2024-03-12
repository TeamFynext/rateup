import { FastifyRequest, FastifyReply } from "fastify";
import {
  createLCReward,
  deleteLCReward,
  getLCRewardById,
  getLCRewards,
  updateLCReward,
} from "./reward.service";
import {
  ByRewardIdParams,
  CreateRewardInput,
  UpdateRewardInput,
} from "./reward.schema";

export async function createLCRewardHandler(
  req: FastifyRequest<{
    Body: CreateRewardInput;
  }>,
  res: FastifyReply,
) {
  const reward = await createLCReward({ ...req.body, orgId: req.user.orgId });
  res.send(reward);
}

export async function getLCRewardsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const rewards = await getLCRewards(req.user.orgId);
  res.send(rewards);
}

export async function getLCRewardByIdHandler(
  req: FastifyRequest<{ Params: ByRewardIdParams }>,
  res: FastifyReply,
) {
  const reward = await getLCRewardById(req.params.rewardId);
  res.send(reward);
}

export async function updateLCRewardHandler(
  req: FastifyRequest<{ Params: ByRewardIdParams; Body: UpdateRewardInput }>,
  res: FastifyReply,
) {
  const reward = await updateLCReward(req.params.rewardId, req.body);
  res.send(reward);
}

export async function deleteLCRewardHandler(
  req: FastifyRequest<{ Params: ByRewardIdParams }>,
  res: FastifyReply,
) {
  const reward = await deleteLCReward(req.params.rewardId);
}
