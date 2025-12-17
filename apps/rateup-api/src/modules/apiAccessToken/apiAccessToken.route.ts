import { FastifyInstance } from "fastify/types/instance.js";
import {
  createApiAccessTokenHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  regenerateApiAccessTokenHandler,
} from "./apiAccessToken.controller.js";
import { checkSession } from "../../utils/checkSession.js";

export async function apiAccessTokenRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.post("/", createApiAccessTokenHandler);
  server.delete("/", deleteApiAccessTokenHandler);
  server.post("/regenerate", regenerateApiAccessTokenHandler);
  server.get("/", getApiAccessTokenCreatedAtHandler);
}
