import { FastifyReply, FastifyRequest } from "fastify";
import {
  addToken,
  addVoipToken,
  deleteTokenByUserId,
  deleteVoipToken,
  getTokensByUserId,
} from "./mobile.service.js";
import { AddExpoTokenSchema, DeleteExpoTokenSchema, VoipTokenSchema } from "./mobile.schema.js";
import { log } from "../../../utils/logger.js";

export async function addExpoToken(
  request: FastifyRequest<{ Body: AddExpoTokenSchema }>,
  reply: FastifyReply,
) {
  const { userId, orgId } = request.user;
  const { expoToken, platform } = request.body;

  if (!userId) {
    reply.status(401).send({ error: "Missing user" });
    return;
  }
  try {
    await addToken(expoToken, userId, orgId, platform);
    reply.status(201).send({ ok: "Token registered" });
  } catch (e) {
    log.error({ err: e, userId, orgId }, "Failed to register Expo token");
    reply.status(500).send({ error: "Failed to register token" });
  }
}

export async function getExpoTokens(request: FastifyRequest, reply: FastifyReply) {
  const { userId, orgId } = request.user;
  if (!userId) {
    reply.status(401).send({ error: "Missing user" });
    return;
  }
  try {
    const tokens = await getTokensByUserId(userId, orgId);
    return tokens;
  } catch {
    reply.status(500).send({ error: "Failed to fetch tokens" });
  }
}

export async function deleteToken(
  request: FastifyRequest<{ Body: DeleteExpoTokenSchema }>,
  reply: FastifyReply,
) {
  const { userId } = request.user;
  const { expoToken } = request.body;
  if (!userId) {
    reply.status(401).send({ error: "Missing user" });
    return;
  }
  try {
    const token = await deleteTokenByUserId(userId, expoToken);
    reply.status(200).send({ ok: "Token deleted", token: token });
  } catch {
    reply.status(500).send({ error: "Failed to delete tokens" });
  }
}

export async function addVoipTokenHandler(
  request: FastifyRequest<{ Body: VoipTokenSchema }>,
  reply: FastifyReply,
) {
  const { userId, orgId } = request.user;
  if (!userId) {
    reply.status(401).send({ error: "Missing user" });
    return;
  }
  try {
    await addVoipToken(request.body.token, userId, orgId);
    reply.status(201).send({ ok: "VoIP token registered" });
  } catch (e) {
    log.error({ err: e, userId, orgId }, "Failed to register VoIP token");
    reply.status(500).send({ error: "Failed to register token" });
  }
}

export async function deleteVoipTokenHandler(
  request: FastifyRequest<{ Body: VoipTokenSchema }>,
  reply: FastifyReply,
) {
  const { userId } = request.user;
  if (!userId) {
    reply.status(401).send({ error: "Missing user" });
    return;
  }
  try {
    await deleteVoipToken(request.body.token, userId);
    reply.status(204).send();
  } catch (e) {
    log.error({ err: e, userId }, "Failed to delete VoIP token");
    reply.status(500).send({ error: "Failed to delete token" });
  }
}
