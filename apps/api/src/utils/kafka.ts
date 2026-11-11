// Kafka client configuration shared by the API (producer) and both worker
// services. Kept free of side effects — nothing here connects at import — so the
// API plugin, the kafka service and the tests can all build on it.
import { Kafka, Partitioners, type Admin, type ITopicConfig, type ProducerConfig } from "kafkajs";

import { log } from "./logger.js";
import { envFlag } from "./envFlag.js";

export const STATUS_EVENTS_TOPIC = "status-events";
export const WA_WEBHOOKS_TOPIC = "wa-webhooks";

/** Dead-letter topic for `topic` — the `<topic>-dlq` naming `status-events-dlq` set. */
export const dlqTopic = (topic: string) => `${topic}-dlq`;

export const STATUS_EVENTS_DLQ_TOPIC = dlqTopic(STATUS_EVENTS_TOPIC);
export const WA_WEBHOOKS_DLQ_TOPIC = dlqTopic(WA_WEBHOOKS_TOPIC);

/**
 * Partitions every provisioned topic is created with. The `kafka` service scales
 * up to this many replicas per consumer group; beyond it extra replicas sit idle.
 */
export const KAFKA_NUM_PARTITIONS = 12;

type Env = Record<string, string | undefined>;

/** Broker list from `KAFKA_BROKERS`: one `host:port`, or several separated by commas. */
export function parseKafkaBrokers(env: Env = process.env): string[] {
  const raw = env.KAFKA_BROKERS?.trim() ?? "";
  const brokers = [
    ...new Set(
      raw
        .split(",")
        .map((broker) => broker.trim())
        .filter(Boolean),
    ),
  ];
  if (!brokers.length) {
    throw new Error("KAFKA_BROKERS environment variable is required but not set");
  }
  return brokers;
}

/** Replication factor for provisioned topics; must not exceed the broker count. */
export function kafkaReplicationFactor(env: Env = process.env): number {
  const parsed = Number.parseInt(env.KAFKA_REPLICATION_FACTOR ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function createKafkaClient(env: Env = process.env): Kafka {
  return new Kafka({ brokers: parseKafkaBrokers(env) });
}

/**
 * Producer settings every producer in this repo uses.
 *
 * Idempotent by default, so a produce request that kafkajs retries after a lost
 * ack is not written twice. kafkajs' requirements for that: `acks: -1` on every
 * send (its default — nothing here overrides it), retries > 0, and at most 5
 * requests in flight. kafkajs also serialises produce requests per broker behind
 * a mutex when idempotence is on, so a producer far from its brokers trades
 * throughput for it; `KAFKA_IDEMPOTENT=false` turns it off.
 *
 * Retries are bounded on purpose. kafkajs defaults an idempotent producer to
 * MAX_SAFE_INTEGER retries, which turns a broker outage into `send()` calls that
 * never settle — a webhook request held open forever instead of failing. Five
 * matches the non-idempotent default (~10s of backoff); kafkajs logs a one-off
 * warning that limiting retries "may invalidate EoS guarantees", which is the
 * trade being made.
 */
export function kafkaProducerConfig(env: Env = process.env): ProducerConfig {
  const idempotent = envFlag("KAFKA_IDEMPOTENT", true, env);
  return {
    createPartitioner: Partitioners.DefaultPartitioner,
    ...(idempotent ? { idempotent: true, maxInFlightRequests: 5, retry: { retries: 5 } } : {}),
  };
}

/** The topics this repo produces to or consumes from, as they should be created. */
export function kafkaTopicSpecs(env: Env = process.env): ITopicConfig[] {
  const replicationFactor = kafkaReplicationFactor(env);
  return [
    STATUS_EVENTS_TOPIC,
    STATUS_EVENTS_DLQ_TOPIC,
    WA_WEBHOOKS_TOPIC,
    WA_WEBHOOKS_DLQ_TOPIC,
  ].map((topic) => ({ topic, numPartitions: KAFKA_NUM_PARTITIONS, replicationFactor }));
}

export interface EnsureTopicsResult {
  created: string[];
  /** Topics that already existed with fewer partitions than the spec asks for. */
  underPartitioned: { topic: string; partitions: number }[];
}

/**
 * Create any missing topic in `specs`; leave existing ones alone.
 *
 * Idempotent and safe to race: every replica of every service calls this at
 * boot, and a topic another replica created in between is not an error.
 *
 * An existing topic with fewer partitions is reported, not grown. Adding
 * partitions remaps keys to partitions, so for a moment a message's later
 * statuses can be consumed ahead of its earlier ones on a different partition —
 * that is an operator's call (`kafka-topics.sh --alter --partitions`), not a
 * side effect of a deploy.
 */
export async function ensureKafkaTopics(
  admin: Pick<Admin, "listTopics" | "createTopics" | "fetchTopicMetadata">,
  specs: ITopicConfig[],
): Promise<EnsureTopicsResult> {
  const existing = new Set(await admin.listTopics());
  const missing = specs.filter((spec) => !existing.has(spec.topic));
  const present = specs.filter((spec) => existing.has(spec.topic));

  if (missing.length) {
    // Resolves false (rather than throwing) when every topic already exists,
    // which is the race with another replica.
    await admin.createTopics({ topics: missing, waitForLeaders: true });
  }

  const underPartitioned: EnsureTopicsResult["underPartitioned"] = [];
  if (present.length) {
    const { topics } = await admin.fetchTopicMetadata({ topics: present.map((s) => s.topic) });
    for (const meta of topics) {
      const wanted = present.find((s) => s.topic === meta.name)?.numPartitions ?? 0;
      if (meta.partitions.length < wanted) {
        underPartitioned.push({ topic: meta.name, partitions: meta.partitions.length });
      }
    }
  }

  return { created: missing.map((s) => s.topic), underPartitioned };
}

let provisioning: Promise<void> | null = null;

/**
 * Provision the topics once per process, logging rather than throwing.
 *
 * Without this the brokers auto-create a topic on first use with the broker
 * default of one partition, which caps the `kafka` service at one useful
 * replica. A failure here is logged and not fatal: the caller's own connect is
 * what decides whether the process can run without Kafka.
 */
export function provisionKafkaTopics(kafka: Kafka, env: Env = process.env): Promise<void> {
  provisioning ??= (async () => {
    const admin = kafka.admin();
    try {
      await admin.connect();
      const { created, underPartitioned } = await ensureKafkaTopics(admin, kafkaTopicSpecs(env));
      if (created.length) log.info(`Created Kafka topics: ${created.join(", ")}`);
      for (const { topic, partitions } of underPartitioned) {
        log.warn(
          `Kafka topic "${topic}" has ${partitions} partition(s), fewer than ${KAFKA_NUM_PARTITIONS}; ` +
            "consumers beyond that count sit idle. Grow it deliberately with kafka-topics.sh --alter.",
        );
      }
    } catch (err) {
      // Let a later caller try again rather than caching the failure.
      provisioning = null;
      log.error(err, "Failed to provision Kafka topics");
    } finally {
      await admin.disconnect().catch(() => {});
    }
  })();
  return provisioning;
}
