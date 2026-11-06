import { FastifyInstance } from "fastify";
import {
  createStageHandler,
  deleteStageHandler,
  reorderStagesHandler,
  updateStageHandler,
} from "./stage.controller.js";
import {
  createStageRequestSchema,
  deleteStageQuerySchema,
  idParamsSchema,
  reorderStagesRequestSchema,
  updateStageRequestSchema,
} from "./stage.schema.js";
import { verifyStageAccess, verifyStagesReorderAccess } from "./stage.auth.js";
import { verifyPipelineAccessFromBody } from "../pipeline.auth.js";

export async function stageRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      preHandler: [verifyPipelineAccessFromBody],
      schema: { body: createStageRequestSchema },
    },
    createStageHandler,
  );

  // Registered before `/:id` so "reorder" is not read as a stage id.
  server.put(
    "/reorder",
    {
      preHandler: [verifyStagesReorderAccess],
      schema: { body: reorderStagesRequestSchema },
    },
    reorderStagesHandler,
  );

  server.put(
    "/:id",
    {
      preHandler: [verifyStageAccess],
      schema: { params: idParamsSchema, body: updateStageRequestSchema },
    },
    updateStageHandler,
  );

  server.delete(
    "/:id",
    {
      preHandler: [verifyStageAccess],
      schema: { params: idParamsSchema, querystring: deleteStageQuerySchema },
    },
    deleteStageHandler,
  );
}
