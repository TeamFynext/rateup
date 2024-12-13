import { FastifyInstance } from "fastify";
import { $lCustomerRef } from "./customer.schema";
import {
  createLCustomerHandler,
  customerActionHandler,
  verifyLCustomerMaxCountRestrictionHandler,
} from "./customer.controller";
import { getVerifySubscriptionForPublicHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";

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

  server.post(
    "/:customerId/:actionId",
    {
      schema: {
        params: $lCustomerRef("actionCustomerIdParamSchema"),
      },
    },
    customerActionHandler,
  );
}
