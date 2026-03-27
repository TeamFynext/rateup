import { FastifyInstance } from "fastify";
import { getTeamsExternalController } from "./teams.external.controller.js";
import z from "zod";

const getTeamsResponse = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
  }),
);

export async function externalTeamRoutes(server: FastifyInstance) {
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
