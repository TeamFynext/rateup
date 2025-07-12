//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import { updateUsageStatsTemplateMessageHandler } from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/usage-stats", updateUsageStatsTemplateMessageHandler);
}
