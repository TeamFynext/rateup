import { createHmac, timingSafeEqual } from "node:crypto";

import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import { hubSpotOAuthConfig } from "./hubspot.auth.js";
import { findIntegrationByPortal } from "./hubspot.connect.js";
import type { HubSpotWebhookEvent } from "./hubspot.types.js";

/**
 * HubSpot → RateUp (step 2.4). A HubSpot app sends every connected account's
 * webhooks to one address, configured once on the app in HubSpot's developer
 * portal: `${API_URL}/api/public/integrations/hubspot/webhooks`, subscribed to
 * contact creation / property change (firstname, lastname, email, phone) /
 * deletion and deal creation / property change (dealname, dealstage, pipeline) /
 * deletion. Each event is routed to its integration by `portalId`.
 */

export const HUBSPOT_INBOUND = "inbound";

/** HubSpot's own limit: a delivery older than this is refused as a possible replay. */
const MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Changes to one record inside this window share a job: a contact edited in
 * HubSpot arrives as one event per property, and the job reads the record whole.
 */
const COALESCE_MS = 10_000;

export type HubSpotObjectType = "contact" | "deal";

export interface HubSpotInboundJobData {
  objectType: HubSpotObjectType;
  objectId: string;
  /** The record was created in HubSpot, not only changed: an unlinked one may be imported. */
  created: boolean;
}

export class HubSpotSignatureError extends Error {}

/**
 * Checks `X-HubSpot-Signature-v3`: base64 HMAC-SHA256, keyed with the app's client
 * secret, over method + the URL HubSpot called + the raw body + the timestamp.
 */
export function verifyHubSpotSignature(input: {
  method: string;
  url: string;
  rawBody: string;
  signature: string | undefined;
  timestamp: string | undefined;
  secret: string | undefined;
  now?: number;
}) {
  const { method, url, rawBody, signature, timestamp, secret, now = Date.now() } = input;
  if (!secret) throw new HubSpotSignatureError("HubSpot client secret is not configured");
  if (!signature || !timestamp) throw new HubSpotSignatureError("Missing signature headers");
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > MAX_AGE_MS) {
    throw new HubSpotSignatureError("Stale or invalid timestamp");
  }
  const expected = createHmac("sha256", secret)
    .update(`${method}${url}${rawBody}${timestamp}`)
    .digest();
  const given = Buffer.from(signature, "base64");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HubSpotSignatureError("Signature does not match");
  }
}

/** The URL HubSpot signed: the public API address plus the path it posted to. */
export function signedUrl(path: string) {
  return `${process.env.API_URL ?? ""}${path}`;
}

function objectTypeOf(subscriptionType: string): HubSpotObjectType | null {
  if (subscriptionType.startsWith("contact.")) return "contact";
  if (subscriptionType.startsWith("deal.")) return "deal";
  return null;
}

/**
 * Queues one job per record per account from a verified delivery. Accounts with
 * no active integration are skipped: an org that disconnected is still in the
 * app's install list until HubSpot catches up.
 */
export async function enqueueHubSpotEvents(events: readonly HubSpotWebhookEvent[]) {
  const byRecord = new Map<string, { portalId: number; data: HubSpotInboundJobData; at: number }>();
  for (const event of events) {
    const objectType = objectTypeOf(event.subscriptionType ?? "");
    if (!objectType || !event.portalId || !event.objectId) continue;
    const key = `${event.portalId}:${objectType}:${event.objectId}`;
    const entry = byRecord.get(key) ?? {
      portalId: event.portalId,
      data: { objectType, objectId: String(event.objectId), created: false },
      at: event.occurredAt ?? Date.now(),
    };
    if (event.subscriptionType.endsWith(".creation")) entry.data.created = true;
    byRecord.set(key, entry);
  }

  const integrations = new Map<number, Awaited<ReturnType<typeof findIntegrationByPortal>>>();
  for (const { portalId, data, at } of byRecord.values()) {
    if (!integrations.has(portalId))
      integrations.set(portalId, await findIntegrationByPortal(portalId));
    const integration = integrations.get(portalId);
    if (!integration?.orgId) {
      log.debug({ portalId }, "HubSpot delivery for an account no org has connected; skipped");
      continue;
    }
    const job: ProviderJobData<HubSpotInboundJobData> = {
      integrationName: IntegratedApps.hubspot,
      triggerKey: HUBSPOT_INBOUND,
      orgId: integration.orgId,
      data,
    };
    const bucket = Math.floor(at / COALESCE_MS);
    await integrationTriggerQueue.add(`hubspot-${HUBSPOT_INBOUND}`, job, {
      // Same record, same window → one job (BullMQ ignores an add whose id exists).
      jobId: `hubspot-in-${integration.id}-${data.objectType}-${data.objectId}-${bucket}${data.created ? "-c" : ""}`,
      delay: COALESCE_MS,
      attempts: 4,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
    });
  }
}

/** The public endpoint's work: verify, then queue. Throws `HubSpotSignatureError` when refused. */
export async function receiveHubSpotWebhook(request: {
  method: string;
  path: string;
  rawBody: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}) {
  const header = (name: string) => {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  verifyHubSpotSignature({
    method: request.method,
    url: signedUrl(request.path),
    rawBody: request.rawBody ?? "",
    signature: header("x-hubspot-signature-v3"),
    timestamp: header("x-hubspot-request-timestamp"),
    secret: hubSpotOAuthConfig.clientSecret,
  });
  const events = Array.isArray(request.body) ? (request.body as HubSpotWebhookEvent[]) : [];
  await enqueueHubSpotEvents(events);
}
