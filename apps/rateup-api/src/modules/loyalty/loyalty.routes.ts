import { FastifyInstance } from "fastify";
import { loyaltyActionsRoutes } from "./actions/actions.route";
import { loyaltyRewardsRoutes } from "./rewards/rewards.route";
import { checkSession } from "../../utils/checkSession";
import { loyaltyCustomerRoutes } from "./customer/customer.route";
import { loyaltyRedeemRoutes } from "./redeems/redeem.route";
import { LoyaltySettingsRoutes } from "./settings/settings.route";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { SubscriptionFeaturePathName } from "../../types/enums";
import { loyaltyDashboardRoutes } from "./dashboard/dashboard.router";
import { customerGroupRoutes } from "./customer/customerGroup/customerGroup.route";
import { loyaltyApiSettingRoutes } from "./apiSetting/apiSetting.route";

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
