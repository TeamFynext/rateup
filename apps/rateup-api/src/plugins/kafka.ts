import { FastifyInstance } from "fastify";
import { Kafka, Partitioners, Producer } from "kafkajs";
import { log } from "../utils/logger.js";

declare module "fastify" {
  interface FastifyInstance {
    kafka: {
      producer: Producer;
    };
  }
}

if (!process.env.KAFKA_URL) {
  throw new Error("KAFKA_URL environment variable is required but not set");
}

const kafka = new Kafka({ brokers: [process.env.KAFKA_URL] });
export const producer: Producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});

async function connectWithRetry(retries = 5, delayMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await producer.connect();
      return;
    } catch (error) {
      log.error(error, `Failed to connect Kafka producer (attempt ${attempt}/${retries})`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  log.error("Kafka producer failed to connect after all retries; continuing without it");
}

export async function registerKafka(server: FastifyInstance) {
  await connectWithRetry();

  server.decorate("kafka", { producer });

  server.addHook("onClose", async () => {
    await producer.disconnect();
  });
}
