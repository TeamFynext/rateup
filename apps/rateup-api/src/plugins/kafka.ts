import { FastifyInstance } from "fastify";
import { Kafka, Partitioners, Producer } from "kafkajs";
import fp from "fastify-plugin";

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

async function kafkaPlugin(server: FastifyInstance) {
  await producer.connect();

  server.decorate("kafka", { producer });

  server.addHook("onClose", async () => {
    await producer.disconnect();
  });
}

export const registerKafka = fp(kafkaPlugin);
