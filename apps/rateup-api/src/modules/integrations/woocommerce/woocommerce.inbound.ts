import { createHmac, timingSafeEqual } from "node:crypto";

import type { Integration } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import {
  InboundWebhookRejected,
  type InboundWebhookRequest,
} from "../shared/inboundWebhookContract.js";
import { readWooCredential, WOO_TOPICS, type WooTopic } from "./woocommerce.types.js";

/** One delivery, as it waits on the queue for its handler. */
export interface WooDeliveryJobData {
  deliveryId: string | null;
  webhookId: string | null;
  payload: Record<string, unknown>;
}

export type WooJobData = ProviderJobData<WooDeliveryJobData> & { triggerKey: WooTopic };

/**
 * Deliveries retry on our side as well as WooCommerce's: its own retries stop
 * after five failures and then disable the webhook, which is worse than a job
 * that waits for a database to come back.
 */
export const WOO_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 30_000 },
  removeOnComplete: { count: 5000 },
  removeOnFail: { count: 5000 },
};

function header(request: InboundWebhookRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** `X-WC-Webhook-Signature`: base64 HMAC-SHA256 of the exact body, keyed with our secret. */
export function isValidWooSignature(rawBody: string, signature: string, secret: string) {
  const expected = Buffer.from(
    createHmac("sha256", secret).update(rawBody, "utf8").digest("base64"),
  );
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * A delivery from the store, through the shared receiver. Verified, then queued,
 * so WooCommerce gets its 200 at once — it counts a slow answer as a failure,
 * and disables the webhook after five.
 *
 * WooCommerce pings a webhook when it is created: a form post of `webhook_id`
 * with no topic and no signature. It carries nothing, so it is answered 200 and
 * dropped — refusing it can make the store refuse to save the webhook.
 */
export async function handleWooInbound(integration: Integration, request: InboundWebhookRequest) {
  const topic = header(request, "x-wc-webhook-topic");
  if (!topic) {
    log.debug("WooCommerce ping for integration %s", integration.id);
    return;
  }

  const credential = readWooCredential(integration.credential);
  const signature = header(request, "x-wc-webhook-signature");
  if (!credential || !signature || request.rawBody === undefined) {
    throw new InboundWebhookRejected("missing signature");
  }
  if (!isValidWooSignature(request.rawBody, signature, credential.webhookSecret)) {
    throw new InboundWebhookRejected("signature mismatch");
  }

  if (!(WOO_TOPICS as readonly string[]).includes(topic)) {
    // A webhook someone added by hand on the store, pointed at our URL.
    log.info("Ignoring WooCommerce topic %s for integration %s", topic, integration.id);
    return;
  }

  const deliveryId = header(request, "x-wc-webhook-delivery-id") ?? null;
  await integrationTriggerQueue.add(
    `woocommerce-${topic}`,
    {
      integrationName: IntegratedApps.woocommerce,
      triggerKey: topic as WooTopic,
      orgId: integration.orgId ?? "",
      data: {
        deliveryId,
        webhookId: header(request, "x-wc-webhook-id") ?? null,
        payload: (request.body ?? {}) as Record<string, unknown>,
      },
    } satisfies WooJobData,
    {
      ...WOO_JOB_OPTIONS,
      // A redelivery of the same delivery collapses onto the job already queued.
      ...(deliveryId && { jobId: `woo-${integration.id}-${deliveryId}` }),
    },
  );
}
