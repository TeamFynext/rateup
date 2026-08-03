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
import { checkRoleHandler } from "../../../utils/checkRoleHandler.js";

export async function loyaltyProgramRoutes(server: FastifyInstance) {
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
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        params: programIdParamSchema,
        querystring: deleteProgramQuerySchema,
      },
    },
    deleteLoyaltyProgramHandler,
  );
}
