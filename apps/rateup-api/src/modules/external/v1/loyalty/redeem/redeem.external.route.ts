import { FastifyInstance } from "fastify";
import { getLoyaltyRedeemsHandler } from "./internal-copy/redeems/redeem.controller";
import { $lRedeemRef } from "./internal-copy/redeems/redeem.schema";
import { $extLoyaltyRef } from "../loyalty.external.schema";

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
}
