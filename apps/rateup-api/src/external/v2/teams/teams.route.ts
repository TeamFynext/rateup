import type { FastifyInstance } from "fastify";
import z from "zod";

import { externalErrorResponses } from "../../shared/errors.js";
import { pageSchema, paginationQuerySchema } from "../pagination.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import { listTeamsHandler } from "./teams.controller.js";

const teamSchema = z.object({ id: z.string(), name: z.string() });

export async function externalTeamRoutes(server: FastifyInstance) {
  declareExternalScopes(server, { read: "teams.read", write: "teams.manage" });

  server.get(
    "/",
    {
      schema: {
        tags: ["Teams"],
        summary: "List teams",
        description: "Newest first. A team id is what campaigns and contact groups are scoped to.",
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(teamSchema), ...externalErrorResponses },
      },
    },
    listTeamsHandler,
  );
}
