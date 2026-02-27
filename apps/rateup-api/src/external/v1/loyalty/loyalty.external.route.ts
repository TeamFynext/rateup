import { FastifyInstance } from "fastify";
import { $customerAccountRef } from "../../../modules/loyalty/accounts/account.schema.js";
import {
  assignRewardExternalController,
  awardLoyaltyPointsExternalController,
  getAvailableRewardsExternalController,
  getAllLoyaltyCustomersExternalController,
  getCustomerLoyaltyPointsExternalController,
  redeemCouponExternalController,
  redeemRewardExternalController,
  registerLoyaltyCustomerExternalController,
} from "./loyalty.external.controller.js";
import { $CLAreff, customerLoyaltyAccountSchemas } from "./loyalty.schema.js";

export async function externalLoyaltyRoutes(server: FastifyInstance) {
  for (const schema of customerLoyaltyAccountSchemas) {
    server.addSchema(schema);
  }
  server.post(
    "/customers/register",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Register loyalty customer",
        summary: "Register customer",
        body: $CLAreff("customerLoyaltyAccountSchemaExternal"),
      },
    },
    registerLoyaltyCustomerExternalController,
  );

  server.post(
    "/customers/award-points",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Add loyalty points for a customer",
        summary: "Add loyalty points",
        body: $customerAccountRef("awardPointsSchema"),
      },
    },
    awardLoyaltyPointsExternalController,
  );

  server.post(
    "/customers/assign-reward",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Assign reward to customer",
        summary: "Assign reward",
        body: $customerAccountRef("assignRewardSchema"),
      },
    },
    assignRewardExternalController,
  );

  server.get(
    "/customers",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Get all loyalty customers",
        summary: "Get all customers",
      },
    },
    getAllLoyaltyCustomersExternalController,
  );

  server.get(
    "/customers/:phoneNumber/points",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Get loyalty points for a customer",
        summary: "Get loyalty points",
        params: $customerAccountRef("phoneNumberParamSchema"),
      },
    },
    getCustomerLoyaltyPointsExternalController,
  );

  server.get(
    "/rewards",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Get all available rewards",
        summary: "Get available rewards",
      },
    },
    getAvailableRewardsExternalController,
  );

  server.post(
    "/rewards/redeem",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Redeem a loyalty reward",
        summary: "Redeem reward",
        body: $customerAccountRef("redeemRewardSchema"),
      },
    },
    redeemRewardExternalController,
  );

  server.post(
    "/coupons/redeem",
    {
      schema: {
        tags: ["Loyalty"],
        description: "Redeem a coupon by redemption code",
        summary: "Redeem coupon",
        body: $customerAccountRef("applyRedemptionSchema"),
      },
    },
    redeemCouponExternalController,
  );
}
