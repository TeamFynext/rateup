import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { handleSupportUserWebhook } from "./support-user.service.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getOrCreateContactByPhone } from "../../contact/contact.service.js";
import { ExtCreateContactSchema } from "../../../external/v1/contact-groups/contact.external.schema.js";

export async function supportUserWebhookEventHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    log.trace({ body: request.body }, "recieved support user webhook");
    if ((request.body as { object?: string } | undefined)?.object !== "support_user") {
      return reply.code(200).send();
    }
    reply.code(200).send();
    const data = request.body as WaMessageBody;
    await handleSupportUserWebhook(data);
  } catch (e) {
    log.error(e);
    if (!reply.sent) {
      reply.code(500).send();
    }
  }
}

export async function getOrCreateContactHandler(request: FastifyRequest, reply: FastifyReply) {
  const { phone, ...rest } = request.body as ExtCreateContactSchema;
  const body = {
    other: phone,
    source: PlatformType.WEBCHAT,
    ...rest,
  };
  const { contact } = (await getOrCreateContactByPhone(
    phone!,
    request.user.orgId,
    body,
    PlatformType.WEBCHAT,
    true,
  ))!;
  reply.code(200).send(contact?.id);
}
