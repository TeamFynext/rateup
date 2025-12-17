import { FastifyInstance } from "fastify";
import {
  bulkCustomerActionHandler,
  createLoyaltyActionHandler,
  deleteLoyaltyActionByIdHandler,
  getLoyaltyActionByIdHandler,
  getLoyaltyActionsHandler,
  referActionHandler,
  updateLoyaltyActionByIdHandler,
  verifyLActionMaxCountRestriction,
} from "./actions.controller.js";
import { $lActionRef } from "./actions.schema.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { $lCustomerRef } from "../customer/customer.schema.js";

export async function loyaltyActionsRoutes(server: FastifyInstance) {
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.LoyaltyAction]),
  );
  server.post(
    "/",
    {
      preHandler: [verifyLActionMaxCountRestriction],
      schema: {
        body: $lActionRef("lActionSchema"),
      },
    },
    createLoyaltyActionHandler,
  );

  server.get("/", getLoyaltyActionsHandler);

  server.get(
    "/:actionId",
    {
      schema: {
        params: $lActionRef("byLActiondIdParamSchema"),
      },
    },
    getLoyaltyActionByIdHandler,
  );

  server.put(
    "/:actionId",
    {
      schema: {
        params: $lActionRef("byLActiondIdParamSchema"),
        body: $lActionRef("lActionUpdateSchema"),
      },
    },
    updateLoyaltyActionByIdHandler,
  );

  server.delete(
    "/:actionId",
    {
      schema: {
        params: $lActionRef("byLActiondIdParamSchema"),
      },
    },
    deleteLoyaltyActionByIdHandler,
  );

  server.post(
    "/:referralCode",
    {
      schema: {
        params: $lActionRef("byReferralCodeParamsSchema"),
        body: $lActionRef("referSchema"),
      },
    },
    referActionHandler,
  );

  server.post(
    "/bulk",
    {
      schema: {
        body: $lActionRef("bulkActionSchema"),
      },
    },
    bulkCustomerActionHandler,
  );
}
