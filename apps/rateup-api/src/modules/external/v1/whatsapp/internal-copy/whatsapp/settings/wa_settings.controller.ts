import { FastifyReply, FastifyRequest } from "fastify";
import {
  ContactTagSchema,
  createWaSettingsInput,
  updateWaSettingsInput,
} from "./wa_settings.schema.js";
import {
  createWaSettings,
  deleteWaSettings,
  getContactTag,
  getWaSettings,
  updateContactTag,
  updateWaSettings,
  upsertWaSettings,
} from "./wa_settings.service.js";
import {
  WaConfigType,
  WhatsappSettingsStatus,
} from "../../../../../../../types/enums.js";
import { log } from "../../../../../../../utils/logger.js";

export async function createWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const orgId = req.user.orgId;
  const waSettings = await createWaSettings(orgId, {
    accessToken: req.body.accessToken,
    wabaId: req.body.wabaId,
    phoneId: req.body.phoneId,
    status: WhatsappSettingsStatus.ACTIVE,
    appId: req.body.appId,
    type: WaConfigType.Manual,
    paymentMethod: "NATIVE",
  });
  return res.status(200).send(waSettings);
}

export async function getWaSettingsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const orgId = req.user.orgId;
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    return res.status(204).send();
  }
  return res.status(200).send(waSettings);
}

export async function updateWaSettingsHandler(
  req: FastifyRequest<{
    Body: updateWaSettingsInput & { encryption?: WaEncryptionKeys };
  }>,
  res: FastifyReply,
) {
  const orgId = req.user.orgId;
  const waSettings = await updateWaSettings(orgId, req.body?.phoneId, req.body);
  return res.status(200).send(waSettings);
}

export async function upsertWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const orgId = req.user.orgId;
  const waSettings = await upsertWaSettings(orgId, req.body?.phoneId, req.body);
  return res.status(200).send(waSettings);
}

export async function deleteWaSettingsHandler(
  req: FastifyRequest<{ Params: { phoneId: string } }>,
  res: FastifyReply,
) {
  await deleteWaSettings(req.user.orgId, req.params?.phoneId);
  return res.status(200).send();
}

export async function getContactTagHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getContactTag(orgId);
    reply.code(200).send(data ?? { contactTags: [] });
  } catch (error) {
    log.error({ err: error }, "Error while getting contact tags");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function updateContactTagHandler(
  request: FastifyRequest<{
    Body: ContactTagSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    await updateContactTag(orgId, request.body.tags);
    reply.code(204).send();
  } catch (error) {
    log.error({ err: error }, "Error while updating contact tags");
    reply.code(500).send({ message: "Something went wrong" });
  }
}
