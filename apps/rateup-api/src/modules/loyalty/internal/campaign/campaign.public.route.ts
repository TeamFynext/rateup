import { FastifyInstance } from "fastify/types/instance";
import { getPublicCampaignByIdHandler } from "./campaign.controller";

export async function loyaltyCampaignPublicRoutes(server: FastifyInstance) {
  server.get("/:campaignId", getPublicCampaignByIdHandler);
}
