import { FastifyInstance } from "fastify";
import {
  createLoyaltyProgramHandler,
  deleteLoyaltyProgramHandler,
  getLoyaltyProgramHandler,
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
      },
    },
    deleteLoyaltyProgramHandler,
  );
}
