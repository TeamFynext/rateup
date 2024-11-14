import { FastifyReply, FastifyRequest } from "fastify";
import { getLoyaltyRedeems } from "./redeem.service";
import { log } from "../../../../../../../utils/logger";

export async function getLoyaltyRedeemsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const redeems = await getLoyaltyRedeems(request.user.orgId);
    reply.code(200).send(redeems);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
