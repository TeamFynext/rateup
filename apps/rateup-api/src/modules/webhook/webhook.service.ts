import prisma from "../../utils/prisma.js";
import { outgoingWebhookQueue } from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

export async function upsertWebhook(orgId: string, url: string, events: string[]) {
  return prisma.webhook.upsert({
    where: { orgId },
    update: { url, events },
    create: { orgId, url, events },
  });
}

export async function getWebhook(orgId: string) {
  return prisma.webhook.findUnique({ where: { orgId } });
}

export async function deleteWebhook(orgId: string) {
  return prisma.webhook.delete({ where: { orgId } });
}

export async function verifyWebhookUrl(url: string, verifyToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}?challenge=${encodeURIComponent(verifyToken)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.trim() === verifyToken;
  } catch (err) {
    log.warn({ url, err }, "Webhook URL verification failed");
    return false;
  }
}

export interface OutgoingWebhookJobData {
  phoneId: string;
  event: string;
  payload: Record<string, unknown>;
}

export async function enqueueWebhookDispatch(
  phoneId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  await outgoingWebhookQueue.add("dispatch", {
    phoneId,
    event,
    payload,
  } satisfies OutgoingWebhookJobData);
}
