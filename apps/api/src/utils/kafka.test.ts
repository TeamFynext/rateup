import { describe, expect, it, vi } from "vite-plus/test";

import {
  KAFKA_NUM_PARTITIONS,
  ensureKafkaTopics,
  kafkaProducerConfig,
  kafkaReplicationFactor,
  kafkaTopicSpecs,
  parseKafkaBrokers,
} from "./kafka.js";

describe("parseKafkaBrokers", () => {
  it("splits a comma-separated KAFKA_BROKERS, trimming and de-duplicating", () => {
    expect(parseKafkaBrokers({ KAFKA_BROKERS: " a:9092, b:9092 ,,a:9092 " })).toEqual([
      "a:9092",
      "b:9092",
    ]);
  });

  it("takes a single broker", () => {
    expect(parseKafkaBrokers({ KAFKA_BROKERS: "localhost:9092" })).toEqual(["localhost:9092"]);
  });

  it("throws when it is unset or empty", () => {
    expect(() => parseKafkaBrokers({})).toThrow(/KAFKA_BROKERS/);
    expect(() => parseKafkaBrokers({ KAFKA_BROKERS: " , " })).toThrow(/KAFKA_BROKERS/);
  });
});

describe("kafkaReplicationFactor", () => {
  it("defaults to 1 and ignores nonsense", () => {
    expect(kafkaReplicationFactor({})).toBe(1);
    expect(kafkaReplicationFactor({ KAFKA_REPLICATION_FACTOR: "0" })).toBe(1);
    expect(kafkaReplicationFactor({ KAFKA_REPLICATION_FACTOR: "abc" })).toBe(1);
    expect(kafkaReplicationFactor({ KAFKA_REPLICATION_FACTOR: "3" })).toBe(3);
  });
});

describe("kafkaProducerConfig", () => {
  it("is idempotent by default, within kafkajs' requirements", () => {
    const config = kafkaProducerConfig({});
    expect(config.idempotent).toBe(true);
    expect(config.maxInFlightRequests).toBeLessThanOrEqual(5);
    expect(config.retry?.retries).toBeGreaterThan(0);
  });

  it("can be turned off", () => {
    expect(kafkaProducerConfig({ KAFKA_IDEMPOTENT: "false" }).idempotent).toBeUndefined();
  });

  it("stays on for a value that is not true or false", () => {
    expect(kafkaProducerConfig({ KAFKA_IDEMPOTENT: "0" }).idempotent).toBe(true);
  });
});

describe("kafkaTopicSpecs", () => {
  it("covers both topics and their dead-letter topics", () => {
    const specs = kafkaTopicSpecs({ KAFKA_REPLICATION_FACTOR: "3" });
    expect(specs.map((s) => s.topic)).toEqual([
      "status-events",
      "status-events-dlq",
      "wa-webhooks",
      "wa-webhooks-dlq",
    ]);
    for (const spec of specs) {
      expect(spec.numPartitions).toBe(KAFKA_NUM_PARTITIONS);
      expect(spec.replicationFactor).toBe(3);
    }
  });
});

describe("ensureKafkaTopics", () => {
  const specs = kafkaTopicSpecs({});

  function fakeAdmin(existing: Record<string, number>) {
    return {
      listTopics: vi.fn(async () => Object.keys(existing)),
      createTopics: vi.fn(async () => true),
      fetchTopicMetadata: vi.fn(async ({ topics }: { topics: string[] }) => ({
        topics: topics.map((name) => ({
          name,
          partitions: Array.from({ length: existing[name] }, (_, i) => ({ partitionId: i })),
        })),
      })),
    };
  }

  it("creates only the missing topics", async () => {
    const admin = fakeAdmin({ "status-events": 12 });
    const result = await ensureKafkaTopics(admin as any, specs);

    expect(admin.createTopics).toHaveBeenCalledTimes(1);
    const created = (admin.createTopics.mock.calls[0] as any)[0].topics.map((t: any) => t.topic);
    expect(created).toEqual(["status-events-dlq", "wa-webhooks", "wa-webhooks-dlq"]);
    expect(result.created).toEqual(created);
    expect(result.underPartitioned).toEqual([]);
  });

  it("does nothing when every topic exists", async () => {
    const admin = fakeAdmin(Object.fromEntries(specs.map((s) => [s.topic, 12])));
    const result = await ensureKafkaTopics(admin as any, specs);
    expect(admin.createTopics).not.toHaveBeenCalled();
    expect(result.created).toEqual([]);
  });

  it("reports, and does not fail on, a topic with fewer partitions", async () => {
    const admin = fakeAdmin({ "status-events": 1, "status-events-dlq": 12 });
    const result = await ensureKafkaTopics(admin as any, specs);
    expect(result.underPartitioned).toEqual([{ topic: "status-events", partitions: 1 }]);
  });
});
