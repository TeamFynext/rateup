import { FastifyReply, FastifyRequest } from "fastify";
import { getLoyaltyDashboardStats } from "./dashboard.service.js";

export const getLoyaltyDashboardStatsHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const orgId = req.user.orgId;
    const response = await getLoyaltyDashboardStats(orgId);
    res.code(200).send(response);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.code(500).send("Internal Server Error");
  }
};
