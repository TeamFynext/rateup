import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../utils/prisma.js";
import { enforceWhatsappCountLimit } from "../../utils/subscriptionLimit.js";

/**
 * The third verbatim copy of this gate, after flows (issues.txt 11.7) and
 * templates (14.7) — three files, the same two bugs, the same shape. All four
 * now share enforceWhatsappCountLimit; see its header for what was wrong.
 * See issues.txt 17.2.
 */
export async function verifyCampaignMaxLimit(request: FastifyRequest, reply: FastifyReply) {
  return await enforceWhatsappCountLimit(request, reply, {
    label: "campaigns",
    count: (orgId) => prisma.campaign.count({ where: { team: { orgId } } }),
  });
}
