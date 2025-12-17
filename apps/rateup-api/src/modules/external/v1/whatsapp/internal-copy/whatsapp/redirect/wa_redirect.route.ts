import { FastifyInstance } from "fastify";
import {
  getWaShareMessageFromSTMIdHandler,
  tokenizeIpHandler,
} from "./wa_redirect.controller.js";

export async function waRedirectRoutes(server: FastifyInstance) {
  server.get("/:surveyTeamMapShortId", getWaShareMessageFromSTMIdHandler);
  server.post("/", tokenizeIpHandler);
}
