import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { requireFeature, TeamFeature } from "../../utils/permissions.js";
import {
  createLabelHandler,
  createLostReasonHandler,
  createPipelineHandler,
  deleteLabelHandler,
  deleteLostReasonHandler,
  deletePipelineHandler,
  getPipelineHandler,
  getPipelineMembersHandler,
  getPipelineStatsHandler,
  getPipelineForecastHandler,
  getTeamPipelineDefaultsHandler,
  updateTeamPipelineDefaultHandler,
  getPipelinesHandler,
  updateLabelHandler,
  updateLostReasonHandler,
  updatePipelineHandler,
} from "./pipeline.controller.js";
import {
  createLabelRequestSchema,
  createLostReasonRequestSchema,
  createPipelineRequestSchema,
  idParamsSchema,
  updateLabelRequestSchema,
  updateLostReasonRequestSchema,
  updatePipelineRequestSchema,
  updateTeamDefaultRequestSchema,
  teamIdParamSchema,
} from "./pipeline.schema.js";
import {
  verifyLabelAccess,
  verifyLostReasonAccess,
  verifyOwnerForDelete,
  verifyOwnerForTeamChange,
  verifyPipelineAccess,
} from "./pipeline.auth.js";
import { stageRoutes } from "./pipelineStage/stage.route.js";
import { leadRoutes } from "./pipelineLead/lead.route.js";

export async function pipelineRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", requireFeature(TeamFeature.pipeline));

  server.register(stageRoutes, { prefix: "stages" });
  server.register(leadRoutes, { prefix: "leads" });

  server.get("/", getPipelinesHandler);

  server.post("/", { schema: { body: createPipelineRequestSchema } }, createPipelineHandler);

  server.put(
    "/lost-reasons/:id",
    {
      preHandler: [verifyLostReasonAccess],
      schema: { params: idParamsSchema, body: updateLostReasonRequestSchema },
    },
    updateLostReasonHandler,
  );

  server.delete(
    "/lost-reasons/:id",
    { preHandler: [verifyLostReasonAccess], schema: { params: idParamsSchema } },
    deleteLostReasonHandler,
  );

  server.put(
    "/labels/:id",
    {
      preHandler: [verifyLabelAccess],
      schema: { params: idParamsSchema, body: updateLabelRequestSchema },
    },
    updateLabelHandler,
  );

  server.delete(
    "/labels/:id",
    { preHandler: [verifyLabelAccess], schema: { params: idParamsSchema } },
    deleteLabelHandler,
  );

  // Registered above the `/:id` routes so "team-defaults" is not read as an id.
  server.get("/team-defaults", getTeamPipelineDefaultsHandler);

  server.put(
    "/team-defaults/:teamId",
    { schema: { params: teamIdParamSchema, body: updateTeamDefaultRequestSchema } },
    updateTeamPipelineDefaultHandler,
  );

  server.get(
    "/:id",
    { preHandler: [verifyPipelineAccess], schema: { params: idParamsSchema } },
    getPipelineHandler,
  );

  server.put(
    "/:id",
    {
      preHandler: [verifyPipelineAccess, verifyOwnerForTeamChange],
      schema: { params: idParamsSchema, body: updatePipelineRequestSchema },
    },
    updatePipelineHandler,
  );

  server.delete(
    "/:id",
    {
      // Owner-only: this takes the board and every lead on it with it.
      preHandler: [verifyPipelineAccess, verifyOwnerForDelete],
      schema: { params: idParamsSchema },
    },
    deletePipelineHandler,
  );

  server.get(
    "/:id/members",
    { preHandler: [verifyPipelineAccess], schema: { params: idParamsSchema } },
    getPipelineMembersHandler,
  );

  // Every count the board shows, over the whole pipeline rather than over the
  // page a column happens to have loaded.
  server.get(
    "/:id/stats",
    { preHandler: [verifyPipelineAccess], schema: { params: idParamsSchema } },
    getPipelineStatsHandler,
  );

  server.get(
    "/:id/forecast",
    { preHandler: [verifyPipelineAccess], schema: { params: idParamsSchema } },
    getPipelineForecastHandler,
  );

  server.post(
    "/:id/lost-reasons",
    {
      preHandler: [verifyPipelineAccess],
      schema: { params: idParamsSchema, body: createLostReasonRequestSchema },
    },
    createLostReasonHandler,
  );

  server.post(
    "/:id/labels",
    {
      preHandler: [verifyPipelineAccess],
      schema: { params: idParamsSchema, body: createLabelRequestSchema },
    },
    createLabelHandler,
  );
}
