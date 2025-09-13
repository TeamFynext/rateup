import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import { handleSupportUserWebhook } from "./support-user.service";
import { WaMessageBody } from "../../../types/whatsapp.types";
import { ExtCreateContactSchema } from "../../external/v1/contact/contact.external.schema";
import { PlatformType } from "../../../../generated/prisma/enums";
import { getOrCreateContactByPhone } from "../../contact/contact.service";

export async function supportUserWebhookEventHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    log.trace(`recieved support user webhook => %o`, request.body);
    if ((request.body as any).object !== "support_user") {
      return reply.code(200).send();
    }
    reply.code(200).send();
    const data = request.body as WaMessageBody;
    await handleSupportUserWebhook(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send();
  }
}

export async function getOrCreateContactHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { phone, ...rest } = request.body as ExtCreateContactSchema;
  const body = {
    other: phone,
    source: PlatformType.WEBCHAT,
    ...rest,
  };
  const contact = await getOrCreateContactByPhone(
    phone,
    request.user.orgId,
    body,
    PlatformType.WEBCHAT,
  );
  reply.code(200).send(contact?.id);
}
