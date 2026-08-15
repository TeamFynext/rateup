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
// topic with an incremented `retryCount`. Past MAX_RETRIES it goes to
// `status-events-dlq` instead. A stuck row therefore can never block the
// partition behind it.
import { Consumer, Kafka, Partitioners, Producer } from "kafkajs";

import { log } from "../../shared/logger.js";
import { bulkUpdateStatuses } from "../../shared/whatsapp/index.js";

const TOPIC = "status-events";
const DLQ_TOPIC = "status-events-dlq";
const GROUP_ID = "status-workers";
const MAX_RETRIES = 15;

export interface StatusConsumer {
  consumer: Consumer;
  producer: Producer;
}

export async function startStatusConsumer(kafka: Kafka): Promise<StatusConsumer> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
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

  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary, heartbeat }) => {
      const retryMessages: { value: string }[] = [];
      const dlqMessages: { value: string }[] = [];
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
            retryMessages.push({
              value: JSON.stringify({
                ...element,
                error: "skipped in bulkUpdateStatuses",
                retryCount: currentRetries + 1,
                retriedAt: new Date().toISOString(),
              }),
            });
          }
        }

        resolveOffset(message.offset);
        await heartbeat();
      }

      if (retryMessages.length > 0) {
        try {
          await producer.send({ topic: TOPIC, messages: retryMessages });
        } catch (err) {
          log.error("Failed to send retry messages, they will be retried next batch: %o", err);
        }
      }

      if (dlqMessages.length > 0) {
        try {
          await producer.send({ topic: DLQ_TOPIC, messages: dlqMessages });
        } catch (err) {
          log.error("Failed to send DLQ messages, they will be retried next batch: %o", err);
        }
      }

      await commitOffsetsIfNecessary();
    },
  });

  log.info(`Kafka consumer subscribed to ${TOPIC} (group ${GROUP_ID})`);
  return { consumer, producer };
}
