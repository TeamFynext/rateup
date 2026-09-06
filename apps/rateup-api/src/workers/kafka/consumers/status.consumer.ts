// Ported from message-dispatcher/src/index.ts.
//
// WhatsApp delivery receipts (sent/delivered/read/failed) arrive far faster than
// they can be written one row at a time, so the webhook publishes them to the
// `status-events` topic and this consumer folds each batch into the database in
// one pass via `bulkUpdateStatuses`.
//
// Retry handling is manual rather than leaning on Kafka redelivery: offsets are
// resolved for every message in the batch (so the partition always moves
// forward), and anything `bulkUpdateStatuses` skipped is re-published to the same
// topic with an incremented `retryCount` — after a delay that grows with the
// count (see statusRetry.ts), since the usual reason for a skip is a message row
// that is about to exist. Past MAX_RETRIES it goes to `status-events-dlq`
// instead. A stuck row therefore can never block the partition behind it.
import { Consumer, Kafka, Partitioners, Producer } from "kafkajs";

import { log } from "../../shared/logger.js";
import { bulkUpdateStatuses } from "../../shared/whatsapp/index.js";
import { MAX_RETRIES, retryDelayMs } from "./statusRetry.js";
import { createStatusTally } from "./statusTally.js";

const TOPIC = "status-events";
const DLQ_TOPIC = "status-events-dlq";
const GROUP_ID = "status-workers";

export interface StatusConsumer {
  consumer: Consumer;
  producer: Producer;
  /**
   * Publish every retry still waiting on its delay. Called on shutdown, before
   * the producer disconnects: a held retry exists only in this process, and
   * losing it loses the receipt for good.
   */
  flushRetries(): Promise<void>;
}

export async function startStatusConsumer(kafka: Kafka): Promise<StatusConsumer> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  // Counts what actually reaches this worker, so a campaign's receipts can be
  // reconciled against what the sender emitted. See statusTally.ts.
  const tally = createStatusTally();
  const producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
  });

  producer.on(producer.events.DISCONNECT, async () => {
    log.warn("Status producer disconnected, reconnecting...");
    await producer.connect();
  });

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  // Retries waiting out their delay, keyed by the timer that will send them.
  // Detached from the batch on purpose: `await`ing the delay inside eachBatch
  // would stall the partition behind one missing row, which is the very thing
  // the manual retry scheme exists to prevent.
  const heldRetries = new Map<NodeJS.Timeout, { value: string }[]>();

  const publishRetries = async (messages: { value: string }[]) => {
    try {
      await producer.send({ topic: TOPIC, messages });
    } catch (err) {
      // Nothing else holds a copy: the offsets were committed when the batch was.
      log.error(
        `Failed to re-publish ${messages.length} status retries; those receipts are lost: %o`,
        err,
      );
    }
  };

  const holdRetries = (messages: { value: string }[], retryCount: number) => {
    const timer = setTimeout(() => {
      heldRetries.delete(timer);
      void publishRetries(messages);
    }, retryDelayMs(retryCount));
    heldRetries.set(timer, messages);
  };

  const flushRetries = async () => {
    const pending = [...heldRetries.entries()];
    heldRetries.clear();
    for (const [timer] of pending) clearTimeout(timer);
    const messages = pending.flatMap(([, held]) => held);
    if (messages.length) await publishRetries(messages);
  };

  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary, heartbeat }) => {
      // Grouped by how many times they have been round already, since that is
      // what sets the delay before they go round again.
      const retryMessages = new Map<number, { value: string }[]>();
      const dlqMessages: { value: string }[] = [];
      let retryCount = 0;
      const messages = batch.messages.map((m) => ({
        id: m.offset,
        value: JSON.parse(m.value!.toString()),
      }));

      const skipped = await bulkUpdateStatuses(messages);
      const skippedOffsets = messages.map((b) => b.id).filter((id) => !skipped.includes(id));
      // Set of skipped offsets for fast lookup
      const skippedSet = new Set(skippedOffsets);

      for (const message of batch.messages) {
        const element = JSON.parse(message.value!.toString());
        const currentRetries = element.retryCount || 0;

        // Only retry/DLQ if this offset was skipped
        if (skippedSet.has(message.offset)) {
          if (currentRetries + 1 > MAX_RETRIES) {
            dlqMessages.push({
              value: JSON.stringify({
                ...element,
                error: "skipped in bulkUpdateStatuses",
                finalRetryCount: currentRetries,
                droppedAt: new Date().toISOString(),
              }),
            });
          } else {
            const group = retryMessages.get(currentRetries) ?? [];
            group.push({
              value: JSON.stringify({
                ...element,
                error: "skipped in bulkUpdateStatuses",
                retryCount: currentRetries + 1,
                retriedAt: new Date().toISOString(),
              }),
            });
            retryMessages.set(currentRetries, group);
            retryCount += 1;
          }
        }

        resolveOffset(message.offset);
        await heartbeat();
      }

      for (const [currentRetries, messages] of retryMessages) {
        holdRetries(messages, currentRetries);
      }

      if (dlqMessages.length > 0) {
        try {
          await producer.send({ topic: DLQ_TOPIC, messages: dlqMessages });
        } catch (err) {
          log.error("Failed to send DLQ messages, they will be retried next batch: %o", err);
        }
      }

      tally.record(
        messages.map((m) => m.value),
        {
          processed: messages.length - skippedSet.size,
          retried: retryCount,
          dlq: dlqMessages.length,
        },
      );

      await commitOffsetsIfNecessary();
    },
  });

  log.info(
    `Kafka consumer subscribed to ${TOPIC} (group ${GROUP_ID})` +
      (tally.enabled ? " — status tally on (STATUS_TALLY=0 to silence)" : ""),
  );
  return { consumer, producer, flushRetries };
}
