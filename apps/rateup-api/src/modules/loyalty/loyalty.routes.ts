import { FastifyInstance } from "fastify";
import { loyaltyActionsRoutes } from "./actions/actions.route.js";
import { loyaltyRewardsRoutes } from "./rewards/rewards.route.js";
import { checkSession } from "../../utils/checkSession.js";
import { loyaltyCustomerRoutes } from "./customer/customer.route.js";
import { loyaltyRedeemRoutes } from "./redeems/redeem.route.js";
import { LoyaltySettingsRoutes } from "./settings/settings.route.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { loyaltyDashboardRoutes } from "./dashboard/dashboard.router.js";
import { customerGroupRoutes } from "./customer/customerGroup/customerGroup.route.js";
import { loyaltyApiSettingRoutes } from "./apiSetting/apiSetting.route.js";

export async function loyaltyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Loyalty]),
  );
  server.register(loyaltyActionsRoutes, { prefix: "/action" });
  server.register(loyaltyRewardsRoutes, { prefix: "/reward" });
  server.register(loyaltyCustomerRoutes, { prefix: "/customer" });
  server.register(loyaltyRedeemRoutes, { prefix: "/redeem" });
  server.register(LoyaltySettingsRoutes, { prefix: "/settings" });
  server.register(loyaltyDashboardRoutes, { prefix: "/dashboard" });
  server.register(customerGroupRoutes, { prefix: "/customer/group" });
  server.register(loyaltyApiSettingRoutes, { prefix: "/api-settings" });
}
