import { FastifyReply, FastifyRequest } from "fastify";
import { getUsageStat } from "./stats.service.js";
import Session from "supertokens-node/recipe/session/index.js";
import { getOrgIdAndRole } from "../user/user.service.js";

export async function getUsageStatHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    const user = await getOrgIdAndRole({ id: userId });
    if (!user) {
      throw new Error("User not found");
    }

    const stat = await getUsageStat(user.orgId);
    reply.code(200).send(stat);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ message: e instanceof Error ? e.message : "Unknown error" });
  }
}
