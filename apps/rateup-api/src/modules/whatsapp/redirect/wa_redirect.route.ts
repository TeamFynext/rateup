import { FastifyInstance } from "fastify";
import { getWaShareMessageFromSTMIdHandler, tokenizeIpHandler } from "./wa_redirect.controller.js";
import { declareAccess } from "../../../authz/registry.js";

export async function waRedirectRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.get("/:surveyTeamMapShortId", getWaShareMessageFromSTMIdHandler);
  server.post("/", tokenizeIpHandler);
}
