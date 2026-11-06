import { FastifyInstance } from "fastify";
import { getTeamsExternalController } from "./teams.external.controller.js";
import z from "zod";
import { declareExternalScopes } from "../../shared/scopes.js";

const getTeamsResponse = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);

export async function externalTeamRoutes(server: FastifyInstance) {
  declareExternalScopes(server, { read: "teams.read", write: "teams.manage" });

  server.get(
    "/",
    {
      schema: {
        tags: ["Team"],
        description: "Get all teams",
        summary: "Get all teams",
        response: {
          200: getTeamsResponse,
        },
      },
    },
    getTeamsExternalController,
  );
}
