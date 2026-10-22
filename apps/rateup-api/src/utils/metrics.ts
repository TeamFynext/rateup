import { collectDefaultMetrics, Counter, Histogram, register } from "prom-client";

/**
 * Prometheus metrics shared by every service.
 *
 * Everything registers on prom-client's default registry, so whichever server
 * exposes `/metrics` in a process (the worker health server, or the API's
 * `/api/health/metrics`) serves all of it. Metrics defined here are cheap to
 * import from anywhere — a counter that is never scraped costs a few bytes.
 */
export const metricsRegistry = register;

let defaultMetricsStarted = false;

/**
 * Starts prom-client's process metrics (CPU, memory, event-loop lag, GC) and
 * stamps every series with the service name, so the three Railway services can
 * share one dashboard. Idempotent.
 */
export function initProcessMetrics(service: "api" | "bullmq" | "kafka") {
  if (defaultMetricsStarted) return;
  defaultMetricsStarted = true;
  metricsRegistry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: metricsRegistry });
}

/**
 * Wall-clock time of the Graph call in `sendMetaMessage` — the HTTP request to
 * Meta only, not the plan checks before it or the store after it. Buckets run
 * from a fast 50ms to the axios retry budget.
 */
export const metaSendDuration = new Histogram({
  name: "meta_send_duration_seconds",
  help: "Latency of the Meta Graph send call",
  labelNames: ["platform", "outcome"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
});

/**
 * Meta rejections by Graph error code and by what that code means for a retry
 * (`classifyWaFailure`). `code` is "none" when the error carried no code.
 */
export const metaSendErrors = new Counter({
  name: "meta_send_errors_total",
  help: "Meta send failures by Graph error code and failure class",
  labelNames: ["platform", "code", "class"] as const,
});
