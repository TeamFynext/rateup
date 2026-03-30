import { FastifyInstance } from "fastify";
import { createCustomerAccountHandler } from "./account.controller.js";
import { customerLoyaltyAccountSchema } from "./account.schema.js";

export async function customerAccountPublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: customerLoyaltyAccountSchema,
      },
    },
    createCustomerAccountHandler,
  );
}
