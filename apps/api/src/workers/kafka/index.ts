import "dotenv/config";

import type { Consumer, Producer } from "kafkajs";

import {
  connectKafkaProducer,
  isKafkaProducerConnected,
  producer as sharedProducer,
} from "../../plugins/kafka.js";
import { log } from "../../utils/logger.js";
import {
  createKafkaClient,
  provisionKafkaTopics,
  STATUS_EVENTS_TOPIC,
  WA_WEBHOOKS_TOPIC,
} from "../../utils/kafka.js";
import { initProcessMetrics, metricsRegistry } from "../../utils/metrics.js";
import { statusRetryQueue } from "../bullmq/queues/statusRetry.queue.js";
import { waWebhookRetryQueue } from "../bullmq/queues/waWebhookRetry.queue.js";
import { startHealthServer } from "../shared/healthServer.js";
import { GROUP_ID as STATUS_GROUP_ID, startStatusConsumer } from "./consumers/status.consumer.js";
import {
  GROUP_ID as WA_WEBHOOK_GROUP_ID,
  startWaWebhookConsumer,
} from "./consumers/waWebhook.consumer.js";
import { kafkaHealthCheck, registerKafkaMetrics, trackConsumerConnection } from "./metrics.js";

/**
 * Kafka worker service entrypoint — stream consumers, no BullMQ workers (the
 * webhook handlers do enqueue BullMQ jobs, as producers). Its only HTTP is
 * `/health` (consumers connected) and `/metrics`, on `PORT`.
 *
 * - `status-events` (status.consumer.ts): delivery receipts into the database.
 * - `wa-webhooks` (waWebhook.consumer.ts): every WhatsApp Business webhook
 *   delivery the API accepted — inbound messages, automations, statuses, template
 *   and account events. This one runs the full module graph (Prisma, Redis, the
 *   Meta senders), so this service needs the same environment as `bullmq`.
 *
 * Separate from the bullmq service because the two scale on different signals: a
 * consumer's throughput is bounded by its topic partitions, so adding replicas
 * beyond the partition count of a topic buys nothing for it, while BullMQ
 * consumers scale on queue depth. Keeping them apart also means a stuck batch
 * here cannot starve campaign sends over there.
 *
 * Replicas ARE safe to add up to the partition count: every consumer here joins a
 * fixed `groupId`, so Kafka assigns each partition to exactly one member. Topics
 * are provisioned with KAFKA_NUM_PARTITIONS partitions (utils/kafka.ts); one
 * auto-created by the broker before that would have only one.
 */
async function start() {
  // Throws when neither KAFKA_BROKERS nor KAFKA_URL is set.
  const kafka = createKafkaClient();
  // Before subscribing: a consumer group subscribed to a missing topic would
  // have it auto-created with the broker default of one partition.
  await provisionKafkaTopics(kafka);

  // The webhook handlers publish receipts to `status-events` (and reach other
  // services that publish) through the shared producer, the one the API uses.
  // Unlike the API this service is useless without it, so it does not start.
  await connectKafkaProducer();
  if (!isKafkaProducerConnected()) {
    throw new Error("Shared Kafka producer could not connect");
  }

  initProcessMetrics("kafka");

  const consumers: { consumer: Consumer; producer: Producer }[] = [];
  const statusConsumer = await startStatusConsumer(kafka);
  const waWebhookConsumer = await startWaWebhookConsumer(kafka);
  consumers.push(statusConsumer, waWebhookConsumer);

  // Started once the consumers are connected: until then there is nothing healthy
  // to report, and Railway keeps retrying the healthcheck through startup.
  const statusTracker = trackConsumerConnection(statusConsumer.consumer);
  const waWebhookTracker = trackConsumerConnection(waWebhookConsumer.consumer);
  const kafkaMetrics = registerKafkaMetrics(kafka, [
    { groupId: STATUS_GROUP_ID, topic: STATUS_EVENTS_TOPIC },
    { groupId: WA_WEBHOOK_GROUP_ID, topic: WA_WEBHOOKS_TOPIC },
  ]);
  const healthServer = startHealthServer({
    service: "kafka",
    defaultPort: 3003,
    check: kafkaHealthCheck([
      { name: "statusConsumer", ...statusTracker },
      { name: "waWebhookConsumer", ...waWebhookTracker },
    ]),
    registry: metricsRegistry,
  });

  process.on("unhandledRejection", (reason) => {
    log.error(reason, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    log.error(err, "Uncaught exception");
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Received ${signal}, shutting down kafka worker gracefully`);
    try {
      // Disconnecting the consumer first lets the in-flight batch finish and
      // commit before the group rebalances onto another replica.
      await Promise.all(
        consumers.map(async ({ consumer, producer }) => {
          await consumer.disconnect();
          await producer.disconnect();
        }),
      );
      // Retries are already in Redis by the time an offset is resolved, so
      // there is nothing held in this process to flush.
      await Promise.all([statusRetryQueue.close(), waWebhookRetryQueue.close()]);
      // Last: the batches drained above were still publishing through it.
      await sharedProducer.disconnect();
      await kafkaMetrics.close();
      healthServer.close();
      process.exit(0);
    } catch (err) {
      log.error(err, "Error during kafka worker graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  log.info(`Kafka worker service started (${consumers.length} consumer(s))`);
}

start();

export default start;
