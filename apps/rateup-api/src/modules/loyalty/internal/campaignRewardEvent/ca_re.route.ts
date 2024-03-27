import { FastifyInstance } from "fastify/types/instance";
import {
  createCampaignRewardEventHandler,
  getCampaignRewardEvents_ByCampaignIdHandler,
} from "./ca_re.controller";
import { checkSession } from "../../../../utils/checkSession";

export async function LoyaltyCampaign_RewardEvent_Routes(
  server: FastifyInstance,
) {
  server.addHook("preHandler", checkSession);

  server.get("/", getCampaignRewardEvents_ByCampaignIdHandler);
  server.post("/", createCampaignRewardEventHandler);
}
