import { FastifyInstance } from "fastify";
import {
  applyRedemptionHandler,
  getRedemptionsByCustomerHandler,
  redeemRewardHandler,
  verifyRedemptionHandler,
  getTransactionsHandler,
} from "./redemption.controller.js";
import {
  redeemRewardSchema,
  verifyRedemptionSchema,
  applyRedemptionSchema,
  customerIdParamSchema,
} from "../accounts/account.schema.js";
import { transactionFilterSchema } from "./redemption.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function redemptionRoutes(server: FastifyInstance) {
  declareAccess(server, { write: "loyalty.cashier" });
  server.post(
    "/redeem",
    {
      schema: {
        body: redeemRewardSchema,
      },
    },
    redeemRewardHandler,
  );

  server.post(
    "/verify",
    {
      schema: {
        body: verifyRedemptionSchema,
      },
    },
    verifyRedemptionHandler,
  );

  server.post(
    "/apply",
    {
      schema: {
        body: applyRedemptionSchema,
      },
    },
    applyRedemptionHandler,
  );

  server.get(
    "/customer/:customerId",
    {
      schema: {
        params: customerIdParamSchema,
      },
    },
    getRedemptionsByCustomerHandler,
  );

  server.get(
    "/transactions",
    {
      schema: {
        querystring: transactionFilterSchema,
      },
    },
    getTransactionsHandler,
  );
}
