import { FastifyInstance } from "fastify";
import {
  getActiveSurveyStatsHandler,
  getOverallStatsHandler,
  getTeamMemberStatsHandler,
} from "./dashboard.controller.js";
import { checkSession } from "../../utils/checkSession.js";
import { byTeamIdParamsSchema } from "../team/team.schema.js";

export async function dashboardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
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
