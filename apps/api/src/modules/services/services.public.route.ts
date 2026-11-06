//THIS is for Services / API Triggers etc

import { FastifyInstance } from "fastify";
import { testServiceRoute } from "./services.controller.js";

export async function servicePublicRoutes(server: FastifyInstance) {
  server.get("/", testServiceRoute);
}
