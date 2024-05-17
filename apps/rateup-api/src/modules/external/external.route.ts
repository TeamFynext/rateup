import { FastifyInstance } from "fastify";
import { v1ExternalRoutes } from "./v1/v1.external.route";

export async function externalRoutes(server: FastifyInstance) {
  server.register(v1ExternalRoutes, { prefix: "/v1/:orgId" });
}
