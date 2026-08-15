import "dotenv/config";

import { Kafka } from "kafkajs";

import { log } from "../../utils/logger.js";
import { startStatusConsumer, type StatusConsumer } from "./consumers/status.consumer.js";

/**
 * Kafka worker service entrypoint — stream consumers only, no HTTP, no BullMQ.
 *
 * Separate from the bullmq service because the two scale on different signals: a
 * consumer's throughput is bounded by its topic partitions, so adding replicas
 * beyond the partition count of `status-events` buys nothing, while BullMQ
 * consumers scale on queue depth. Keeping them apart also means a stuck batch
 * here cannot starve campaign sends over there.
 *
 * Replicas ARE safe to add up to the partition count: every consumer here joins a
 * fixed `groupId`, so Kafka assigns each partition to exactly one member.
 */
async function start() {
  if (!process.env.KAFKA_URL) {
    throw new Error("KAFKA_URL environment variable is required but not set");
  }

  const kafka = new Kafka({ brokers: [process.env.KAFKA_URL] });

  const consumers: StatusConsumer[] = [];
  consumers.push(await startStatusConsumer(kafka));

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
