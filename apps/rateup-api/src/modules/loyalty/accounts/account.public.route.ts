import { FastifyInstance } from "fastify";
import { createPublicCustomerAccountHandler } from "./account.controller.js";
import { customerLoyaltyAccountSchema, CustomerLoyaltyAccountInput } from "./account.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";

/**
 * Unauthenticated loyalty enrolment.
 *
 * It used to share createCustomerAccountHandler with the authenticated tree, where
 * that handler preferred the body's orgId over the session's — so fixing the
 * authenticated route would have broken this one, and leaving them shared is how
 * the body-org behaviour got there in the first place. They are separate handlers
 * now. See issues.txt 20.13.
 *
 * The per-IP limit is what takes the free repetition out of the referral-bonus
 * loop this endpoint exposes. Twenty an hour is far above any real enrolment rate
 * from one address and far below a useful minting rate.
 */
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
