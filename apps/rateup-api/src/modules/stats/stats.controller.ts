import { FastifyReply, FastifyRequest } from "fastify";
import { getUsageStat } from "./stats.service";
import Session from "supertokens-node/recipe/session";
import { getOrgIdAndRole } from "../user/user.service";

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
