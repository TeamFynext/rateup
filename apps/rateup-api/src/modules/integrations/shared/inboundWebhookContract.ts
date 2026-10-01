import type { FastifyRequest } from "fastify";

/**
 * What a provider needs from the shared receiver (`inboundWebhook.ts`), kept
 * apart from it: the receiver imports the provider registry, so a provider
 * importing the receiver itself closes a loop through every other provider.
 */

/**
 * Thrown by a provider's `handleInbound` when a delivery fails verification — a
 * bad or missing signature, a stale timestamp. Answered 401.
 */
export class InboundWebhookRejected extends Error {}

/** A request as `handleInbound` receives it: parsed body plus the exact bytes sent. */
export type InboundWebhookRequest = FastifyRequest & { rawBody?: string };

/** Where a provider tells the remote side to deliver, for its connect flow. */
export function inboundWebhookUrl(provider: string, integrationId: string) {
  return `${process.env.API_URL ?? ""}/api/public/integrations/webhooks/${provider}/${integrationId}`;
}
