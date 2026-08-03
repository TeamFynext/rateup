import { FastifyReply, FastifyRequest } from "fastify";
import { addToken, deleteTokenByUserId, getTokensByUserId } from "./mobile.service.js";
import { AddExpoTokenSchema, DeleteExpoTokenSchema } from "./mobile.schema.js";
import { log } from "../../utils/logger.js";

export async function addExpoToken(
  request: FastifyRequest<{ Body: AddExpoTokenSchema }>,
  reply: FastifyReply,
) {
  const { userId, orgId } = request.user;
  const { expoToken } = request.body;

  if (!userId) {
    reply.status(401).send({ error: "Missing user" });
    return;
  }
  try {
    await addToken(expoToken, userId, orgId);
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
