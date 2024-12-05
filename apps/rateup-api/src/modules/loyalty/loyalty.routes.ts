import { FastifyInstance } from "fastify";
import { loyaltyActionsRoutes } from "./actions/actions.route";
import { loyaltyRewardsRoutes } from "./rewards/rerwards.route";
import { checkSession } from "../../utils/checkSession";
import { loyaltyCustomerRoutes } from "./customer/customer.route";
import { loyaltyRedeemRoutes } from "./redeems/redeem.route";
import { LoyaltySettingsRoutes } from "./settings/settings.route";

export async function loyaltyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(loyaltyActionsRoutes, { prefix: "/action" });
  server.register(loyaltyRewardsRoutes, { prefix: "/reward" });
  server.register(loyaltyCustomerRoutes, { prefix: "/customer" });
  server.register(loyaltyRedeemRoutes, { prefix: "/redeem" });
  server.register(LoyaltySettingsRoutes, { prefix: "/settings" });
}
