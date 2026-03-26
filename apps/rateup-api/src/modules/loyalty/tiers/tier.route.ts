import { FastifyInstance } from "fastify";
import {
  createLoyaltyTierHandler,
  deleteLoyaltyTierHandler,
  getLoyaltyTierByIdHandler,
  getLoyaltyTiersHandler,
  updateLoyaltyTierHandler,
} from "./tier.controller.js";
import {
  loyaltyTierSchema,
  tierIdParamSchema,
  loyaltyTierUpdateSchema,
} from "./tier.schema.js";

export async function loyaltyTierRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: loyaltyTierSchema,
      },
    },
    createLoyaltyTierHandler,
  );

  server.get("/", getLoyaltyTiersHandler);

  server.get(
    "/:tierId",
    {
      schema: {
        params: tierIdParamSchema,
      },
    },
    getLoyaltyTierByIdHandler,
  );

  server.put(
    "/:tierId",
    {
      schema: {
        params: tierIdParamSchema,
        body: loyaltyTierUpdateSchema,
      },
    },
    updateLoyaltyTierHandler,
  );

  server.delete(
    "/:tierId",
    {
      schema: {
        params: tierIdParamSchema,
      },
    },
    deleteLoyaltyTierHandler,
  );
}
