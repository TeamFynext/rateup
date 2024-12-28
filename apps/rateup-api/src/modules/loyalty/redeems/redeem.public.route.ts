import { FastifyInstance } from "fastify";
import { redeemPointsHandler, updateRedeemHandler } from "./redeem.controller";
import { $lRedeemRef } from "./redeem.schema";

export async function loyaltyRedeemPublicRoutes(server: FastifyInstance) {
  server.post(
    "/:customerId/:rewardId",
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
