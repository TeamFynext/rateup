import { FastifyInstance } from "fastify/types/instance";
import {
  createCampaignRewardEventHandler,
  getCampaignRewards_ByCampaignIdHandler,
} from "./ca_re.controller";
import { checkSession } from "../../../../utils/checkSession";

export async function LoyaltyCampaign_RewardEvent_Routes(
  server: FastifyInstance,
) {
  server.addHook("preHandler", checkSession);

  server.get("/", getCampaignRewards_ByCampaignIdHandler);
  server.post("/", createCampaignRewardEventHandler);
}
