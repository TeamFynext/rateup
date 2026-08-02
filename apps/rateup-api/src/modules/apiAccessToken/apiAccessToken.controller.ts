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
    // The correct action in this state is regenerate, and nothing used to say
    // so — the duplicate became a 500. See issues.txt 46.9.
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
  // This used to await the delete and return, sending nothing — so an async
  // Fastify handler resolved without a reply and the request hung until a
  // timeout, by which point the org's key was already gone. The client saw a
  // network error, which is the outcome that most reliably prompts a retry of
  // an operation that already succeeded; the retry then hit P2025 on the
  // missing row and escaped as a 500. See issues.txt 46.7.
  rep.code(204).send();
}

export async function getApiAccessTokenCreatedAtHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const date = await getApiKeyCreatedAt(orgId);
  // `{ createdAt: undefined }` serialises as `{}`, so a client had no way to
  // tell "no key has been minted" from a serialisation quirk — and that is the
  // decision the UI makes when it chooses between "create" and "regenerate".
  // See issues.txt 46.9.
  rep.send({ exists: Boolean(date), createdAt: date ?? null });
}

export async function regenerateApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const apiKey = await regenerateApiKey(orgId);
  rep.send({ apiKey });
}
