import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
import {
  createReferralHandler,
  getAllReferralsHandler,
  deleteReferralHandler,
  trackVisitHandler,
} from "./referrals.controller.js";

export async function referralRoutes(server: FastifyInstance) {
  server.post<{ Body: { name: string; email: string } }>(
    "/",
    {
      preHandler: [checkSession, assertRootOrg],
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

  server.delete<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [checkSession, assertRootOrg],
    },
    deleteReferralHandler,
  );

  server.post("/track-visit", trackVisitHandler);
}
