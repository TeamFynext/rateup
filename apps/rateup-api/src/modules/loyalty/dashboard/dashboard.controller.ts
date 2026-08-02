import { FastifyReply, FastifyRequest } from "fastify";
import { getLoyaltyDashboardStats } from "./dashboard.service.js";
import { log } from "../../../utils/logger.js";

export const getLoyaltyDashboardStatsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const orgId = req.user.orgId;
    const response = await getLoyaltyDashboardStats(orgId);
    res.code(200).send(response);
  } catch (error) {
    // The shared logger, and `{ error }` like every other endpoint in the module.
    // This used to be a console.log with a rocket emoji — so the dashboard's
    // failures never reached the structured logs at all — answered with a bare
    // string where the rest of the module sends an object. See issues.txt 20.39.
    log.error(error);
    res.code(500).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};
