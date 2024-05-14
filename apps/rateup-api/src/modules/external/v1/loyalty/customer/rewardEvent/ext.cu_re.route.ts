import { FastifyInstance } from "fastify/types/instance";
import { $extLCustomerRef } from "../ext.customer.schema";
import { getCustomerRewardEvents_byCustomerIdHandler } from "../../../../../loyalty/internal/customerRewardEvent/cu_re.controller";

export async function externalLoyaltyCustomerRewardEventRoutes(
  server: FastifyInstance,
) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all CustomerRewardEvents",
        tags: ["Loyalty/Customer -> RewardEvent"],
        params: $extLCustomerRef("bylCustomerIdParamSchema"),
      },
    },
    getCustomerRewardEvents_byCustomerIdHandler,
  );
}
