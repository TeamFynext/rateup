import { FastifyInstance } from "fastify";
import {
  getLoyaltyRedeemsHandler,
  redeemPointsHandler,
  updateRedeemHandler,
} from "./redeem.controller";
import { $lRedeemRef } from "./redeem.schema";

export async function loyaltyRedeemRoutes(server: FastifyInstance) {
  server.get("/", getLoyaltyRedeemsHandler);
  server.post(
    "/:phone/:rewardId",
    {
      schema: {
        params: $lRedeemRef("rewardCustomerParamSchema"),
      },
    },
    redeemPointsHandler,
  );
  server.put(
    "/:redeemId",
    {
      schema: {
        params: $lRedeemRef("redeemIdParamSchema"),
      },
    },
    updateRedeemHandler,
  );
}
