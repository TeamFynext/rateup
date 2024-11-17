import { FastifyInstance } from "fastify";
import {
  createLoyaltyRewardHandler,
  getLoyaltyRewardsHandler,
  getLoyaltyRewardByIdHandler,
  updateLoyaltyRewardByIdHandler,
  deleteLoyaltyRewardByIdHandler,
} from "./rewards.controller";
import { $lRewardRef } from "./rewards.schema";

export async function loyaltyRewardsRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $lRewardRef("lRewardSchema"),
      },
    },
    createLoyaltyRewardHandler,
  );
  server.get("/", getLoyaltyRewardsHandler);
  server.get(
    "/:rewardId",
    {
      schema: {
        params: $lRewardRef("byLRewardIdParamSchema"),
      },
    },
    getLoyaltyRewardByIdHandler,
  );
  server.put(
    "/:rewardId",
    {
      schema: {
        params: $lRewardRef("byLRewardIdParamSchema"),
        body: $lRewardRef("lRewardUpdateSchema"),
      },
    },
    updateLoyaltyRewardByIdHandler,
  );

  server.delete(
    "/:rewardId",
    {
      schema: {
        params: $lRewardRef("byLRewardIdParamSchema"),
      },
    },
    deleteLoyaltyRewardByIdHandler,
  );
}
