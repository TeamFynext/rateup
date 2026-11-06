import { FastifyInstance } from "fastify";
import {
  createLoyaltyProgramHandler,
  deleteLoyaltyProgramHandler,
  getLoyaltyProgramHandler,
  resetProgramPointsHandler,
  updateLoyaltyProgramHandler,
} from "./program.controller.js";
import {
  loyaltyProgramSchema,
  loyaltyProgramResponseSchema,
  programIdParamSchema,
  loyaltyProgramUpdateSchema,
  deleteProgramQuerySchema,
  ProgramIdParam,
  DeleteProgramQuery,
} from "./program.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function loyaltyProgramRoutes(server: FastifyInstance) {
  declareAccess(server, { write: "loyalty.manage" });
  server.post(
    "/",
    {
      schema: {
        body: loyaltyProgramSchema,
        response: {
          201: loyaltyProgramResponseSchema,
        },
      },
    },
    createLoyaltyProgramHandler,
  );

  server.post(
    "/:programId/reset-points",
    {
      schema: {
        params: programIdParamSchema,
      },
    },
    resetProgramPointsHandler,
  );

  server.get("/", getLoyaltyProgramHandler);

  server.put(
    "/:programId",
    {
      schema: {
        params: programIdParamSchema,
        body: loyaltyProgramUpdateSchema,
      },
    },
    updateLoyaltyProgramHandler,
  );

  server.delete<{ Params: ProgramIdParam; Querystring: DeleteProgramQuery }>(
    "/:programId",
    {
      config: { permission: "loyalty.manage" },
      schema: {
        params: programIdParamSchema,
        querystring: deleteProgramQuerySchema,
      },
    },
    deleteLoyaltyProgramHandler,
  );
}
