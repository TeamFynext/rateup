import { FastifyInstance } from "fastify";
import { $lActionRef } from "./internal-copy/actions/actions.schema";
import {
  createLoyaltyActionHandler,
  deleteLoyaltyActionByIdHandler,
  getLoyaltyActionByIdHandler,
  getLoyaltyActionsHandler,
  updateLoyaltyActionByIdHandler,
} from "./internal-copy/actions/actions.controller";
import { $extLoyaltyRef } from "../loyalty.external.schema";

export async function externalLoyaltyActionRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        tags: ["Loyalty/Action"],
        description: "Create a new action",
        summary: "Create a new loyalty action",
        body: $lActionRef("lActionSchema"),
      },
    },
    createLoyaltyActionHandler,
  );

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

  server.put(
    "/:actionId",
    {
      schema: {
        tags: ["Loyalty/Action"],
        description: "Update a loyalty action by id",
        summary: "Update a action by id",
        params: $lActionRef("byLActiondIdParamSchema"),
        body: $lActionRef("lActionUpdateSchema"),
        response: {
          200: $extLoyaltyRef("lActionSchemaResponseSchema"),
        },
      },
    },
    updateLoyaltyActionByIdHandler,
  );

  server.delete(
    "/:actionId",
    {
      schema: {
        tags: ["Loyalty/Action"],
        description: "Delete a loyalty action by id",
        summary: "Delete a action by id",
        params: $lActionRef("byLActiondIdParamSchema"),
        response: {
          200: $extLoyaltyRef("lActionSchemaResponseSchema"),
        },
      },
    },
    deleteLoyaltyActionByIdHandler,
  );
}
