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

  server.get("/export", exportCustomerAccountsHandler);
}
