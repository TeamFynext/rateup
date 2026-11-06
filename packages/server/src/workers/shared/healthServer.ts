// A minimal HTTP server for the worker services: `/health` for Railway's
// healthcheck and `/metrics` for Prometheus.
//
// Plain `node:http` rather than Fastify — two GET routes do not justify a
// framework, and the worker processes deliberately boot without the API's
// plugin stack. Railway sets `PORT`; locally it defaults per service so the
// API and both workers can run side by side.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { log } from "./logger.js";

export interface HealthCheckResult {
  ok: boolean;
  /** Per-dependency detail, echoed in the response body. */
  checks: Record<string, boolean | string>;
}

export interface HealthServerOptions {
  service: string;
  check: () => Promise<HealthCheckResult>;
  /** A prom-client `Registry`, or anything shaped like its exposition half. */
  registry: { metrics(): Promise<string>; contentType: string };
  /** A check slower than this counts as a failure. */
  checkTimeoutMs?: number;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/** The request handler on its own, so tests can drive it without a socket. */
export function createHealthHandler({
  service,
  check,
  registry,
  checkTimeoutMs = 3_000,
}: HealthServerOptions) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? "/").split("?")[0];
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }
    try {
      if (path === "/health") {
        let result: HealthCheckResult;
        try {
          result = await withTimeout(check(), checkTimeoutMs);
        } catch (err) {
          result = { ok: false, checks: { error: (err as Error)?.message ?? String(err) } };
        }
        sendJson(res, result.ok ? 200 : 503, {
          status: result.ok ? "ok" : "unhealthy",
          service,
          uptimeSeconds: Math.round(process.uptime()),
          checks: result.checks,
        });
        return;
      }
      if (path === "/metrics") {
        const body = await registry.metrics();
        res.writeHead(200, { "content-type": registry.contentType });
        res.end(body);
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (err) {
      log.error({ err, path }, "Health server request failed");
      if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
      else res.end();
    }
  };
}

/**
 * Starts listening on `PORT` (or `defaultPort`). A failure to bind is logged,
 * not fatal: the worker's real job is its queue or topic, and it should keep
 * doing it even if the port is taken — Railway's healthcheck will then flag it.
 */
export function startHealthServer(options: HealthServerOptions & { defaultPort: number }): Server {
  const port = Number.parseInt(process.env.PORT || String(options.defaultPort), 10);
  const handler = createHealthHandler(options);
  const server = createServer((req, res) => {
    void handler(req, res);
  });
  server.on("error", (err) => {
    log.error({ err, port }, `${options.service} health server error`);
  });
  server.listen(port, process.env.HOST || "::", () => {
    log.info(`${options.service} health server listening on :${port} (/health, /metrics)`);
  });
  return server;
}
