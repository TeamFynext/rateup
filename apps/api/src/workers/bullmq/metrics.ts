// Queue metrics and the health check for the bullmq service.
//
// Depth is read from Redis at scrape time (`getJobCounts`, a handful of
// ZCARD/LLEN per queue) rather than tracked in process, so every replica
// reports the same, true number — dashboards should take `max` across
// replicas, not `sum`. Completed/failed are counters this replica's workers
// increment, so those *are* summed.
import { Queue, type Worker } from "bullmq";
import type { Redis } from "ioredis";
import { Counter, Gauge } from "@prometheus-io/client";

import { log } from "../shared/logger.js";
import type { HealthCheckResult } from "../shared/healthServer.js";
import { metricsRegistry } from "../../utils/metrics.js";

const DEPTH_STATES = ["waiting", "prioritized", "active", "delayed", "failed"] as const;

export function registerQueueMetrics(workers: Worker[], connection: Redis) {
  const queueNames = [...new Set(workers.map((w) => w.name))].sort();
  // Producer-side handles on the consumed queues, only for reading counts. They
  // share the base connection, so no extra sockets.
  const queues = queueNames.map((name) => new Queue(name, { connection }));

  new Gauge({
    name: "bullmq_queue_jobs",
    help: "Jobs in each BullMQ queue by state, read from Redis at scrape time",
    labelNames: ["queue", "state"] as const,
    registers: [metricsRegistry],
    async collect() {
      this.reset();
      await Promise.all(
        queues.map(async (queue) => {
          try {
            const counts = await queue.getJobCounts(...DEPTH_STATES);
            for (const state of DEPTH_STATES) {
              this.set({ queue: queue.name, state }, counts[state] ?? 0);
            }
          } catch (err) {
            log.warn({ err, queue: queue.name }, "Could not read queue depth for metrics");
          }
        }),
      );
    },
  });

  const completed = new Counter({
    name: "bullmq_jobs_completed_total",
    help: "Jobs completed by this replica's workers",
    labelNames: ["queue"] as const,
    registers: [metricsRegistry],
  });
  const failed = new Counter({
    name: "bullmq_jobs_failed_total",
    help: "Job attempts that failed on this replica's workers (each retry counts)",
    labelNames: ["queue"] as const,
    registers: [metricsRegistry],
  });

  for (const worker of workers) {
    completed.inc({ queue: worker.name }, 0);
    failed.inc({ queue: worker.name }, 0);
    worker.on("completed", () => completed.inc({ queue: worker.name }));
    worker.on("failed", () => failed.inc({ queue: worker.name }));
  }

  return { queueNames };
}

/** Healthy while Redis answers; worker state is reported, not judged. */
export function bullmqHealthCheck(
  connection: Pick<Redis, "ping">,
  workers: Pick<Worker, "isRunning">[],
): () => Promise<HealthCheckResult> {
  return async () => {
    let redis: boolean | string;
    try {
      redis = (await connection.ping()) === "PONG";
    } catch (err) {
      redis = (err as Error)?.message ?? "ping failed";
    }
    const running = workers.filter((w) => w.isRunning()).length;
    return {
      ok: redis === true,
      checks: { redis, workersRunning: `${running}/${workers.length}` },
    };
  };
}
