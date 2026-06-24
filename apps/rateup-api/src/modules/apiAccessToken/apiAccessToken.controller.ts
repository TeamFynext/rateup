import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request.js";
import {
  createApiKey,
  deleteApiKey,
  getApiKeyCreatedAt,
  regenerateApiKey,
} from "./apiAccessToken.service.js";

export async function createApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const apiKey = await createApiKey(orgId);
  rep.send({ apiKey });
}

export async function deleteApiAccessTokenHandler(req: FastifyRequest, _rep: FastifyReply) {
  const orgId = req.user.orgId;
  await deleteApiKey(orgId);
}

export async function getApiAccessTokenCreatedAtHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const date = await getApiKeyCreatedAt(orgId);
  rep.send({ createdAt: date });
}

export async function regenerateApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const apiKey = await regenerateApiKey(orgId);
  rep.send({ apiKey });
}
