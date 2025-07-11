import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";
import { updateUsageStatsTemplateMessageCount } from "./update.service";

export async function updateUsageStatsTemplateMessageHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateUsageStatsTemplateMessageCount();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
