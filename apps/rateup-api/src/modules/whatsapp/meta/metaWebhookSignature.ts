import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyRawBody from "fastify-raw-body";

import { log } from "../../../utils/logger.js";
import { isRequestSignatureValid } from "../encryption/wa_encryption.utils.js";

type SignatureMode = "off" | "log" | "enforce";

/**
 * `log` until production logs show real deliveries passing: enforcing against the wrong
 * app secret would drop every inbound message without a visible error.
 */
function signatureMode(): SignatureMode {
  const mode = process.env.META_WEBHOOK_SIGNATURES;
  return mode === "off" || mode === "enforce" ? mode : "log";
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
