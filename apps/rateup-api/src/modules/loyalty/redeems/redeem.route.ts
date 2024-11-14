import { FastifyInstance } from "fastify";
import { getLoyaltyRedeemsHandler } from "./redeem.controller";

export async function loyaltyRedeemRoutes(server: FastifyInstance) {
  server.get("/", getLoyaltyRedeemsHandler);
}
