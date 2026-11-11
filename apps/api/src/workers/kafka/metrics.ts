// Consumer health and lag metrics for the kafka service.
//
// Lag is computed at scrape time from two admin calls — the topic's high
// watermarks (`fetchTopicOffsets`) and the group's committed offsets
// (`fetchOffsets`) — so it is the group's true lag, the same number on every
// replica (take `max`, not `sum`). Results are cached briefly so a scrape storm
// cannot turn into a broker request storm.
import type { Admin, Consumer, Kafka } from "kafkajs";
import { Gauge } from "@prometheus-io/client";

import { log } from "../shared/logger.js";
import type { HealthCheckResult } from "../shared/healthServer.js";
import { metricsRegistry } from "../../utils/metrics.js";

/**
 * Tracks whether a consumer is connected and in its group. kafkajs restarts a
 * crashed consumer on its own when the error is retriable (`restart: true`), so
 * only a crash it will not recover from, a stop, or a disconnect marks it down.
 * Starts as connected because `startStatusConsumer` returns after `connect()`.
 */
export function trackConsumerConnection(consumer: Pick<Consumer, "on" | "events">) {
  let connected = true;
  let lastError: string | undefined;
  consumer.on(consumer.events.CONNECT, () => {
    connected = true;
  });
  consumer.on(consumer.events.GROUP_JOIN, () => {
    connected = true;
    lastError = undefined;
  });
  consumer.on(consumer.events.DISCONNECT, () => {
    connected = false;
  });
  consumer.on(consumer.events.STOP, () => {
    connected = false;
  });
  consumer.on(consumer.events.CRASH, (event) => {
    lastError = event.payload.error?.message;
    if (!event.payload.restart) connected = false;
  });
  return {
    isConnected: () => connected,
    lastError: () => lastError,
  };
}

export function kafkaHealthCheck(
  trackers: Array<{ name: string; isConnected(): boolean; lastError(): string | undefined }>,
): () => Promise<HealthCheckResult> {
  return async () => {
    const checks: Record<string, boolean | string> = {};
    for (const t of trackers) {
      checks[t.name] = t.isConnected() ? true : (t.lastError() ?? "disconnected");
    }
    return { ok: trackers.every((t) => t.isConnected()), checks };
  };
}

export interface PartitionLag {
  partition: number;
  lag: number;
}

/**
 * Lag per partition: high watermark minus the committed offset. A partition the
 * group has never committed (`-1`) is left out rather than guessed: the
 * consumer starts from the latest offset (`fromBeginning: false`), so counting
 * the whole retained log as lag would be wrong.
 */
export function computeLag(
  topicOffsets: Array<{ partition: number; high: string }>,
  committed: Array<{ partition: number; offset: string }>,
): PartitionLag[] {
  const byPartition = new Map(committed.map((c) => [c.partition, Number(c.offset)]));
  const out: PartitionLag[] = [];
  for (const { partition, high } of topicOffsets) {
    const offset = byPartition.get(partition);
    if (offset === undefined || offset < 0) continue;
    out.push({ partition, lag: Math.max(Number(high) - offset, 0) });
  }
  return out;
}

const LAG_CACHE_MS = 10_000;

export function registerKafkaMetrics(
  kafka: Kafka,
  groups: Array<{ groupId: string; topic: string }>,
) {
  let admin: Admin | undefined;
  let adminReady: Promise<void> | undefined;
  const cache = new Map<string, { at: number; lags: PartitionLag[] }>();

  const getAdmin = async () => {
    if (!admin) {
      admin = kafka.admin();
      adminReady = admin.connect().catch((err) => {
        admin = undefined;
        adminReady = undefined;
        throw err;
      });
    }
    await adminReady;
    return admin;
  };

  new Gauge({
    name: "kafka_consumer_lag",
    help: "Messages behind the high watermark, per consumer group and partition",
    labelNames: ["group", "topic", "partition"] as const,
    registers: [metricsRegistry],
    async collect() {
      this.reset();
      for (const { groupId, topic } of groups) {
        const key = `${groupId}/${topic}`;
        let entry = cache.get(key);
        if (!entry || Date.now() - entry.at > LAG_CACHE_MS) {
          try {
            const a = await getAdmin();
            const [topicOffsets, groupOffsets] = await Promise.all([
              a.fetchTopicOffsets(topic),
              a.fetchOffsets({ groupId, topics: [topic] }),
            ]);
            const committed = groupOffsets.find((t) => t.topic === topic)?.partitions ?? [];
            entry = { at: Date.now(), lags: computeLag(topicOffsets, committed) };
            cache.set(key, entry);
          } catch (err) {
            log.warn({ err, groupId, topic }, "Could not read consumer lag for metrics");
            continue;
          }
        }
        for (const { partition, lag } of entry.lags) {
          this.set({ group: groupId, topic, partition: String(partition) }, lag);
        }
      }
    },
  });

  return {
    async close() {
      if (admin) await admin.disconnect().catch(() => {});
    },
  };
}
