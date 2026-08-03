import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { log } from "../../utils/logger.js";

/** Meta's webhook envelope: entries, each carrying the fields that changed. */
interface MetaAgentWebhookBody {
  entry?: Array<{
    changes?: Array<{ field?: string; value?: unknown }>;
  }>;
}

export function isMetaWebhookSignatureValid(req: FastifyRequest): boolean {
  const appSecret = process.env.waclient_secret;
  if (!appSecret) {
    log.error("waclient_secret is not set; cannot verify Meta Business Agent webhook signature");
    return false;
  }

  const header = req.headers["x-hub-signature-256"];
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;

  const rawBody = (req as FastifyRequest & { rawBody?: string | Buffer }).rawBody;
  if (rawBody === undefined) {
    log.error("No rawBody on the Meta Business Agent webhook request; check the route config");
    return false;
  }

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(header.slice("sha256=".length), "hex");
  } catch {
    return false;
  }

  // timingSafeEqual throws on a length mismatch, so check that first.
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function metaAgentWebhookEventHandler(req: FastifyRequest, reply: FastifyReply) {
  if (!isMetaWebhookSignatureValid(req)) {
    log.warn(
      { ip: req.ip },
      "Rejected an unsigned or mis-signed Meta Business Agent webhook delivery",
    );
    reply.code(401).send({ message: "Invalid signature" });
    return;
  }

  try {
    const body = req.body as MetaAgentWebhookBody;
    // Debug rather than info: the body is verified now, but it is still a
    // caller-controlled blob and there is one per delivery.
    log.debug({ body }, "Received Meta Business Agent webhook event");

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        log.info(
          { field: change?.field, value: change?.value },
          "Meta Business Agent change notification",
        );
      }
    }

    // 200 on a handling failure is deliberate: the delivery was authentic and
    // there is nothing a Meta retry would fix, since no branch acts on it.
    reply.code(200).send("EVENT_RECEIVED");
  } catch (error) {
    log.error({ err: error }, "Error handling Meta Business Agent webhook event");
    reply.code(200).send("EVENT_RECEIVED");
  }
}
