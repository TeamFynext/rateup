import { FastifyInstance } from "fastify/types/instance";

import { $extLRewardRef } from "./ext.reward.schema";
import {
  getLCRewardsHandler,
  getLCRewardByIdHandler,
  createLCRewardHandler,
  deleteLCRewardHandler,
} from "../../../../loyalty/internal/reward/reward.controller";

export async function externalLoyaltyRewardRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all Campaign-Reward rules",
        summary: "Get all Campaign-Reward rules",
        tags: ["Loyalty/Campaign Reward"],
        response: {
          "2xx": {
            type: "array",
            items: $extLRewardRef("LCRewardSchema"),
          },
        },
      },
    },
    getLCRewardsHandler,
  );

  server.get(
    "/:rewardId",
    {
      schema: {
        description: "Get a Campaign-Reward rule by id",
        summary: "Get a Campaign-Reward rule by id",
        tags: ["Loyalty/Campaign Reward"],
        // TODO: check why zod schema is not working
        params: {
          type: "object",
          properties: {
            rewardId: { type: "string" },
          },
        },
        response: {
          "2xx": $extLRewardRef("LCRewardSchema"),
        },
      },
    },
    getLCRewardByIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        description: "Create a Campaign-Reward rule",
        summary: "Create a Campaign-Reward rule",
        tags: ["Loyalty/Campaign Reward"],
        body: $extLRewardRef("createLCRewardSchema"),
        response: {
          "2xx": $extLRewardRef("LCRewardSchema"),
        },
      },
    },
    createLCRewardHandler,
  );
  server.delete(
    "/:rewardId",
    {
      schema: {
        description: "Delete a Campaign-Reward rule",
        summary: "Delete a Campaign-Reward rule",
        tags: ["Loyalty/Campaign Reward"],
        params: {
          type: "object",
          properties: {
            rewardId: { type: "string" },
          },
        },
      },
    },
    deleteLCRewardHandler,
  );
}
