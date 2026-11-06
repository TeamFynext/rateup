import { FastifyInstance } from "fastify";

import { rateLimit } from "../../../utils/rateLimit.js";
import { reviewRedirectHandler } from "./feedback.controller.js";
import { reviewRedirectParamsSchema } from "./feedback.schema.js";

/**
 * `GET /api/public/loyalty/feedback/review/:requestId/:sig` — where the "Review us on
 * Google" button sends the customer. No session: the customer is a WhatsApp user, not a
 * dashboard user, and the signature is what authorises the request.
 *
 * Fail-open rate limit: a Redis blip must not turn a customer's tap into an error page.
 */
export async function loyaltyFeedbackPublicRoutes(server: FastifyInstance) {
  server.get(
    "/review/:requestId/:sig",
    {
      preHandler: [rateLimit({ max: 30, windowSeconds: 60, key: "loyaltyFeedbackReview" })],
      schema: { params: reviewRedirectParamsSchema },
    },
    reviewRedirectHandler,
  );
}
