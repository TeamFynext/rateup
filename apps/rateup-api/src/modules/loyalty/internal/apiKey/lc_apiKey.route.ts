import { FastifyInstance } from "fastify/types/instance";
import {
  createLoyaltyApiKeyHandler,
  deleteLoyaltyApiKeyHandler,
  getLoyaltyApiKeyCreatedAtHandler,
  regenerateLoyaltyApiKeyHandler,
} from "./lc_apiKey.controller";
import { checkSession } from "../../../../utils/checkSession";

export async function loyaltyApiKeyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.post("/", createLoyaltyApiKeyHandler);
  server.delete("/", deleteLoyaltyApiKeyHandler);
  server.post("/regenerate", regenerateLoyaltyApiKeyHandler);
  server.get("/", getLoyaltyApiKeyCreatedAtHandler);
}
