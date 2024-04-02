import { FastifyReply, FastifyRequest } from "fastify";
import {
  createWaSettingsInput,
  updateWaSettingsInput,
} from "./wa_settings.schema";
import { getOrgIdAndRole } from "../../user/user.service";
import { Role } from "../../org/org.services";
import {
  createWaSettings,
  deleteWaSettings,
  getWaSettings,
  updateWaSettings,
  upsertWaSettings,
} from "./wa_settings.service";
import { getPhoneDetails } from "../auth/wa_auth.service";
import { WaConfigType } from "../../../types/enums";

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
  const org = await getOrgIdAndRole({ id: req.userId });
  const waSettings = await getWaSettings(org.orgId);
  if (!waSettings) {
    return res.status(204).send();
  }
  return res.status(200).send(waSettings);
}

export async function updateWaSettingsHandler(
  req: FastifyRequest<{ Body: updateWaSettingsInput }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
  const waSettings = await updateWaSettings(org.orgId, req.body);
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
  const waSettings = await upsertWaSettings(org.orgId, req.body);
  return res.status(200).send(waSettings);
}

export async function deleteWaSettingsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }

  await deleteWaSettings(req.user.orgId);
  return res.status(200).send();
}
