import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyRawBody from "fastify-raw-body";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { getIntegrationProvider } from "../providers/registry.js";

import { InboundWebhookRejected, type InboundWebhookRequest } from "./inboundWebhookContract.js";

// Providers import these from `inboundWebhookContract.ts`; re-exported for the
// callers that already take them from here.
export { InboundWebhookRejected, inboundWebhookUrl } from "./inboundWebhookContract.js";
export type { InboundWebhookRequest } from "./inboundWebhookContract.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Params {
  provider: string;
  integrationId: string;
}

/**
 * The one receiver for provider → Rateup webhooks. The integration id in the
 * path names whose delivery it is; the provider's `handleInbound` then proves
 * it, by verifying the signature against that integration's own secret, and
 * enqueues the work so the provider gets its 200 quickly.
 *
 * Every lookup failure answers the same 404: a receiver that says whether an id
 * exists, or which provider it belongs to, is an oracle for guessing them.
 *
 * GetLead keeps the receiver it had: its URL is registered at the provider, and
 * moving it would need every org to reconnect. Zoho moved here without one,
 * because its scheduled refresh re-registers every channel anyway; its old
 * address forwards here until that has happened.
 */
export async function receiveInboundWebhook(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
  lookupProvider: (name: string) => IntegrationProvider | undefined = getIntegrationProvider,
) {
  const { provider: name, integrationId } = request.params;
  const provider = lookupProvider(name);

  const integration =
    provider?.handleInbound && UUID.test(integrationId)
      ? await prisma.integration.findUnique({ where: { id: integrationId } })
      : null;

  if (!provider?.handleInbound || !integration?.active || integration.name !== provider.name) {
    return reply.code(404).send({ error: "Not found" });
  }

  try {
    await provider.handleInbound(integration, request as InboundWebhookRequest);
  } catch (error) {
    if (error instanceof InboundWebhookRejected) {
      log.warn(
        "Rejected a %s delivery for integration %s: %s",
        provider.label,
        integration.id,
        error.message,
      );
      return reply.code(401).send({ error: "Unauthorized" });
    }
    // Anything else is ours. A 5xx asks the provider to retry, which is right
    // for a queue that was briefly unreachable.
    log.error({ err: error, integrationId: integration.id }, "%s delivery failed", provider.label);
    return reply.code(500).send({ error: "Delivery failed" });
  }

  return reply.code(200).send({ ok: true });
}

/**
 * Mounted under `/api/public/integrations`. The raw body is scoped to this
 * route: a signature has to be checked over the exact bytes that were sent.
 */
export async function inboundWebhookRoutes(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  // WooCommerce pings a new webhook with a plain form post (`webhook_id=…`),
  // which Fastify would otherwise answer 415 before the provider saw it. The app
  // already parses form posts server-wide (`@fastify/formbody` in plugins/index.ts),
  // and Fastify refuses a second parser for a type, so this only stands in where
  // that plugin is not registered — a bare server, as in the tests.
  if (!server.hasContentTypeParser("application/x-www-form-urlencoded")) {
    server.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string" },
      (_request, body, done) => {
        done(null, Object.fromEntries(new URLSearchParams(String(body))));
      },
    );
  }

  server.post<{ Params: Params }>(
    "/:provider/:integrationId",
    { config: { rawBody: true } },
    (request, reply) => receiveInboundWebhook(request, reply),
  );
}
