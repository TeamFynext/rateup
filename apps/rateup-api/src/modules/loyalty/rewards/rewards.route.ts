import { FastifyInstance } from "fastify";
import {
  createLoyaltyRewardHandler,
  getLoyaltyRewardsHandler,
  getLoyaltyRewardByIdHandler,
  updateLoyaltyRewardByIdHandler,
  deleteLoyaltyRewardByIdHandler,
  verifyLRewardctionMaxCountRestriction,
} from "./rewards.controller";
import { $lRewardRef } from "./rewards.schema";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";

export async function loyaltyRewardsRoutes(server: FastifyInstance) {
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.LoyaltyReward]),
  );
  server.post(
    "/",
    {
      preHandler: [verifyLRewardctionMaxCountRestriction],
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
