import { FastifyInstance } from "fastify";
import {
  awardPointsHandler,
  createCustomerAccountHandler,
  exportCustomerAccountsHandler,
  getCustomerAccountByIdHandler,
  getCustomerAccountByContactHandler,
  getCustomerAccountByPhoneHandler,
  getCustomerAccountsHandler,
  updateCustomerAccountHandler,
  assignRewardToCustomerHandler,
  getRewardByShortCodeHandler,
  redeemRewardByShortCodeHandler,
} from "./account.controller.js";
import { $customerAccountRef } from "./account.schema.js";

export async function customerAccountRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $customerAccountRef("customerLoyaltyAccountSchema"),
      },
    },
    createCustomerAccountHandler,
  );

  server.get("/", getCustomerAccountsHandler);

  server.get(
    "/:customerId",
    {
      schema: {
        params: $customerAccountRef("customerIdParamSchema"),
      },
    },
    getCustomerAccountByIdHandler,
  );

  server.get(
    "/contact/:contactId",
    {
      schema: {
        params: $customerAccountRef("contactIdParamSchema"),
      },
    },
    getCustomerAccountByContactHandler,
  );

  server.get(
    "/phone/:phoneNumber",
    {
      schema: {
        params: $customerAccountRef("phoneNumberParamSchema"),
      },
    },
    getCustomerAccountByPhoneHandler,
  );

  server.put(
    "/:customerId",
    {
      schema: {
        params: $customerAccountRef("customerIdParamSchema"),
        body: $customerAccountRef("customerLoyaltyAccountUpdateSchema"),
      },
    },
    updateCustomerAccountHandler,
  );

  server.post(
    "/award-points",
    {
      schema: {
        body: $customerAccountRef("awardPointsSchema"),
      },
    },
    awardPointsHandler,
  );

  server.post(
    "/:customerId/assign-reward",
    {
      schema: {
        params: $customerAccountRef("customerIdParamSchema"),
        body: $customerAccountRef("assignRewardSchema"),
      },
    },
    assignRewardToCustomerHandler,
  );

  server.get(
    "/rewards/:shortCode",
    {
      schema: {
        params: $customerAccountRef("shortCodeParamSchema"),
      },
    },
    getRewardByShortCodeHandler,
  );

  server.post(
    "/rewards/:shortCode/redeem",
    {
      schema: {
        params: $customerAccountRef("shortCodeParamSchema"),
      },
    },
    redeemRewardByShortCodeHandler,
  );

  server.get("/export", exportCustomerAccountsHandler);
}
