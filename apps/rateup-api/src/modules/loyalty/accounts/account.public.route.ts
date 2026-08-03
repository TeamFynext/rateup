import { FastifyInstance } from "fastify";
import { createPublicCustomerAccountHandler } from "./account.controller.js";
import { customerLoyaltyAccountSchema, CustomerLoyaltyAccountInput } from "./account.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";

export async function customerAccountPublicRoutes(server: FastifyInstance) {
  server.post<{ Body: CustomerLoyaltyAccountInput }>(
    "/",
    {
      preHandler: rateLimit({ max: 20, windowSeconds: 60 * 60, key: "loyaltySignup" }),
      schema: {
        body: customerLoyaltyAccountSchema,
      },
    },
    createPublicCustomerAccountHandler,
  );
}
