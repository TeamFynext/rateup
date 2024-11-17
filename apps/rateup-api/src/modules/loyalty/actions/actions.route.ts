import { FastifyInstance } from "fastify";
import {
  createLoyaltyActionHandler,
  deleteLoyaltyActionByIdHandler,
  getLoyaltyActionByIdHandler,
  getLoyaltyActionsHandler,
  updateLoyaltyActionByIdHandler,
} from "./actions.controller";
import { $lActionRef } from "./actions.schema";

export async function loyaltyActionsRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
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
