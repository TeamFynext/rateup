import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import {
  createApiKey,
  deleteApiKey,
  getApiKeyCreatedAt,
  regenerateApiKey,
} from "./lc_apiKey.service";

export async function createLoyaltyApiKeyHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const orgId = req.user.orgId;
  const apiKey = await createApiKey(orgId);
  rep.send({ apiKey });
}

export async function deleteLoyaltyApiKeyHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const orgId = req.user.orgId;
  await deleteApiKey(orgId);
}

export async function getLoyaltyApiKeyCreatedAtHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const orgId = req.user.orgId;
  const date = await getApiKeyCreatedAt(orgId);
  rep.send({ createdAt: date });
}

export async function regenerateLoyaltyApiKeyHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const orgId = req.user.orgId;
  const apiKey = await regenerateApiKey(orgId);
  rep.send({ apiKey });
}
