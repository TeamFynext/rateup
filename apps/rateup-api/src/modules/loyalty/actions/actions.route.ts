import { FastifyInstance } from "fastify";
import {
  createLoyaltyActionHandler,
  deleteLoyaltyActionByIdHandler,
  getLoyaltyActionByIdHandler,
  getLoyaltyActionsHandler,
  updateLoyaltyActionByIdHandler,
  verifyLActionMaxCountRestriction,
} from "./actions.controller";
import { $lActionRef } from "./actions.schema";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";

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
}
