import { FastifyRequest, FastifyReply } from "fastify";
import { deleteWebhook, getWebhook, upsertWebhook, verifyWebhookUrl } from "./webhook.service.js";
import { SaveWebhookInput } from "./webhook.schema.js";

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
