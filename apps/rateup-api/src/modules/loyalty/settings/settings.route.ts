import { FastifyInstance } from "fastify";
import {
  checkIfCommandExistInAutomation,
  createLoyaltyTemplateHandler,
  deleteLoyaltyTemplateHandler,
  getAllLoyaltyTemplateHandler,
  getLoyaltyTemplateHandler,
  updateLoyaltyTemplateHandler,
} from "./settings.controller.js";
import { $lsRef } from "./settings.schema.js";

export async function LoyaltySettingsRoutes(server: FastifyInstance) {
  server.post(
    "/template",
    {
      preHandler: [checkIfCommandExistInAutomation],
      schema: {
        body: $lsRef("loyaltyTemplateSchema"),
      },
    },
    createLoyaltyTemplateHandler,
  );

  server.put(
    "/template/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
        body: $lsRef("updateLoyaltyTemplateSchema"),
      },
    },
    updateLoyaltyTemplateHandler,
  );

  server.delete(
    "/template/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
      },
    },
    deleteLoyaltyTemplateHandler,
  );

  server.get(
    "/template/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
      },
    },
    getLoyaltyTemplateHandler,
  );

  server.get("/template/all", getAllLoyaltyTemplateHandler);
}
