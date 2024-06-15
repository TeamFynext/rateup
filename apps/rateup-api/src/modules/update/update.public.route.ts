//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import { testUpdateRoute, updateDatabase } from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.get("/", testUpdateRoute);

  server.get("/db", updateDatabase);
}
