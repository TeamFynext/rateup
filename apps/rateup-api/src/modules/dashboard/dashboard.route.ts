import { FastifyInstance } from "fastify";
import {
  getActiveSurveyStatsHandler,
  getOverallStatsHandler,
  getTeamMemberStatsHandler,
} from "./dashboard.controller.js";
import { byTeamIdParamsSchema } from "../team/team.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function dashboardRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.get("/stats", getOverallStatsHandler);
  server.get("/surveys", getActiveSurveyStatsHandler);
  server.get(
    "/teamStats/:teamId",
    {
      schema: {
        params: byTeamIdParamsSchema,
      },
    },
    getTeamMemberStatsHandler,
  );
}
