import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../../../../utils/logger";
import { processActionWebhook } from "./actions.service";

export async function actionWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await processActionWebhook(request.body, orgId);
    reply.code(200).send({ message: res });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
