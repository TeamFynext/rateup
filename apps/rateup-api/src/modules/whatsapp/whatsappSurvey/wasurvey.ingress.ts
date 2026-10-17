import type { FastifyReply, FastifyRequest } from "fastify";

import {
  isKafkaProducerConnected,
  producer,
  reconnectKafkaProducerInBackground,
} from "../../../plugins/kafka.js";
import type { WaMessageBody } from "../../../types/whatsapp.types.js";
import { log } from "../../../utils/logger.js";
import {
  buildWaWebhookRecords,
  WA_WEBHOOK_TOPIC,
  type WaWebhookRecord,
} from "./waWebhookRecords.js";
import { processWhatsappWebhook } from "./wasurvey.webhook.js";

/**
 * `kafka` (default): the route only accepts the delivery — signature checked by
 * the preHandler, records published to `wa-webhooks`, then 200. The `kafka`
 * service does the work (`waWebhook.consumer.ts`). A 200 therefore means the
 * delivery is durably in Kafka; anything short of that answers 5xx and Meta
 * retries it.
 *
 * `inline`: the old behaviour, for falling back while the consumer or the broker
 * is broken — answer 200 at once and process in this request. A crash or deploy
 * mid-request loses the delivery, as it always did, but nothing waits on Kafka.
 */
type IngressMode = "kafka" | "inline";

function ingressMode(): IngressMode {
  return process.env.WA_WEBHOOK_INGRESS === "inline" ? "inline" : "kafka";
}

/**
 * How long to wait for the broker before giving up and letting Meta retry. Meta
 * treats a slow answer as a failure too; well under its timeout, so a hung broker
 * produces a clean 503 rather than a dropped connection.
 */
function produceTimeoutMs() {
  const configured = Number(process.env.WA_WEBHOOK_PRODUCE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 8_000;
}

/** Publish every record, or throw. All or nothing as far as Meta is concerned. */
export async function publishWaWebhookRecords(records: WaWebhookRecord[]) {
  if (!isKafkaProducerConnected()) {
    reconnectKafkaProducerInBackground();
    throw new Error("Kafka producer is not connected");
  }
  const timeoutMs = produceTimeoutMs();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Publishing to ${WA_WEBHOOK_TOPIC} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  const receivedAt = new Date().toISOString();
  try {
    await Promise.race([
      producer.send({
        topic: WA_WEBHOOK_TOPIC,
        // Every in-sync replica, so a 200 to Meta survives losing the leader.
        acks: -1,
        timeout: timeoutMs,
        messages: records.map((record) => ({
          key: record.key,
          value: record.value,
          headers: { "received-at": receivedAt },
        })),
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** The bytes Meta signed — the record value, so nothing is lost to a re-serialization. */
function rawBodyOf(request: FastifyRequest): string | undefined {
  const raw = (request as FastifyRequest & { rawBody?: string | Buffer }).rawBody;
  if (raw === undefined) return undefined;
  return typeof raw === "string" ? raw : raw.toString("utf8");
}

/** POST handler for the WhatsApp Business webhook. Answers on every path. */
export async function whatsappWebhookIngressHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as WaMessageBody;

  if (ingressMode() === "inline") {
    reply.code(200).send();
    try {
      await processWhatsappWebhook(body);
    } catch (error) {
      log.error({ err: error }, "Error processing a WhatsApp webhook inline");
    }
    return reply;
  }

  let records: WaWebhookRecord[];
  try {
    records = buildWaWebhookRecords(body, rawBodyOf(request));
  } catch (error) {
    // A body we cannot even cut up will not get better on a retry.
    log.error({ err: error, body }, "Could not read a WhatsApp webhook delivery; dropped");
    return reply.code(200).send();
  }

  if (!records.length) {
    log.trace("WhatsApp webhook delivery with no changes: %o", body);
    return reply.code(200).send();
  }

  try {
    await publishWaWebhookRecords(records);
  } catch (error) {
    log.error(
      { err: error, records: records.length },
      "Could not hand a WhatsApp webhook delivery to Kafka; answering 503 so Meta retries",
    );
    return reply.code(503).send();
  }

  return reply.code(200).send();
}
