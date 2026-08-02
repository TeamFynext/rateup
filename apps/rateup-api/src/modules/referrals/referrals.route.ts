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
  // No route declared a schema and the module had no schema file at all, so the
  // only validation was three truthiness checks in the handlers.
  // See issues.txt 38.4.
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

  // Registered as `server.post("/track-visit", handler)` — two arguments, so no
  // options object, no preHandler and no schema — while it increments a counter
  // an influencer may be paid on. Unauthenticated by design (a visit happens
  // before anyone signs in), so the defences are a per-IP rate limit here and a
  // per-IP-per-code daily dedup in the handler. See issues.txt 38.1.
  server.post<{ Body: TrackVisitInput }>(
    "/track-visit",
    {
      preHandler: rateLimit({ max: 60, windowSeconds: 3600, key: "referralTrackVisit" }),
      schema: { body: trackVisitSchema },
    },
    trackVisitHandler,
  );
}
