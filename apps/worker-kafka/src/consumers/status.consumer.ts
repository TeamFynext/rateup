// Ported from message-dispatcher/src/index.ts.
//
// WhatsApp delivery receipts (sent/delivered/read/failed) arrive far faster than
// they can be written one row at a time, so the webhook publishes them to the
// `status-events` topic and this consumer folds each batch into the database in
// one pass via `bulkUpdateStatuses`.
//
// Retry handling is manual rather than leaning on Kafka redelivery: offsets are
// resolved for every message in the batch (so the partition always moves
// forward), and anything `bulkUpdateStatuses` skipped is scheduled to go back on
// the same topic with an incremented `retryCount` — after a delay that grows
// with the count (see statusRetry.ts), since the usual reason for a skip is a
// message row that is about to exist. Past MAX_RETRIES it goes to
// `status-events-dlq` instead. A stuck row therefore can never block the
// partition behind it.
//
// The delay is a BullMQ delayed job (queues/statusRetry.queue.ts), not a timer
// in this process, and every retry and dead letter is durably handed off
// *before* the batch's offsets are resolved. kafkajs commits whatever was
// resolved even when eachBatch throws, so resolving first would let a failed
// hand-off drop the receipt; this way a failure throws with nothing resolved,
// and Kafka redelivers the batch. Redelivery is safe: a status already stored
// is not counted twice (`diffStatusData`), and a retry already scheduled keeps
// its job id.
import { Consumer, Kafka, Producer } from "kafkajs";

import { log } from "@rateup/api/workers/shared/logger.js";
import { bulkUpdateStatuses } from "@rateup/api/workers/shared/whatsapp/index.js";
import {
  enqueueStatusRetries,
  type StatusRetry,
} from "@rateup/api/workers/bullmq/queues/statusRetry.queue.js";
import {
  STATUS_EVENTS_DLQ_TOPIC,
  STATUS_EVENTS_TOPIC,
  kafkaProducerConfig,
} from "@rateup/api/utils/kafka.js";
import { MAX_RETRIES, retryDelayMs } from "./statusRetry.js";
import { createStatusTally } from "./statusTally.js";

export const GROUP_ID = "status-workers";

export interface StatusConsumer {
  consumer: Consumer;
  producer: Producer;
}

export interface SkippedReceiptPlan {
  retries: StatusRetry[];
  dlq: { value: string }[];
}

/**
 * Decide what happens to each receipt `bulkUpdateStatuses` did not apply:
 * another round after `retryDelayMs(retryCount)`, or the dead-letter topic once
 * it has been round MAX_RETRIES times.
 */
export function planSkippedReceipts(
  messages: { id: string; value: any }[],
  processed: ReadonlySet<string>,
  now: Date = new Date(),
): SkippedReceiptPlan {
  const retries: StatusRetry[] = [];
  const dlq: { value: string }[] = [];

  for (const { id, value: element } of messages) {
    if (processed.has(id)) continue;
    const currentRetries = Number(element.retryCount) || 0;

    if (currentRetries + 1 > MAX_RETRIES) {
      dlq.push({
        value: JSON.stringify({
          ...element,
          error: "skipped in bulkUpdateStatuses",
          finalRetryCount: currentRetries,
          droppedAt: now.toISOString(),
        }),
      });
      continue;
    }

    const messageId = String(element.messageId ?? "");
    retries.push({
      // Keyed like the original publish, so a re-published receipt lands on the
      // same partition as the rest of its message's statuses. Without the key it
      // round-robined, and `sent` could be consumed on one partition after
      // `read` on another.
      key: messageId,
      value: JSON.stringify({
        ...element,
        error: "skipped in bulkUpdateStatuses",
        retryCount: currentRetries + 1,
        retriedAt: now.toISOString(),
      }),
      messageId,
      status: String(element.status ?? "unknown").toLowerCase(),
      retryCount: currentRetries + 1,
      delayMs: retryDelayMs(currentRetries),
    });
  }

  return { retries, dlq };
}

export async function startStatusConsumer(kafka: Kafka): Promise<StatusConsumer> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  // Counts what actually reaches this worker, so a campaign's receipts can be
  // reconciled against what the sender emitted. See statusTally.ts.
  const tally = createStatusTally();
  // Only the dead-letter topic is produced to from here now; retries go
  // through BullMQ.
  const producer = kafka.producer(kafkaProducerConfig());

  producer.on(producer.events.DISCONNECT, async () => {
    log.warn("Status producer disconnected, reconnecting...");
    await producer.connect();
  });

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: STATUS_EVENTS_TOPIC, fromBeginning: false });

  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary, heartbeat }) => {
      const messages = batch.messages.map((m) => ({
        id: m.offset,
        value: JSON.parse(m.value!.toString()),
      }));

      // `bulkUpdateStatuses` returns the offsets it applied.
      const processed = new Set(await bulkUpdateStatuses(messages));
      const { retries, dlq } = planSkippedReceipts(messages, processed);

      // Hand-offs first, offsets after — see the header comment. Either of these
      // throwing leaves the batch unresolved, to be redelivered.
      await enqueueStatusRetries(retries);
      if (dlq.length > 0) {
        await producer.send({ topic: STATUS_EVENTS_DLQ_TOPIC, messages: dlq });
      }

      for (const message of batch.messages) {
        resolveOffset(message.offset);
      }
      await heartbeat();

      tally.record(
        messages.map((m) => m.value),
        {
          processed: messages.filter((m) => processed.has(m.id)).length,
          retried: retries.length,
          dlq: dlq.length,
        },
      );

      await commitOffsetsIfNecessary();
    },
  });

  log.info(
    `Kafka consumer subscribed to ${STATUS_EVENTS_TOPIC} (group ${GROUP_ID})` +
      (tally.enabled ? " — status tally on (STATUS_TALLY=0 to silence)" : ""),
  );
  return { consumer, producer };
}
