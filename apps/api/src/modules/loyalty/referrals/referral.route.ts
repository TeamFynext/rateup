import { FastifyInstance } from "fastify";
import {
  completeReferralHandler,
  getReferralsByProgramHandler,
  getReferralsByReferrerHandler,
  trackReferralHandler,
} from "./referral.controller.js";
import {
  trackReferralSchema,
  completeReferralSchema,
  referrerIdParamSchema,
} from "./referral.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function referralRoutes(server: FastifyInstance) {
  declareAccess(server, { write: "loyalty.cashier" });
  server.post(
    "/track",
    {
      schema: {
        body: trackReferralSchema,
      },
    },
    trackReferralHandler,
  );

  server.post(
    "/complete",
    {
      schema: {
        body: completeReferralSchema,
      },
    },
    completeReferralHandler,
  );

  server.get("/", getReferralsByProgramHandler);

  server.get(
    "/referrer/:referrerId",
    {
      schema: {
        params: referrerIdParamSchema,
      },
    },
    getReferralsByReferrerHandler,
  );
}
