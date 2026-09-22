import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { globalSearch } from "./search.service.js";

const searchQuerySchema = z.object({ q: z.string().trim().min(2).max(200) });

export async function staffSearchRoutes(server: FastifyInstance) {
  server.get<{ Querystring: z.infer<typeof searchQuerySchema> }>(
    "/search",
    { schema: { querystring: searchQuerySchema } },
    async (request) => ({ data: await globalSearch(request.query.q) }),
  );
}
