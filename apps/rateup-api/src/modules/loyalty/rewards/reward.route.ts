import { FastifyInstance } from "fastify";
import {
  createLoyaltyRewardHandler,
  deleteLoyaltyRewardHandler,
  getLoyaltyRewardByIdHandler,
  getLoyaltyRewardsHandler,
  updateLoyaltyRewardHandler,
} from "./reward.controller.js";
import {
  loyaltyRewardSchema,
  loyaltyRewardUpdateSchema,
  rewardIdParamSchema,
} from "./reward.schema.js";

export async function loyaltyRewardRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: loyaltyRewardSchema,
      },
    },
    createLoyaltyRewardHandler,
  );

  server.get("/", getLoyaltyRewardsHandler);

  server.get(
    "/:rewardId",
    {
      schema: {
        params: rewardIdParamSchema,
      },
    },
    getLoyaltyRewardByIdHandler,
  );

  server.put(
    "/:rewardId",
    {
      schema: {
        params: rewardIdParamSchema,
        body: loyaltyRewardUpdateSchema,
      },
    },
    updateLoyaltyRewardHandler,
  );

  server.delete(
    "/:rewardId",
    {
      schema: {
        params: rewardIdParamSchema,
      },
    },
    deleteLoyaltyRewardHandler,
  );
}
