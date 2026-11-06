import { FastifyInstance } from "fastify";
import { Admin, Producer } from "kafkajs";
import { log } from "../utils/logger.js";
import { createKafkaClient, kafkaProducerConfig, provisionKafkaTopics } from "../utils/kafka.js";

declare module "fastify" {
  interface FastifyInstance {
    kafka: {
      producer: Producer;
    };
  }
}

// Throws when neither KAFKA_BROKERS nor KAFKA_URL is set.
const kafka = createKafkaClient();
export const producer: Producer = kafka.producer(kafkaProducerConfig());

let producerConnected = false;
producer.on(producer.events.CONNECT, () => {
  producerConnected = true;
});
producer.on(producer.events.DISCONNECT, () => {
  producerConnected = false;
});

/** Background reconnect after the boot-time retries ran out. */
let reconnectTimer: NodeJS.Timeout | null = null;
let closing = false;
const RECONNECT_INTERVAL_MS = 30_000;

function scheduleReconnect() {
  if (closing || reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await producer.connect();
      log.info("Kafka producer connected after an earlier failure");
      void provisionKafkaTopics(kafka);
    } catch (error) {
      log.error(error, "Kafka producer still cannot connect; retrying in the background");
      scheduleReconnect();
    }
  }, RECONNECT_INTERVAL_MS);
  // Never the thing keeping a process alive.
  reconnectTimer.unref();
}

/**
 * Whether the shared producer is connected right now. Read by callers that must
 * not pretend — the WhatsApp webhook ingress answers Meta 5xx instead of 200
 * when it cannot hand a delivery over — so they can tell "Kafka is down" without
 * waiting out a send timeout.
 */
export function isKafkaProducerConnected() {
  return producerConnected;
}

let reconnecting: Promise<void> | null = null;

/**
 * One immediate reconnect attempt at a time, for a caller that just found the
 * producer down. The 30s background loop above keeps going regardless.
 */
export function reconnectKafkaProducerInBackground() {
  if (producerConnected || reconnecting || closing) return;
  reconnecting = producer
    .connect()
    .then(() => log.info("Kafka producer reconnected"))
    .catch((error) => log.error(error, "Kafka producer reconnect failed"))
    .finally(() => {
      reconnecting = null;
    });
}

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
  // Boot carries on without Kafka — failing the API over it would take down
  // every route that never touches Kafka — but the producer keeps trying, so a
  // broker that comes back is picked up without a redeploy. Until then
  // /api/health/ready reports the API as not ready.
  log.error("Kafka producer failed to connect after all retries; continuing without it");
  scheduleReconnect();
}

/**
 * Connects the shared producer and makes sure the topics exist. Callers that
 * have no Fastify instance — the worker services — use this directly;
 * `registerKafka` layers the decorator on top for the API.
 */
export async function connectKafkaProducer() {
  // Before the first send, so no producer auto-creates a one-partition topic.
  await provisionKafkaTopics(kafka);
  await connectWithRetry();
  return producer;
}

export async function disconnectKafkaProducer() {
  closing = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  await healthAdmin?.disconnect().catch(() => {});
  healthAdmin = null;
  await producer.disconnect();
}

export interface KafkaHealth {
  ok: boolean;
  producerConnected: boolean;
  brokers?: number;
  error?: string;
}

let healthAdmin: Admin | null = null;
let lastHealth: { at: number; result: KafkaHealth } | null = null;
const HEALTH_CACHE_MS = 5_000;
const HEALTH_TIMEOUT_MS = 3_000;

/**
 * Whether this process can reach Kafka right now: the producer is connected and
 * a metadata round-trip to the cluster answers in time. Cached for a few seconds
 * so a monitor polling the endpoint cannot turn into a load on the brokers.
 */
export async function checkKafkaHealth(): Promise<KafkaHealth> {
  if (lastHealth && Date.now() - lastHealth.at < HEALTH_CACHE_MS) return lastHealth.result;

  let result: KafkaHealth;
  let timer: NodeJS.Timeout | undefined;
  try {
    const brokers = await Promise.race([
      (async () => {
        if (!healthAdmin) {
          const admin = kafka.admin();
          await admin.connect();
          healthAdmin = admin;
        }
        const cluster = await healthAdmin.describeCluster();
        return cluster.brokers.length;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Kafka did not answer within ${HEALTH_TIMEOUT_MS}ms`)),
          HEALTH_TIMEOUT_MS,
        );
      }),
    ]);
    result = {
      ok: producerConnected,
      producerConnected,
      brokers,
      ...(producerConnected ? {} : { error: "producer is not connected" }),
    };
  } catch (error) {
    // Start the next check from a fresh connection.
    const admin = healthAdmin;
    healthAdmin = null;
    void admin?.disconnect().catch(() => {});
    result = {
      ok: false,
      producerConnected,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }

  lastHealth = { at: Date.now(), result };
  return result;
}

export async function registerKafka(server: FastifyInstance) {
  await connectKafkaProducer();

  server.decorate("kafka", { producer });

  server.addHook("onClose", async () => {
    await disconnectKafkaProducer();
  });
}
