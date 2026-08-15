import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import prisma from "../../utils/prisma.js";
import { outgoingWebhookQueue } from "../../workers/bullmq/queues/index.js";
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
  return prisma.webhook.deleteMany({ where: { orgId } });
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const ip = address.toLowerCase();
    if (ip === "::" || ip === "::1") return true;
    // Unique-local (fc00::/7) and link-local (fe80::/10).
    if (/^f[cd]/.test(ip) || /^fe[89ab]/.test(ip)) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    return mapped ? isPrivateAddress(mapped[1]!) : false;
  }
  const [a, b] = address.split(".").map(Number);
  if (a === undefined || b === undefined) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return a >= 224; // multicast and reserved
}

/**
 * Resolves the host and refuses anything that is not a public address.
 *
 * The verification fetch used to accept any well-formed https URL, so an
 * authenticated user could make the server issue a GET to a host of their
 * choosing from inside the network — and the 200/400 answer, plus the 5-second
 * timeout, separated "reachable and echoed" from "refused" from "hung", which is
 * enough to sweep internal hostnames and ports from the outside.
 */
async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error(`Refusing to fetch a non-https webhook URL: ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length) {
    throw new Error(`Webhook host did not resolve: ${host}`);
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(`Refusing to fetch a private address: ${address}`);
    }
  }
  return url;
}

export async function verifyWebhookUrl(url: string, verifyToken: string): Promise<boolean> {
  try {
    const target = await assertPublicUrl(url);
    target.searchParams.set("challenge", verifyToken);

    const res = await fetch(target, {
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
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
  await outgoingWebhookQueue.add(
    "dispatch",
    {
      phoneId,
      event,
      payload,
    } satisfies OutgoingWebhookJobData,
    {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 1 },
    },
  );
}
