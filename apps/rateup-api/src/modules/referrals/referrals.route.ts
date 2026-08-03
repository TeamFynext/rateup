import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
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

export async function referralRoutes(server: FastifyInstance) {
  server.post<{ Body: CreateReferralInput }>(
    "/",
    {
      preHandler: [checkSession, assertRootOrg],
      schema: { body: createReferralSchema },
    },
    createReferralHandler,
  );

  server.get(
    "/",
    {
      preHandler: [checkSession, assertRootOrg],
    },
    getAllReferralsHandler,
  );

  server.delete<{ Params: ByIdParams }>(
    "/:id",
    {
      preHandler: [checkSession, assertRootOrg],
      schema: { params: byIdParamsSchema },
    },
    deleteReferralHandler,
  );

  server.post<{ Body: TrackVisitInput }>(
    "/track-visit",
    {
      preHandler: rateLimit({ max: 60, windowSeconds: 3600, key: "referralTrackVisit" }),
      schema: { body: trackVisitSchema },
    },
    trackVisitHandler,
  );
}
