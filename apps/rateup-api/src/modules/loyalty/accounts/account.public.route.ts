import { FastifyInstance, FastifyRequest } from "fastify";
import { createPublicCustomerAccountHandler } from "./account.controller.js";
import { customerLoyaltyAccountSchema, CustomerLoyaltyAccountInput } from "./account.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";

type SignupRequest = FastifyRequest<{ Body: CustomerLoyaltyAccountInput }>;

/**
 * The join link on the counter QR posts here, unauthenticated. Three limiters, all
 * fail-closed: one address cannot spray signups, one programme cannot be flooded from
 * many addresses, and one phone cannot be signed up over and over. The handler adds a
 * honeypot, phone validation, and holds the bonus points until the customer is seen on
 * WhatsApp or at the till.
 */
export async function customerAccountPublicRoutes(server: FastifyInstance) {
  server.post<{ Body: CustomerLoyaltyAccountInput }>(
    "/",
    {
      preHandler: [
        rateLimit({ max: 20, windowSeconds: 60 * 60, key: "loyaltySignup", failClosed: true }),
        rateLimit<SignupRequest>({
          max: 100,
          windowSeconds: 60 * 60,
          key: "loyaltySignupOrg",
          failClosed: true,
          keyFrom: (request) => request.body?.orgId,
        }),
        rateLimit<SignupRequest>({
          max: 3,
          windowSeconds: 24 * 60 * 60,
          key: "loyaltySignupPhone",
          failClosed: true,
          keyFrom: (request) => request.body?.phone?.replace(/\D/g, "") || null,
        }),
      ],
      schema: {
        body: customerLoyaltyAccountSchema,
      },
    },
    createPublicCustomerAccountHandler,
  );
}
