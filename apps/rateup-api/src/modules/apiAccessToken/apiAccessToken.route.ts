import { FastifyInstance } from "fastify/types/instance";
import {
  createApiAccessTokenHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  regenerateApiAccessTokenHandler,
} from "./apiAccessToken.controller";
import { checkSession } from "../../utils/checkSession";

export async function apiAccessTokenRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.post("/", createApiAccessTokenHandler);
  server.delete("/", deleteApiAccessTokenHandler);
  server.post("/regenerate", regenerateApiAccessTokenHandler);
  server.get("/", getApiAccessTokenCreatedAtHandler);
}
