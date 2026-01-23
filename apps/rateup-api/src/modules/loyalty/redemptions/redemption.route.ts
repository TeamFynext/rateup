import { FastifyInstance } from "fastify";
import {
  applyRedemptionHandler,
  getRedemptionsByCustomerHandler,
  redeemRewardHandler,
  verifyRedemptionHandler,
  getTransactionsHandler,
} from "./redemption.controller.js";
import { $customerAccountRef } from "../accounts/account.schema.js";
import { $redemptionRef } from "./redemption.schema.js";

export async function redemptionRoutes(server: FastifyInstance) {
  server.post(
    "/redeem",
    {
      schema: {
        body: $customerAccountRef("redeemRewardSchema"),
      },
    },
    redeemRewardHandler,
  );

  server.post(
    "/verify",
    {
      schema: {
        body: $customerAccountRef("verifyRedemptionSchema"),
      },
    },
    verifyRedemptionHandler,
  );

  server.post(
    "/apply",
    {
      schema: {
        body: $customerAccountRef("applyRedemptionSchema"),
      },
    },
    applyRedemptionHandler,
  );

  server.get(
    "/customer/:customerId",
    {
      schema: {
        params: $customerAccountRef("customerIdParamSchema"),
      },
    },
    getRedemptionsByCustomerHandler,
  );

  server.get(
    "/transactions",
    {
      schema: {
        querystring: $redemptionRef("transactionFilterSchema"),
      },
    },
    getTransactionsHandler,
  );
}
