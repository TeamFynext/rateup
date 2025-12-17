import { FastifyReply, FastifyRequest } from "fastify";
import { getUsageStat } from "./stats.service.js";
import Session from "supertokens-node/recipe/session/index.js";
import { getOrgIdAndRole } from "../user/user.service.js";

export async function getUsageStatHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    const { orgId } = await getOrgIdAndRole({ id: userId });

    const stat = await getUsageStat(orgId);
    reply.code(200).send(stat);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ message: e.message });
  }
}
