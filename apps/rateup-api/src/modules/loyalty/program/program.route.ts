import { FastifyInstance } from "fastify";
import {
  createLoyaltyProgramHandler,
  deleteLoyaltyProgramHandler,
  getLoyaltyProgramHandler,
  resetProgramPointsHandler,
  updateLoyaltyProgramHandler,
} from "./program.controller.js";
import { $programRef } from "./program.schema.js";

export async function loyaltyProgramRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $programRef("loyaltyProgramSchema"),
        response: {
          201: $programRef("loyaltyProgramResponseSchema"),
        },
      },
    },
    createLoyaltyProgramHandler,
  );

  server.post(
    "/:programId/reset-points",
    {
      schema: {
        params: $programRef("programIdParamSchema"),
      },
    },
    resetProgramPointsHandler,
  );

  server.get("/", getLoyaltyProgramHandler);

  server.put(
    "/:programId",
    {
      schema: {
        params: $programRef("programIdParamSchema"),
        body: $programRef("loyaltyProgramUpdateSchema"),
      },
    },
    updateLoyaltyProgramHandler,
  );

  server.delete(
    "/:programId",
    {
      schema: {
        params: $programRef("programIdParamSchema"),
        querystring: $programRef("deleteProgramQuerySchema"),
      },
    },
    deleteLoyaltyProgramHandler,
  );
}
