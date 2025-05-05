import { FastifyInstance } from "fastify";
import { $extLoyaltyRef } from "../loyalty.external.schema";
import {
  createLoyaltyActionHandler,
  deleteLoyaltyActionByIdHandler,
  getLoyaltyActionByIdHandler,
  getLoyaltyActionsHandler,
  referActionHandler,
  updateLoyaltyActionByIdHandler,
} from "../../../../loyalty/actions/actions.controller";
import { $lActionRef } from "../../../../loyalty/actions/actions.schema";
import { actionWebhookHandler } from "./internal-copy/actions/actions.controller";

export async function externalLoyaltyActionRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        tags: ["Loyalty/Action"],
        description: "Get all loyalty actions",
        summary: "Get all actions",
        response: {
          200: {
            type: "array",
            items: $extLoyaltyRef("lActionSchemaResponseSchema"),
          },
        },
      },
    },
    getLoyaltyActionsHandler,
  );

  server.get(
    "/:actionId",
    {
      schema: {
        tags: ["Loyalty/Action"],
        description: "Get loyalty action by id",
        summary: "Get action by id",
        params: $lActionRef("byLActiondIdParamSchema"),
        response: {
          200: $extLoyaltyRef("lActionSchemaResponseSchema"),
        },
      },
    },
    getLoyaltyActionByIdHandler,
  );

  server.post(
    "/:referralCode",
    {
      schema: {
        tags: ["Loyalty/Action"],
        description: "Apply Referral Action",
        summary: "Referral action for friends using  referral code",
        params: $lActionRef("byReferralCodeParamsSchema"),
        body: $lActionRef("referSchema"),
      },
    },
    referActionHandler,
  );

  server.post("/webhook", actionWebhookHandler);
}
