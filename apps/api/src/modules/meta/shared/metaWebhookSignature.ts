import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyRawBody from "fastify-raw-body";

import { log } from "../../../utils/logger.js";
import { isNonProductionRuntime } from "../../../utils/meta.js";
import { isRequestSignatureValid } from "../whatsapp/encryption/encryption.utils.js";

type SignatureMode = "off" | "log" | "enforce";

/**
 * `enforce` unless told otherwise: an unsigned or mis-signed delivery is answered 401
 * and never processed. Anyone who knows the URL could otherwise inject inbound
 * messages, statuses and account events.
 *
 * `log` (process, but warn) and `off` stay available as a rollback: enforcing against
 * the wrong app secret refuses every real delivery. Meta retries a 401 for a while, so
 * switching back to `log` recovers what was refused in the meantime. Anything other
 * than `log` or `off` — including a typo — enforces, and so does `off` outside a
 * development runtime (`isNonProductionRuntime`).
 */
export function signatureMode(
  env: Record<string, string | undefined> = process.env,
): SignatureMode {
  const mode = env.META_WEBHOOK_SIGNATURES?.trim().toLowerCase();
  if (mode === "log") return mode;
  // `off` skips the check for every tenant; only a development runtime may do that.
  if (mode === "off") return isNonProductionRuntime(env) ? "off" : "enforce";
  return "enforce";
}

let reported = false;

/** Once per process, at route registration: anything but `enforce` is worth an alarm. */
function reportSignatureMode() {
  if (reported) return;
  reported = true;
  const requested = process.env.META_WEBHOOK_SIGNATURES?.trim().toLowerCase();
  const mode = signatureMode();
  if (requested === "off" && mode === "enforce") {
    log.error(
      "META_WEBHOOK_SIGNATURES=off is refused outside development; Meta webhook signatures are enforced",
    );
  } else if (mode !== "enforce") {
    log.error(
      { mode },
      "Meta webhook signatures are NOT enforced: unsigned deliveries are processed for every tenant",
    );
  }
}

/** The raw body the signature is computed over; a re-serialized one would not match. */
export async function registerMetaWebhookRawBody(server: FastifyInstance) {
  reportSignatureMode();
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
