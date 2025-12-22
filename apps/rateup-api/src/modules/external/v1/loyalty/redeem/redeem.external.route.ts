import { FastifyInstance } from "fastify";
import { $extLoyaltyRef } from "../loyalty.external.schema.js";
import { getLoyaltyRedeemsHandler } from "../../../../loyalty/redeems/redeem.controller.js";
import { $lRedeemRef } from "../../../../loyalty/redeems/redeem.schema.js";
import { redeemPointsHandler } from "./internal-copy/redeems/redeem.controller.js";

export async function externalLoyaltyRedeemRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        tags: ["Loyalty/Redeem"],
        description: "Get all loyalty redeems",
        summary: "Get all redeems",
        response: {
          200: {
            type: "array",
            items: $extLoyaltyRef("redeemResponseSchema"),
          },
        },
      },
    },
    getLoyaltyRedeemsHandler,
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Loyalty/Redeem"],
        description: "Redeem Points",
        summary: "Redeem customer point using phone number and reward id",
        querystring: $extLoyaltyRef("customerRedeemQuerySchema"),
      },
    },
    redeemPointsHandler,
  );
}
