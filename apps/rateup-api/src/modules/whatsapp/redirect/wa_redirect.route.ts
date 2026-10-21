import { FastifyInstance } from "fastify";
import { getWaShareMessageFromSTMIdHandler, tokenizeIpHandler } from "./wa_redirect.controller.js";
import { declareAccess } from "../../../authz/registry.js";
import { rateLimit } from "../../../utils/rateLimit.js";

/**
 * Each tokenize call inserts a row, unauthenticated. A visitor needs one per page view;
 * the cap stops a script from filling the table between the two-day purges.
 */
const tokenizeLimit = rateLimit({ key: "wa-redirect-tokenize", max: 30, windowSeconds: 60 * 60 });

export async function waRedirectRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.get("/:surveyTeamMapShortId", getWaShareMessageFromSTMIdHandler);
  server.post("/", { preHandler: [tokenizeLimit] }, tokenizeIpHandler);
}
