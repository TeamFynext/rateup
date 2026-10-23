// WhatsApp Business webhook deliveries, accepted by the API and processed here.
//
// The API's webhook route used to answer Meta 200 and then do all the work in the
// request, so a deploy or crash mid-request lost the delivery and Meta, holding a
// 200, never resent it. Now the route only verifies the signature and publishes
// the delivery to `wa-webhooks` (wasurvey.ingress.ts); a 200 means it is in Kafka.
// This consumer runs the same handling the route used to (wasurvey.webhook.ts).
//
// Ordering: records are keyed by conversation (the customer's wa_id; see
// waWebhookRecords.ts), so one customer's messages are processed one at a time and
// in order. Within a batch, different keys run side by side. Status-only records
// need no ordering here — their receipts are re-ordered by message id on
// `status-events` — so each runs as its own lane; otherwise a big campaign's
// receipts, all keyed by the one sending number, would crawl through one at a time.
//
// Failures never live only in this process's memory. A record that threw becomes
// a delayed BullMQ job (queues/waWebhookRetry.queue.ts) that the bullmq service
// re-publishes to `wa-webhooks` under the same key after `retryDelayMs`; past
// MAX_RETRIES it goes to `wa-webhooks-dlq` with the error and the raw delivery, to
// be replayed by producing the value back to `wa-webhooks`. Both hand-offs happen
// BEFORE any offset in the batch is resolved, and if either throws the batch
// resolves nothing and throws, so Kafka redelivers it. (kafkajs commits whatever
// was resolved even when eachBatch throws, so resolving first would lose them.)
//
// Delivery is therefore at-least-once, and a redelivered batch re-runs the records
// that had succeeded. That is safe for inbound messages and echoes (de-duplicated
// by Meta's message id before they are stored), template status/category and
// account updates (idempotent writes; notifications only fire on a change), and
// thread-owner hand-offs (same owner, same timestamp). What can repeat: a receipt
// re-published to `status-events` and its `message_status` outgoing webhook; a
// payment-capture confirmation; a lead-gen automation; call events.
import { IHeaders, Kafka, KafkaMessage } from "kafkajs";

import { log } from "../../shared/logger.js";
import { kafkaProducerConfig } from "../../../utils/kafka.js";
import {
  WA_WEBHOOK_DLQ_TOPIC,
  WA_WEBHOOK_TOPIC,
} from "../../../modules/whatsapp/whatsappSurvey/waWebhookRecords.js";
import { processWhatsappWebhook } from "../../../modules/whatsapp/whatsappSurvey/wasurvey.webhook.js";
import type { WaMessageBody } from "../../../types/whatsapp.types.js";
import {
  WA_WEBHOOK_RETRY_JOB_OPTIONS,
  waWebhookRetryJobId,
  waWebhookRetryQueue,
  type WaWebhookRetryJobData,
} from "../../bullmq/queues/waWebhookRetry.queue.js";
import { MAX_RETRIES, retryDelayMs } from "./statusRetry.js";

export const GROUP_ID = "wa-webhook-workers";
const RETRY_HEADER = "retry-count";
/** A record that is not JSON will never parse: straight to the DLQ, no retries. */
const UNPARSABLE = new Error("record value is not JSON");

/** Lanes (keys) worked on at once within one batch. */
function laneConcurrency() {
  const configured = Number(process.env.WA_WEBHOOK_LANE_CONCURRENCY);
  return Number.isInteger(configured) && configured > 0 ? configured : 16;
}

/** Partitions worked on at once by this replica. */
function partitionsConcurrently() {
  const configured = Number(process.env.WA_WEBHOOK_PARTITIONS_CONCURRENTLY);
  return Number.isInteger(configured) && configured > 0 ? configured : 4;
}

function headerString(headers: IHeaders | undefined, name: string) {
  const value = headers?.[name];
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined ? undefined : first.toString();
}

function retryCountOf(message: KafkaMessage) {
  const count = Number(headerString(message.headers, RETRY_HEADER));
  return Number.isInteger(count) && count > 0 ? count : 0;
}

/** True when every change only carries delivery statuses — order does not matter for those. */
export function isStatusOnly(body: WaMessageBody) {
  const changes = (body?.entry ?? []).flatMap((entry) => entry?.changes ?? []);
  return (
    changes.length > 0 &&
    changes.every((change) => {
      const value = change?.value as
        | { messages?: unknown[]; message_echoes?: unknown[]; statuses?: unknown[] }
        | undefined;
      return (
        change?.field === "messages" &&
        !value?.messages?.length &&
        !value?.message_echoes?.length &&
        (value?.statuses?.length ?? 0) > 0
      );
    })
  );
}

interface Parsed {
  message: KafkaMessage;
  body: WaMessageBody | null;
  /** Records sharing a lane run one at a time, in offset order. */
  lane: string;
}

function parse(message: KafkaMessage): Parsed {
  const key = message.key?.toString() ?? "";
  try {
    const body = JSON.parse(message.value?.toString() ?? "") as WaMessageBody;
    const lane = isStatusOnly(body) ? `status:${message.offset}` : `key:${key}`;
    return { message, body, lane };
  } catch {
    return { message, body: null, lane: `bad:${message.offset}` };
  }
}

/** Run each lane's records in order, up to `limit` lanes at once. */
async function runLanes<T>(lanes: T[][], limit: number, run: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < lanes.length) {
      const lane = lanes[next++]!;
      for (const item of lane) await run(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, lanes.length) }, worker));
}

/** Kafka headers as plain strings — what a BullMQ job (JSON) can carry. */
function stringHeaders(headers: IHeaders | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of Object.keys(headers ?? {})) {
    const value = headerString(headers, name);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

const reasonOf = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(0, 1_000);

export interface WaWebhookConsumer {
  consumer: ReturnType<Kafka["consumer"]>;
  producer: ReturnType<Kafka["producer"]>;
}

export async function startWaWebhookConsumer(kafka: Kafka): Promise<WaWebhookConsumer> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  // Dead-letters only; retries go through BullMQ.
  const producer = kafka.producer(kafkaProducerConfig());

  producer.on(producer.events.DISCONNECT, async () => {
    log.warn("wa-webhook DLQ producer disconnected, reconnecting...");
    await producer.connect();
  });

  await producer.connect();
  await consumer.connect();
  // From the beginning, unlike status-events: this only applies while the group
  // has no committed offset — its very first start — and every record on the
  // topic then is a delivery the API already answered 200 for. Starting from
  // "latest" would skip whatever arrived before the first replica came up.
  await consumer.subscribe({ topic: WA_WEBHOOK_TOPIC, fromBeginning: true });

  await consumer.run({
    partitionsConsumedConcurrently: partitionsConcurrently(),
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary, heartbeat }) => {
      const retries: { name: string; data: WaWebhookRetryJobData; opts: object }[] = [];
      const dlq: { key: string | null; value: string; headers: Record<string, string> }[] = [];
      let processed = 0;

      const lanes = new Map<string, Parsed[]>();
      for (const message of batch.messages) {
        const parsed = parse(message);
        const lane = lanes.get(parsed.lane) ?? [];
        lane.push(parsed);
        lanes.set(parsed.lane, lane);
      }

      const fail = (message: KafkaMessage, error: unknown) => {
        const retryCount = retryCountOf(message);
        const key = message.key?.toString() ?? null;
        const value = message.value?.toString() ?? "";
        const headers = { ...stringHeaders(message.headers), error: reasonOf(error) };
        if (error === UNPARSABLE || retryCount + 1 > MAX_RETRIES) {
          dlq.push({
            key,
            value,
            headers: {
              ...headers,
              [RETRY_HEADER]: String(retryCount),
              "failed-at": new Date().toISOString(),
            },
          });
          return;
        }
        const nextRound = retryCount + 1;
        retries.push({
          name: "republish",
          data: {
            topic: batch.topic,
            key,
            value,
            headers: { ...headers, [RETRY_HEADER]: String(nextRound) },
            retryCount: nextRound,
          },
          opts: {
            ...WA_WEBHOOK_RETRY_JOB_OPTIONS,
            // Per source record and round, so a batch redelivered after a crash
            // collapses onto the job it already enqueued.
            jobId: waWebhookRetryJobId(batch.topic, batch.partition, message.offset, nextRound),
            delay: retryDelayMs(retryCount),
          },
        });
      };

      await runLanes([...lanes.values()], laneConcurrency(), async ({ message, body }) => {
        if (!body) {
          log.error({ offset: message.offset }, "Unparsable wa-webhook record; dead-lettering");
          fail(message, UNPARSABLE);
        } else {
          try {
            await processWhatsappWebhook(body);
            processed += 1;
          } catch (error) {
            log.error(
              { err: error, offset: message.offset, retryCount: retryCountOf(message) },
              "wa-webhook record failed; it will be retried",
            );
            fail(message, error);
          }
        }
        await heartbeat();
      });

      // Hand failures off durably first. If either step throws, nothing in the
      // batch has been resolved, so Kafka redelivers all of it.
      try {
        if (retries.length) await waWebhookRetryQueue.addBulk(retries);
        if (dlq.length) await producer.send({ topic: WA_WEBHOOK_DLQ_TOPIC, messages: dlq });
      } catch (err) {
        log.error(
          { err, partition: batch.partition, retries: retries.length, dlq: dlq.length },
          "Could not hand off failed wa-webhook records; the batch will be redelivered",
        );
        throw err;
      }

      for (const message of batch.messages) resolveOffset(message.offset);
      await commitOffsetsIfNecessary();

      if (retries.length || dlq.length) {
        log.warn(
          { partition: batch.partition, processed, retried: retries.length, dlq: dlq.length },
          "wa-webhook batch had failures",
        );
      }
    },
  });

  log.info(`Kafka consumer subscribed to ${WA_WEBHOOK_TOPIC} (group ${GROUP_ID})`);
  return { consumer, producer };
}
