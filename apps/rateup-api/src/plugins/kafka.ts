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

const kafka = new Kafka({ brokers: [process.env.KAFKA_URL] });
export const producer: Producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});

export async function registerKafka(server: FastifyInstance) {
  try {
    await producer.connect();
  } catch (error) {
    log.error("Failed to connect Kafka producer: %o", error);
  }

  server.decorate("kafka", { producer });

  server.addHook("onClose", async () => {
    await producer.disconnect();
  });
}
