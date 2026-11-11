import { randomUUID } from "node:crypto";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { outgoingWebhookQueue } from "../../../workers/bullmq/queues/index.js";
import type { EnvelopeWebhookEventName } from "./webhook.schema.js";

/**
 * Envelope events: `{ id, type, createdAt, orgId, data }`, posted to the org's
 * `Webhook` and signed like every other delivery (`deliverOutgoingWebhook`).
 *
 * Safe to import from all three services. It only enqueues — the API's request
 * paths, the loyalty ledger and the kafka status consumer call it, and the
 * bullmq service delivers.
 */

export interface WebhookEnvelope<T = Record<string, unknown>> {
  /** Also the BullMQ job id and the `X-Webhook-Id` header, so a receiver can drop a repeat. */
  id: string;
  type: EnvelopeWebhookEventName;
  createdAt: string;
  orgId: string;
  data: T;
}

export function buildWebhookEnvelope<T extends Record<string, unknown>>(
  orgId: string,
  type: EnvelopeWebhookEventName,
  data: T,
  now: Date = new Date(),
): WebhookEnvelope<T> {
  return { id: randomUUID(), type, createdAt: now.toISOString(), orgId, data };
}

/** Five tries with exponential backoff — shared by every org-webhook delivery. */
export const OUTGOING_WEBHOOK_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { count: 1 },
};

// ---------------------------------------------------------------------------
// Subscription lookup, cached in-process
// ---------------------------------------------------------------------------

/**
 * How long one process trusts its copy of an org's subscriptions. Short, and
 * one-sided on purpose: a stale "subscribed" only costs a job that delivery
 * drops (it re-reads the row), while a stale "not subscribed" delays a brand-new
 * subscription by at most this long. The API process also drops its copy the
 * moment the settings change (`invalidateWebhookSubscriptions`).
 */
export const SUBSCRIPTION_TTL_MS = 30_000;
const MAX_CACHED_ORGS = 10_000;

const EMPTY: ReadonlySet<string> = new Set();
const cache = new Map<string, { events: ReadonlySet<string>; expiresAt: number }>();
const pending = new Map<string, Promise<ReadonlySet<string>>>();

/** The events the org's webhook subscribes to; empty when it has none. */
export async function getSubscribedEvents(orgId: string): Promise<ReadonlySet<string>> {
  const hit = cache.get(orgId);
  if (hit && hit.expiresAt > Date.now()) return hit.events;

  // Status receipts arrive in bursts per org: one query answers the whole burst.
  const inFlight = pending.get(orgId);
  if (inFlight) return inFlight;

  const load = prisma.webhook
    .findUnique({ where: { orgId }, select: { events: true } })
    .then((row) => {
      const events: ReadonlySet<string> = row?.events.length ? new Set(row.events) : EMPTY;
      if (cache.size >= MAX_CACHED_ORGS) {
        // Insertion order: the oldest entry goes first.
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(orgId, { events, expiresAt: Date.now() + SUBSCRIPTION_TTL_MS });
      return events;
    })
    .finally(() => pending.delete(orgId));
  pending.set(orgId, load);
  return load;
}

/** Forget an org's cached subscriptions (or every org's), after its webhook changed. */
export function invalidateWebhookSubscriptions(orgId?: string) {
  if (orgId) cache.delete(orgId);
  else cache.clear();
}

/**
 * Which org a WhatsApp number belongs to, cached like the subscriptions. A number
 * moving between orgs is rare enough that the same TTL is plenty; a number we do
 * not know is cached too (as `null`), since receipts for it keep coming.
 */
const phoneOrgCache = new Map<string, { orgId: string | null; expiresAt: number }>();

async function orgIdForPhoneId(phoneId: string): Promise<string | null> {
  const hit = phoneOrgCache.get(phoneId);
  if (hit && hit.expiresAt > Date.now()) return hit.orgId;
  const row = await prisma.whatsappSettings.findUnique({
    where: { phoneId },
    select: { orgId: true },
  });
  if (phoneOrgCache.size >= MAX_CACHED_ORGS) {
    const oldest = phoneOrgCache.keys().next().value;
    if (oldest !== undefined) phoneOrgCache.delete(oldest);
  }
  const orgId = row?.orgId ?? null;
  phoneOrgCache.set(phoneId, { orgId, expiresAt: Date.now() + SUBSCRIPTION_TTL_MS });
  return orgId;
}

/**
 * Whether the org behind a WhatsApp number subscribes to `event` — the check
 * `enqueueWebhookDispatch` callers make before queueing, so an org without a
 * webhook costs no job. Delivery still re-reads the row, so this only has to be
 * right enough to skip the obvious no-ops; when the lookup itself fails it says
 * yes and lets delivery decide, since a missing webhook is worse than an extra job.
 */
export async function phoneSubscribesTo(phoneId: string, event: string): Promise<boolean> {
  try {
    const orgId = await orgIdForPhoneId(phoneId);
    if (!orgId) return false;
    return (await getSubscribedEvents(orgId)).has(event);
  } catch (err) {
    log.warn({ err, phoneId, event }, "Webhook subscription lookup failed; queueing anyway");
    return true;
  }
}

// ---------------------------------------------------------------------------
// Emitting
// ---------------------------------------------------------------------------

export interface WebhookEventInput {
  orgId: string;
  type: EnvelopeWebhookEventName;
  /**
   * The payload, or a function producing it. A function runs only when the org
   * is subscribed, so a caller can put a lookup in it and pay for it only then.
   */
  data:
    | Record<string, unknown>
    | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
  createdAt?: Date;
}

/**
 * Queues every event whose org subscribes to its type, as one Redis round trip.
 *
 * Never rejects: an event is a side effect of a write that has already
 * committed, and losing a webhook must not fail that write. Callers on a request
 * path should not await it (`void emitWebhookEvents(...)`).
 *
 * Returns how many events were queued.
 */
export async function emitWebhookEvents(events: readonly WebhookEventInput[]): Promise<number> {
  try {
    if (!events.length) return 0;
    const subscribed = new Map<string, ReadonlySet<string>>();
    for (const orgId of new Set(events.map((e) => e.orgId))) {
      subscribed.set(orgId, await getSubscribedEvents(orgId));
    }

    const envelopes: WebhookEnvelope[] = [];
    for (const event of events) {
      if (!subscribed.get(event.orgId)?.has(event.type)) continue;
      try {
        const data = typeof event.data === "function" ? await event.data() : event.data;
        envelopes.push(buildWebhookEnvelope(event.orgId, event.type, data, event.createdAt));
      } catch (err) {
        log.error({ err, orgId: event.orgId, type: event.type }, "Could not build a webhook event");
      }
    }
    if (!envelopes.length) return 0;

    await outgoingWebhookQueue.addBulk(
      envelopes.map((envelope) => ({
        name: envelope.type,
        data: {
          kind: "envelope" as const,
          orgId: envelope.orgId,
          event: envelope.type,
          envelope,
        },
        opts: { ...OUTGOING_WEBHOOK_JOB_OPTIONS, jobId: envelope.id },
      })),
    );
    return envelopes.length;
  } catch (err) {
    log.error(
      { err, types: [...new Set(events.map((e) => e.type))], count: events.length },
      "Could not queue webhook events",
    );
    return 0;
  }
}

/** One event. Same contract as `emitWebhookEvents`: never rejects, caller need not await. */
export async function emitWebhookEvent(event: WebhookEventInput): Promise<boolean> {
  return (await emitWebhookEvents([event])) > 0;
}

/** For tests. */
export function __resetWebhookSubscriptionCache() {
  cache.clear();
  pending.clear();
}
