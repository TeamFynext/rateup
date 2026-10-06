import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { UnrecoverableError } from "bullmq";
import prisma from "../../utils/prisma.js";
import { outgoingWebhookQueue } from "../../workers/bullmq/queues/index.js";
import { log } from "../../utils/logger.js";
import { getWebhookSecret as getSurveyWebhookSecret } from "../../utils/webhook.js";
import { decryptSecret, encryptSecret } from "../integrations/shared/credentialCrypto.js";

const newSecret = () => `whsec_${randomBytes(32).toString("base64url")}`;

export async function upsertWebhook(orgId: string, url: string, events: string[]) {
  return prisma.webhook.upsert({
    where: { orgId },
    update: { url, events },
    create: { orgId, url, events, secret: encryptSecret(newSecret()) },
    omit: { secret: true },
  });
}

/** The org's webhook without its signing secret, which only `webhooks.manage` may read. */
export async function getWebhook(orgId: string) {
  return prisma.webhook.findUnique({ where: { orgId }, omit: { secret: true } });
}

export async function updateWebhookEvents(orgId: string, events: string[]) {
  const { count } = await prisma.webhook.updateMany({ where: { orgId }, data: { events } });
  return count ? getWebhook(orgId) : null;
}

/**
 * The org's signing secret, in the clear. A webhook saved before signing has
 * none, so the first caller creates it — conditionally, so two callers at once
 * end up with the same secret.
 */
export async function getWebhookSigningSecret(orgId: string): Promise<string | null> {
  const row = await prisma.webhook.findUnique({ where: { orgId }, select: { secret: true } });
  if (!row) return null;
  if (row.secret) return decryptSecret(row.secret);

  await prisma.webhook.updateMany({
    where: { orgId, secret: null },
    data: { secret: encryptSecret(newSecret()) },
  });
  const created = await prisma.webhook.findUnique({ where: { orgId }, select: { secret: true } });
  return created?.secret ? decryptSecret(created.secret) : null;
}

/** Replaces the secret. Deliveries signed with the old one stop verifying at once. */
export async function rotateWebhookSecret(orgId: string): Promise<string | null> {
  const secret = newSecret();
  const { count } = await prisma.webhook.updateMany({
    where: { orgId },
    data: { secret: encryptSecret(secret) },
  });
  return count ? secret : null;
}

/** `X-Rateup-Signature`: base64 HMAC-SHA256 of the exact body sent, as the survey webhook signs. */
export function signWebhookBody(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("base64");
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
export async function assertPublicUrl(rawUrl: string) {
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

/**
 * An outgoing webhook delivery. Message status jobs arrive keyed on the WhatsApp
 * number that sent the message; integration events are keyed on the org. A
 * survey response goes to the URL set on that survey (`kind: "survey"`).
 */
export type OutgoingWebhookJobData =
  | (({ phoneId: string; orgId?: never } | { orgId: string; phoneId?: never }) & {
      kind?: "event";
      event: string;
      payload: Record<string, unknown>;
    })
  | { kind: "survey"; orgId: string; endpoint: string; payload: Record<string, unknown> };

const OUTGOING_WEBHOOK_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { count: 1 },
};

/** Three tries, as the survey webhook always had, now off the respondent's request. */
const SURVEY_WEBHOOK_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: { count: 1 },
};

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
    OUTGOING_WEBHOOK_JOB_OPTIONS,
  );
}

/** Queues a delivery for an org-level event (see `webhook.provider.ts`). */
export async function enqueueOrgWebhookDispatch(
  orgId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  await outgoingWebhookQueue.add(
    "dispatch",
    { orgId, event, payload } satisfies OutgoingWebhookJobData,
    OUTGOING_WEBHOOK_JOB_OPTIONS,
  );
}

/** Queues a survey's response webhook (`Survey.responseWebhookEndpoint`). */
export async function enqueueSurveyResponseWebhook(
  orgId: string,
  endpoint: string,
  payload: Record<string, unknown>,
) {
  await outgoingWebhookQueue.add(
    "survey-response",
    { kind: "survey", orgId, endpoint, payload } satisfies OutgoingWebhookJobData,
    SURVEY_WEBHOOK_JOB_OPTIONS,
  );
}

/** Where a job goes, the body it sends and what signs it; null when nobody should get it. */
async function resolveDelivery(data: OutgoingWebhookJobData) {
  if (data.kind === "survey") {
    return {
      url: data.endpoint,
      body: data.payload,
      secret: await getSurveyWebhookSecret(data.orgId),
      // The survey webhook stopped on a 4xx and retried only a 5xx or no answer.
      retryClientErrors: false,
    };
  }

  // Message status jobs name the sending number; integration events name the org.
  const orgId =
    data.orgId ??
    (
      await prisma.whatsappSettings.findUnique({
        where: { phoneId: data.phoneId },
        select: { orgId: true },
      })
    )?.orgId;
  if (!orgId) return null;

  const webhook = await prisma.webhook.findUnique({
    where: { orgId },
    select: { url: true, events: true },
  });
  if (!webhook?.events.includes(data.event)) return null;

  const secret = await getWebhookSigningSecret(orgId);
  if (!secret) return null;
  return {
    url: webhook.url,
    body: { event: data.event, ...data.payload },
    secret,
    retryClientErrors: true,
  };
}

/**
 * Posts one queued delivery, signed. Runs in `outgoingWebhook.processor.ts`.
 *
 * The address is checked again here, not only when the URL was saved: a host
 * can re-resolve to an internal address later, so redirects are not followed
 * either. A refused address is not retried.
 */
export async function deliverOutgoingWebhook(data: OutgoingWebhookJobData, deliveryId: string) {
  const delivery = await resolveDelivery(data);
  if (!delivery) return;

  try {
    await assertPublicUrl(delivery.url);
  } catch (err) {
    throw new UnrecoverableError(err instanceof Error ? err.message : String(err));
  }

  const body = JSON.stringify(delivery.body);
  log.debug({ url: delivery.url, deliveryId }, "Delivering outgoing webhook");
  const response = await fetch(delivery.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Rateup-Signature": signWebhookBody(delivery.secret, body),
      "X-Rateup-Triggered-At": new Date().toISOString(),
      // The same on every retry, so a receiver can drop a repeat.
      "X-Webhook-Id": deliveryId,
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.ok) return;

  const message = `Webhook POST to ${delivery.url} failed with status ${response.status}`;
  if (!delivery.retryClientErrors && response.status < 500) {
    throw new UnrecoverableError(message);
  }
  throw new Error(message);
}
