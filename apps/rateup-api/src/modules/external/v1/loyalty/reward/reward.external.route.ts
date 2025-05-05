import { FastifyInstance } from "fastify";
import { $extLoyaltyRef } from "../loyalty.external.schema";
import { $lRewardRef } from "../../../../loyalty/rewards/rewards.schema";
import {
  getLoyaltyRewardByIdHandler,
  getLoyaltyRewardsHandler,
  updateLoyaltyRewardByIdHandler,
} from "../../../../loyalty/rewards/rewards.controller";
import { redeemRewardWebhookHandler } from "../redeem/internal-copy/redeems/redeem.controller";

export async function externalLoyaltyRewardRoutes(server: FastifyInstance) {
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

  server.post("/webhook", redeemRewardWebhookHandler);
}
