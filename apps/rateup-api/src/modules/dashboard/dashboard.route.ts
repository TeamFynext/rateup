import { FastifyInstance } from "fastify";
import {
  getActiveSurveyStatsHandler,
  getOverallStatsHandler,
  getTeamMemberStatsHandler,
} from "./dashboard.controller";
import { checkSession } from "../../utils/checkSession";
import { $Tref } from "../team/team.schema";

export async function dashboardRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/stats", getOverallStatsHandler);
  server.get("/surveys", getActiveSurveyStatsHandler);
  server.get(
    "/teamStats/:teamId",
    {
      schema: {
        params: $Tref("byTeamIdParamsSchema"),
      },
    },
    getTeamMemberStatsHandler,
  );
}
