import { FastifyReply, FastifyRequest } from "fastify";
import { getLoyaltyDashboardStats } from "./dashboard.service.js";
import { log } from "../../../utils/logger.js";

export const getLoyaltyDashboardStatsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const orgId = req.user.orgId;
    const response = await getLoyaltyDashboardStats(orgId);
    res.code(200).send(response);
  } catch (error) {
    log.error(error);
    res.code(500).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};
