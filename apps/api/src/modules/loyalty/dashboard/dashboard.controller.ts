import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import type { DashboardQuery } from "./dashboard.schema.js";
import { getLoyaltyDashboardStats } from "./dashboard.service.js";

export const getLoyaltyDashboardStatsHandler = async (
  req: FastifyRequest<{ Querystring: DashboardQuery }>,
  res: FastifyReply,
) => {
  try {
    const response = await getLoyaltyDashboardStats(req.user.orgId, req.query ?? {});
    res.code(200).send(response);
  } catch (error) {
    log.error(error);
    res.code(500).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};
