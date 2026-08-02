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

/*
 * Every catch in this file used to be `reply.code(500).send(e)` — the Error object
 * itself. An Error has no enumerable own properties, so that serialises to `{}`:
 * the client got a 500 with an empty body and no message, and could not tell a
 * validation failure from a database outage. Every other controller in the module
 * sends `{ error: e.message }`. See issues.txt 20.43.
 */

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
    // This handler used to not read `request.user` at all. See issues.txt 20.43.
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
