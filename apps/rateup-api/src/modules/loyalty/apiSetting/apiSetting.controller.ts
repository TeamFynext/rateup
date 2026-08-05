import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  LApiSettingIdInput,
  LApiSettingInput,
  UpdateApiSettingInput,
} from "./apiSetting.schema.js";
import {
  createLoyaltyApiSetting,
  getLoyaltyApiSettingById,
  getLoyaltyApiSettings,
  updateLoyaltyApiSetting,
} from "./apiSetting.service.js";

export async function getLoyaltyApiSettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const res = await getLoyaltyApiSettings(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyApiSettingByIdHandler(
  request: FastifyRequest<{ Params: LApiSettingIdInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { id } = request.params;
    const res = await getLoyaltyApiSettingById(id, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function createLoyaltyApiSettingHandler(
  request: FastifyRequest<{ Body: LApiSettingInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const body = request.body;
    const res = await createLoyaltyApiSetting(body, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function updateLoyaltyApiSettingHandler(
  request: FastifyRequest<{
    Body: UpdateApiSettingInput;
    Params: LApiSettingIdInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { id } = request.params;
    const body = request.body;
    const res = await updateLoyaltyApiSetting(id, body, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
