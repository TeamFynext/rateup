import { FastifyInstance } from "fastify";
import { checkSession } from "../../../../utils/checkSession";
import {
  createLCRewardHandler,
  deleteLCRewardHandler,
  getLCRewardByIdHandler,
  getLCRewardsHandler,
  updateLCRewardHandler,
} from "./reward.controller";

export async function loyaltyRewardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/", getLCRewardsHandler);
  server.get("/:rewardId", getLCRewardByIdHandler);
  server.post("/", createLCRewardHandler);
  server.put("/:rewardId", updateLCRewardHandler);
  server.delete("/:rewardId", deleteLCRewardHandler);
}
