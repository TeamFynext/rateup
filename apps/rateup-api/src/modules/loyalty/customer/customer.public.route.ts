import { FastifyInstance } from "fastify";
import { $lCustomerRef } from "./customer.schema.js";
import {
  createLCustomerHandler,
  customerActionHandler,
  verifyLCustomerMaxCountRestrictionHandler,
} from "./customer.controller.js";
import { getVerifySubscriptionForPublicHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

export async function loyaltyCustomerPublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      preHandler: [
        getVerifySubscriptionForPublicHandler([
          SubscriptionFeaturePathName.LoyaltyCustomer,
        ]),
        verifyLCustomerMaxCountRestrictionHandler,
      ],
      schema: {
        body: $lCustomerRef("LCustomerSchema"),
      },
    },
    createLCustomerHandler,
  );
}
