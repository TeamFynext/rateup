import { FastifyReply, FastifyRequest } from "fastify";
import { getUsageStat } from "./stats.service.js";

export async function getUsageStatHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stat = await getUsageStat(request.user.orgId);
    reply.code(200).send(stat);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ message: e instanceof Error ? e.message : "Unknown error" });
  }
}
