import { FastifyRequest, FastifyReply } from "fastify";
import {
  deleteWebhook,
  getWebhook,
  getWebhookSigningSecret,
  rotateWebhookSecret,
  updateWebhookEvents,
  upsertWebhook,
  verifyWebhookUrl,
} from "./webhook.service.js";
import type { SaveWebhookInput, UpdateWebhookEventsInput } from "./webhook.schema.js";

export async function saveWebhookHandler(
  req: FastifyRequest<{ Body: SaveWebhookInput }>,
  rep: FastifyReply,
) {
  const { orgId } = req.user;
  const { url, events, verifyToken } = req.body;

  if (!verifyToken) {
    return rep.code(400).send({ message: "verifyToken is required" });
  }

  const verified = await verifyWebhookUrl(url, verifyToken);
  if (!verified) {
    return rep.code(400).send({ message: "Webhook URL challenge verification failed" });
  }

  const webhook = await upsertWebhook(orgId, url, events);
  rep.send(webhook);
}

export async function getWebhookHandler(req: FastifyRequest, rep: FastifyReply) {
  const { orgId } = req.user;
  const webhook = await getWebhook(orgId);
  rep.send(webhook ?? null);
}

export async function deleteWebhookHandler(req: FastifyRequest, rep: FastifyReply) {
  const { orgId } = req.user;
  await deleteWebhook(orgId);
  rep.send({ success: true });
}

/** Changes what is sent without moving the endpoint, so no new challenge is needed. */
export async function updateWebhookEventsHandler(
  req: FastifyRequest<{ Body: UpdateWebhookEventsInput }>,
  rep: FastifyReply,
) {
  const webhook = await updateWebhookEvents(req.user.orgId, req.body.events);
  if (!webhook) return rep.code(404).send({ message: "No webhook is set up" });
  rep.send(webhook);
}

/** The signing secret, for the receiver to verify `X-Rateup-Signature` with. */
export async function getWebhookSecretHandler(req: FastifyRequest, rep: FastifyReply) {
  const secret = await getWebhookSigningSecret(req.user.orgId);
  if (!secret) return rep.code(404).send({ message: "No webhook is set up" });
  rep.send({ secret });
}

export async function rotateWebhookSecretHandler(req: FastifyRequest, rep: FastifyReply) {
  const secret = await rotateWebhookSecret(req.user.orgId);
  if (!secret) return rep.code(404).send({ message: "No webhook is set up" });
  rep.send({ secret });
}
