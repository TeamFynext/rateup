import { FastifyReply, FastifyRequest } from "fastify";
import { addToken, deleteTokenByUserId, getTokensByOrgId } from "./mobile.service.js";
import { AddExpoTokenSchema, DeleteExpoTokenSchema } from "./mobile.schema.js";

export async function addExpoToken(
  request: FastifyRequest<{ Body: AddExpoTokenSchema }>,
  reply: FastifyReply,
) {
  const { userId, orgId } = request.user;
  const { expoToken } = request.body;

  if (!expoToken) {
    reply.status(400).send({ error: "Missing expoToken" });
    return;
  }
  const response = await addToken(expoToken, userId, orgId);
  return response;
}

export async function getExpoTokens(request: FastifyRequest, reply: FastifyReply) {
  const { orgId } = request.user;
  try {
    const tokens = await getTokensByOrgId(orgId);
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
  try {
    const token = await deleteTokenByUserId(userId, expoToken);
    reply.status(200).send({ ok: "Token deleted", token: token });
  } catch {
    reply.status(500).send({ error: "Failed to delete tokens" });
  }
}
