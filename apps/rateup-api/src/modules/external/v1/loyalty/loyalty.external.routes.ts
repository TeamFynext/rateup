import { FastifyInstance } from "fastify";
import { externalLoyaltyActionRoutes } from "./action/action.external.route";
import { externalLoyaltyCustomerRoutes } from "./customer/customer.external.route";
import { externalLoyaltyRedeemRoutes } from "./redeem/redeem.external.route";
import { externalLoyaltyRewardRoutes } from "./reward/reward.external.route";

export async function externalLoyaltyRoutes(server: FastifyInstance) {
  server.register(externalLoyaltyActionRoutes, { prefix: "/action" });
  server.register(externalLoyaltyCustomerRoutes, { prefix: "/customer" });
  server.register(externalLoyaltyRedeemRoutes, { prefix: "/redeem" });
  server.register(externalLoyaltyRewardRoutes, { prefix: "/reward" });
}
