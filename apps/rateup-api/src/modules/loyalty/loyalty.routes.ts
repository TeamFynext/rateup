import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { requireFeature, TeamFeature } from "../../utils/permissions.js";

// New Loyalty System Routes
import { loyaltyProgramRoutes } from "./program/program.route.js";
import { loyaltyTierRoutes } from "./tiers/tier.route.js";
import { loyaltyEarningRuleRoutes } from "./earningRules/earningRule.route.js";
import { loyaltyRewardRoutes } from "./rewards/reward.route.js";
import { customerAccountRoutes } from "./accounts/account.route.js";
import { redemptionRoutes } from "./redemptions/redemption.route.js";
import { referralRoutes } from "./referrals/referral.route.js";
import { approvalRoutes } from "./approvals/approval.route.js";

import { LoyaltySettingsRoutes } from "./settings/settings.route.js";
import { loyaltyDashboardRoutes } from "./dashboard/dashboard.router.js";
import { loyaltyApiSettingRoutes } from "./apiSetting/apiSetting.route.js";
import { loyaltyOnboardingRoutes } from "./onboarding/onboarding.route.js";

export async function loyaltyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp]),
  );
  server.addHook("preHandler", requireFeature(TeamFeature.loyalty));

  // New Loyalty System Routes
  server.register(loyaltyProgramRoutes, { prefix: "/program" });
  server.register(loyaltyTierRoutes, { prefix: "/tiers" });
  server.register(loyaltyEarningRuleRoutes, { prefix: "/earning-rules" });
  server.register(loyaltyRewardRoutes, { prefix: "/rewards" });
  server.register(customerAccountRoutes, { prefix: "/accounts" });
  server.register(redemptionRoutes, { prefix: "/redemptions" });
  server.register(referralRoutes, { prefix: "/referrals" });
  server.register(approvalRoutes, { prefix: "/approvals" });

  server.register(LoyaltySettingsRoutes, { prefix: "/settings" });
  server.register(loyaltyDashboardRoutes, { prefix: "/dashboard" });
  server.register(loyaltyApiSettingRoutes, { prefix: "/api-settings" });
  server.register(loyaltyOnboardingRoutes, { prefix: "/onboarding" });
}
