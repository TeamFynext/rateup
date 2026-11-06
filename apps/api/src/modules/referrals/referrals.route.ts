import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg, getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { rateLimit } from "../../utils/rateLimit.js";
import {
  createReferralHandler,
  getAllReferralsHandler,
  deleteReferralHandler,
  trackVisitHandler,
} from "./referrals.controller.js";
import {
  byIdParamsSchema,
  createReferralSchema,
  trackVisitSchema,
  type ByIdParams,
  type CreateReferralInput,
  type TrackVisitInput,
} from "./referrals.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function referralRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  // Referrals are a Starter-and-above capability; this tree was previously ungated at
  // the subscription level. Applied per-route rather than as a hook so /track-visit
  // stays public — it is hit by referred visitors who have no session and are not the
  // subscribing org.
  const requireReferrals = getVerifySubscriptionHandler([
    SubscriptionFeaturePathName.WhatsappReferrals,
  ]);

  server.post<{ Body: CreateReferralInput }>(
    "/",
    {
      preHandler: [checkSession, assertRootOrg, requireReferrals],
      schema: { body: createReferralSchema },
    },
    createReferralHandler,
  );

  server.get(
    "/",
    {
      preHandler: [checkSession, assertRootOrg, requireReferrals],
    },
    getAllReferralsHandler,
  );

  server.delete<{ Params: ByIdParams }>(
    "/:id",
    {
      preHandler: [checkSession, assertRootOrg, requireReferrals],
      schema: { params: byIdParamsSchema },
    },
    deleteReferralHandler,
  );

  server.post<{ Body: TrackVisitInput }>(
    "/track-visit",
    {
      config: { access: "public" },
      preHandler: rateLimit({ max: 60, windowSeconds: 3600, key: "referralTrackVisit" }),
      schema: { body: trackVisitSchema },
    },
    trackVisitHandler,
  );
}
