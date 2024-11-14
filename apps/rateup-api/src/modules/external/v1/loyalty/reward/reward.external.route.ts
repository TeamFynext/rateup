import { FastifyInstance } from "fastify";
import {
  createLoyaltyRewardHandler,
  getLoyaltyRewardsHandler,
  getLoyaltyRewardByIdHandler,
  updateLoyaltyRewardByIdHandler,
  deleteLoyaltyRewardByIdHandler,
} from "./internal-copy/rewards/rewards.controller";
import { $lRewardRef } from "./internal-copy/rewards/rewards.schema";
import { $extLoyaltyRef } from "../loyalty.external.schema";

export async function externalLoyaltyRewardRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        tags: ["Loyalty/Reward"],
        description: "Create a new loyalty reward",
        summary: "Create a new reward",
        body: $lRewardRef("lRewardSchema"),
      },
    },
    createLoyaltyRewardHandler,
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Loyalty/Reward"],
        description: "Get all loyalty rewards",
        summary: "Get all rewards",
        response: {
          200: {
            type: "array",
            items: $extLoyaltyRef("lRewardResponseSchema"),
          },
        },
      },
    },
    getLoyaltyRewardsHandler,
  );

  server.get(
    "/:rewardId",
    {
      schema: {
        tags: ["Loyalty/Reward"],
        description: "Get loyalty action by id",
        summary: "Get action by id",
        params: $lRewardRef("byLRewardIdParamSchema"),
        response: {
          200: $extLoyaltyRef("lRewardResponseSchema"),
        },
      },
    },
    getLoyaltyRewardByIdHandler,
  );

  server.put(
    "/:rewardId",
    {
      schema: {
        tags: ["Loyalty/Reward"],
        description: "Update loyalty reward by id",
        summary: "Update reward by id",
        params: $lRewardRef("byLRewardIdParamSchema"),
        body: $lRewardRef("lRewardUpdateSchema"),
        response: {
          200: $extLoyaltyRef("lRewardResponseSchema"),
        },
      },
    },
    updateLoyaltyRewardByIdHandler,
  );

  server.delete(
    "/:rewardId",
    {
      schema: {
        tags: ["Loyalty/Reward"],
        description: "Delete loyalty reward by id",
        summary: "Delete reward by id",
        params: $lRewardRef("byLRewardIdParamSchema"),
        response: {
          200: $extLoyaltyRef("lRewardResponseSchema"),
        },
      },
    },
    deleteLoyaltyRewardByIdHandler,
  );
}
