import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request.js";
import {
  ApiKeyAlreadyExistsError,
  createApiKey,
  deleteApiKey,
  getApiKeyCreatedAt,
  regenerateApiKey,
} from "./apiAccessToken.service.js";

export async function createApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  try {
    const apiKey = await createApiKey(orgId);
    rep.code(201).send({ apiKey });
  } catch (error) {
    if (error instanceof ApiKeyAlreadyExistsError) {
      rep.code(409).send({
        message: error.message,
        error: "Use POST /regenerate to replace it",
      });
      return;
    }
    throw error;
  }
}

export async function deleteApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  await deleteApiKey(orgId);
  rep.code(204).send();
}

export async function getApiAccessTokenCreatedAtHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const date = await getApiKeyCreatedAt(orgId);
  rep.send({ exists: Boolean(date), createdAt: date ?? null });
}

export async function regenerateApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const apiKey = await regenerateApiKey(orgId);
  rep.send({ apiKey });
}
