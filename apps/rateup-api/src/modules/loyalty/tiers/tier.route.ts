import { FastifyInstance } from "fastify";
import {
  createLoyaltyTierHandler,
  deleteLoyaltyTierHandler,
  getLoyaltyTierByIdHandler,
  getLoyaltyTiersHandler,
  updateLoyaltyTierHandler,
} from "./tier.controller.js";
import { $tierRef } from "./tier.schema.js";

export async function loyaltyTierRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $tierRef("loyaltyTierSchema"),
      },
    },
    createLoyaltyTierHandler,
  );

  server.get("/", getLoyaltyTiersHandler);

  server.get(
    "/:tierId",
    {
      schema: {
        params: $tierRef("tierIdParamSchema"),
      },
    },
    getLoyaltyTierByIdHandler,
  );

  server.put(
    "/:tierId",
    {
      schema: {
        params: $tierRef("tierIdParamSchema"),
        body: $tierRef("loyaltyTierUpdateSchema"),
      },
    },
    updateLoyaltyTierHandler,
  );

  server.delete(
    "/:tierId",
    {
      schema: {
        params: $tierRef("tierIdParamSchema"),
      },
    },
    deleteLoyaltyTierHandler,
  );
}
