import { FastifyInstance } from "fastify";
import { getTeamsExternalController } from "./teams.external.controller.js";

export async function externalTeamRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        tags: ["Team"],
        description: "Get all teams",
        summary: "Get all teams",
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                createdAt: { type: "string" },
              },
            },
          },
        },
      },
    },
    getTeamsExternalController,
  );
}
