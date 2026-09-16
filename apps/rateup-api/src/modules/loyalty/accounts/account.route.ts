import { FastifyInstance } from "fastify";
import {
  lookupContactByPhoneHandler,
  searchContactsForEnrolmentHandler,
  awardPointsHandler,
  createCustomerAccountHandler,
  exportCustomerAccountsHandler,
  getCustomerAccountByIdHandler,
  getCustomerAccountByContactHandler,
  getCustomerAccountByPhoneHandler,
  getCustomerAccountByCardCodeHandler,
  sendMemberCardHandler,
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
  cardCodeParamSchema,
  customerLoyaltyAccountUpdateSchema,
  awardPointsSchema,
  assignRewardSchema,
  shortCodeParamSchema,
  searchQuerySchema,
  contactSearchQuerySchema,
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

  // Distinct from "/phone/:phoneNumber" below, which looks for an existing *member*.
  // This answers "does the org already have a contact for this number", which is what
  // the add-customer form needs before it knows whether to ask for a name.
  server.get(
    "/lookup/:phoneNumber",
    {
      schema: {
        params: phoneNumberParamSchema,
      },
    },
    lookupContactByPhoneHandler,
  );

  // The org's contacts — members flagged — so the cashier can enrol someone who already
  // exists from a WhatsApp chat or an import without retyping their number.
  server.get(
    "/contacts",
    {
      schema: {
        querystring: contactSearchQuerySchema,
      },
    },
    searchContactsForEnrolmentHandler,
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

  // The scanned member card. Same payload as "/phone/:phoneNumber", found by the code the
  // QR carries instead of the number.
  server.get(
    "/card/:cardCode",
    {
      schema: {
        params: cardCodeParamSchema,
      },
    },
    getCustomerAccountByCardCodeHandler,
  );

  server.post(
    "/:customerId/card/send",
    {
      schema: {
        params: customerIdParamSchema,
      },
    },
    sendMemberCardHandler,
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
