import { FastifyInstance } from "fastify";
import { createCustomerAccountHandler } from "./account.controller.js";
import { $customerAccountRef } from "./account.schema.js";

export async function customerAccountPublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $customerAccountRef("customerLoyaltyAccountSchema"),
      },
    },
    createCustomerAccountHandler,
  );
}
