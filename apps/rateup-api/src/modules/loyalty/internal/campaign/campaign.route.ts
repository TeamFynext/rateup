import { FastifyInstance } from "fastify";
import { checkSession } from "../../../../utils/checkSession";
import {
  createCampaignHandler,
  deleteCampaignHandler,
  getCampaignByIdHandler,
  getCampaignParticipantsHandler,
  getCampaignsHandler,
  getInsightsHandler,
  getLoyaltyCampaignInsightsHandler,
  registerCampaignHandler,
  updateCampaignHandler,
} from "./campaign.controller";

export async function loyaltyCampaignRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  // TODO: auth
  server.get("/", getCampaignsHandler);
  server.get("/:campaignId", getCampaignByIdHandler);
  server.post("/", createCampaignHandler);
  server.put("/:campaignId", updateCampaignHandler);
  server.delete("/:campaignId", deleteCampaignHandler);

  server.post("/:campaignId/register", registerCampaignHandler);
  server.get("/:campaignId/participants", getCampaignParticipantsHandler);
  server.get("/:campaignId/insights", getLoyaltyCampaignInsightsHandler);
  server.get("/insights", getInsightsHandler);
}
