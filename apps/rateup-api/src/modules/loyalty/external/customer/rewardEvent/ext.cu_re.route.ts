import { FastifyInstance } from "fastify/types/instance";
import { getCustomerRewardEvents_byCustomerIdHandler } from "../../../internal/customerRewardEvent/cu_re.controller";
import { $extLCustomerRef } from "../ext.customer.schema";

export async function externalLoyaltyCustomerRewardEventRoutes(
  server: FastifyInstance,
) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all CustomerRewardEvents",
        tags: ["Loyalty Customer -> RewardEvent"],
        params: $extLCustomerRef("bylCustomerIdParamSchema"),
      },
    },
    getCustomerRewardEvents_byCustomerIdHandler,
  );
}
