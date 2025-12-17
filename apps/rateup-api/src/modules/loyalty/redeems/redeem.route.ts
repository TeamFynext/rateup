import { FastifyInstance } from "fastify";
import {
  getLoyaltyRedeemsHandler,
  redeemPointsHandler,
  updateRedeemHandler,
} from "./redeem.controller.js";
import { $lRedeemRef } from "./redeem.schema.js";

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
