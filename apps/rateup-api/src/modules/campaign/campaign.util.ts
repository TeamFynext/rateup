import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../utils/prisma.js";
import { enforceWhatsappCountLimit } from "../../utils/subscriptionLimit.js";

export async function verifyCampaignMaxLimit(request: FastifyRequest, reply: FastifyReply) {
  return await enforceWhatsappCountLimit(request, reply, {
    label: "campaigns",
    count: (orgId) => prisma.campaign.count({ where: { team: { orgId } } }),
  });
}
