import { FastifyInstance } from "fastify";

import {
  getInstagramAccountInsightsHandler,
  getInstagramPostsInsightsHandler,
} from "./instagram_insights.controller.js";
import {
  instagramInsightsParamsSchema,
  instagramInsightsQuerySchema,
} from "./instagram_insights.schema.js";

/** `/whatsapp/instagram-insights/:ibaId/{account,posts}?range=7d|30d|90d` — the Analytics view. */
export async function instagramInsightsRoutes(server: FastifyInstance) {
  const schema = {
    params: instagramInsightsParamsSchema,
    querystring: instagramInsightsQuerySchema,
  };
  const config = { permission: "analytics.read" } as const;

  server.get("/:ibaId/account", { schema, config }, getInstagramAccountInsightsHandler);
  server.get("/:ibaId/posts", { schema, config }, getInstagramPostsInsightsHandler);
}
