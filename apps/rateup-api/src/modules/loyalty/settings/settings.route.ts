import { FastifyInstance } from "fastify";
import {
  createLoyaltyTemplateHandler,
  getLoyaltyTemplateHandler,
  updateLoyaltyTemplateHandler,
} from "./settings.controller";
import { $lsRef } from "./settings.schema";

export async function LoyaltySettingsRoutes(server: FastifyInstance) {
  server.post(
    "/template",
    {
      schema: {
        body: $lsRef("loyaltyTemplateSchema"),
      },
    },
    createLoyaltyTemplateHandler,
  );

  server.put(
    "/template",
    {
      schema: {
        querystring: $lsRef("byTypeQuerySchema"),
        body: $lsRef("updateLoyaltyTemplateSchema"),
      },
    },
    updateLoyaltyTemplateHandler,
  );

  server.get(
    "/template",
    {
      schema: {
        querystring: $lsRef("byTypeQuerySchema"),
      },
    },
    getLoyaltyTemplateHandler,
  );
}
