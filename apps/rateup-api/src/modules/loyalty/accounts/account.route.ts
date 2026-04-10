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
import {
  customerLoyaltyAccountSchema,
  customerIdParamSchema,
  contactIdParamSchema,
  phoneNumberParamSchema,
  customerLoyaltyAccountUpdateSchema,
  awardPointsSchema,
  assignRewardSchema,
  shortCodeParamSchema,
  searchQuerySchema,
} from "./account.schema.js";

export async function customerAccountRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: customerLoyaltyAccountSchema,
      },
    },
    createCustomerAccountHandler,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: searchQuerySchema,
      },
    },
    getCustomerAccountsHandler,
  );

  server.get(
    "/:customerId",
    {
      schema: {
        params: customerIdParamSchema,
      },
    },
    getCustomerAccountByIdHandler,
  );

  server.get(
    "/contact/:contactId",
    {
      schema: {
        params: contactIdParamSchema,
      },
    },
    getCustomerAccountByContactHandler,
  );

  server.get(
    "/phone/:phoneNumber",
    {
      schema: {
        params: phoneNumberParamSchema,
      },
    },
    getCustomerAccountByPhoneHandler,
  );

  server.put(
    "/:customerId",
    {
      schema: {
        params: customerIdParamSchema,
        body: customerLoyaltyAccountUpdateSchema,
      },
    },
    updateCustomerAccountHandler,
  );

  server.post(
    "/award-points",
    {
      schema: {
        body: awardPointsSchema,
      },
    },
    awardPointsHandler,
  );

  server.post(
    "/:customerId/assign-reward",
    {
      schema: {
        params: customerIdParamSchema,
        body: assignRewardSchema,
      },
    },
    assignRewardToCustomerHandler,
  );

  server.get(
    "/rewards/:shortCode",
    {
      schema: {
        params: shortCodeParamSchema,
      },
    },
    getRewardByShortCodeHandler,
  );

  server.post(
    "/rewards/:shortCode/redeem",
    {
      schema: {
        params: shortCodeParamSchema,
      },
    },
    redeemRewardByShortCodeHandler,
  );

  server.get("/export", exportCustomerAccountsHandler);
}
