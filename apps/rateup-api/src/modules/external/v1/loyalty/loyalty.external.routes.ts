import { FastifyInstance } from "fastify";
import { externalLoyaltyActionRoutes } from "./action/action.external.route.js";
import { externalLoyaltyCustomerRoutes } from "./customer/customer.external.route.js";
import { externalLoyaltyRedeemRoutes } from "./redeem/redeem.external.route.js";
import { externalLoyaltyRewardRoutes } from "./reward/reward.external.route.js";

export async function externalLoyaltyRoutes(server: FastifyInstance) {
  server.register(externalLoyaltyActionRoutes, { prefix: "/action" });
  server.register(externalLoyaltyCustomerRoutes, { prefix: "/customer" });
  server.register(externalLoyaltyRedeemRoutes, { prefix: "/redeem" });
  server.register(externalLoyaltyRewardRoutes, { prefix: "/reward" });
}
