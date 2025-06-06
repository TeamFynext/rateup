import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByWaSettingsIdParamsSchema,
  ContactTagSchema,
  createWaSettingsInput,
  PaginationQuery,
  updateWaSettingsInput,
} from "./wa_settings.schema";
import { getOrgIdAndRole } from "../../user/user.service";
import { Role } from "../../org/org.services";
import {
  createWaSettings,
  deleteWaSettings,
  getAllWaSettings,
  getContactTag,
  getWaLogs,
  getWaSettings,
  updateContactTag,
  updateWaSettings,
  upsertWaSettings,
} from "./wa_settings.service";
import { getPhoneDetails } from "../auth/wa_auth.service";
import { WaConfigType } from "../../../types/enums";
import { log } from "../../../utils/logger";

export async function createWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
  const waSettings = await createWaSettings(org.orgId, {
    accessToken: req.body.accessToken,
    wabaId: req.body.wabaId,
    phoneId: req.body.phoneId,
    appId: req.body.appId,
    type: WaConfigType.Manual,
  });
  return res.status(200).send(waSettings);
}

export async function getWaSettingsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const waSettings = await getAllWaSettings(orgId);
  if (!waSettings?.length) {
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
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
  const waSettings = await updateWaSettings(
    org.orgId,
    req.body?.phoneId,
    req.body,
  );
  return res.status(200).send(waSettings);
}

export async function upsertWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
  const waSettings = await upsertWaSettings(
    org.orgId,
    req.body?.phoneId,
    req.body,
  );
  return res.status(200).send(waSettings);
}

export async function deleteWaSettingsHandler(
  req: FastifyRequest<{
    Params: ByWaSettingsIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }

  await deleteWaSettings(req.user.orgId, req.params.phoneId);
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
    log.error("Error while getting contact tags", error);
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
    log.error("Error while updating contact tags", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getWaLogsHandler(
  request: FastifyRequest<{
    Querystring: PaginationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getWaLogs(orgId, request.query);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting wa logs", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}
