import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyRawBody from "fastify-raw-body";

import { log } from "../../../utils/logger.js";
import { isRequestSignatureValid } from "../encryption/wa_encryption.utils.js";

type SignatureMode = "off" | "log" | "enforce";

/**
 * `enforce` unless told otherwise: an unsigned or mis-signed delivery is answered 401
 * and never processed. Anyone who knows the URL could otherwise inject inbound
 * messages, statuses and account events.
 *
 * `log` (process, but warn) and `off` stay available as a rollback: enforcing against
 * the wrong app secret refuses every real delivery. Meta retries a 401 for a while, so
 * switching back to `log` recovers what was refused in the meantime. Anything other
 * than `log` or `off` — including a typo — enforces.
 */
function signatureMode(): SignatureMode {
  const mode = process.env.META_WEBHOOK_SIGNATURES?.trim().toLowerCase();
  return mode === "off" || mode === "log" ? mode : "enforce";
}

/** The raw body the signature is computed over; a re-serialized one would not match. */
export async function registerMetaWebhookRawBody(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });
}

/** preHandler for the WhatsApp, Instagram and Messenger webhook POSTs. */
export async function verifyMetaWebhookSignature(req: FastifyRequest, reply: FastifyReply) {
  const mode = signatureMode();
  if (mode === "off") return;

  const check = isRequestSignatureValid(req);
  if (check.valid) return;

  log.warn(
    { reason: check.reason, url: req.url, ip: req.ip, mode },
    "Meta webhook delivery failed its signature check",
  );
  if (mode === "enforce") {
    return reply.code(401).send();
  }
}
