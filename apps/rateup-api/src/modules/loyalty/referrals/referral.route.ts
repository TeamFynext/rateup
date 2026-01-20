import { FastifyInstance } from "fastify";
import {
  completeReferralHandler,
  getReferralsByProgramHandler,
  getReferralsByReferrerHandler,
  trackReferralHandler,
} from "./referral.controller.js";
import { $referralRef } from "./referral.schema.js";

export async function referralRoutes(server: FastifyInstance) {
  server.post(
    "/track",
    {
      schema: {
        body: $referralRef("trackReferralSchema"),
      },
    },
    trackReferralHandler,
  );

  server.post(
    "/complete",
    {
      schema: {
        body: $referralRef("completeReferralSchema"),
      },
    },
    completeReferralHandler,
  );

  server.get("/", getReferralsByProgramHandler);

  server.get(
    "/referrer/:referrerId",
    {
      schema: {
        params: $referralRef("referrerIdParamSchema"),
      },
    },
    getReferralsByReferrerHandler,
  );
}
