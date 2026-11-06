import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, test, vi } from "vitest";

vi.mock("./logger.js", () => ({ log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { createHealthHandler } from "./healthServer.js";
import { bullmqHealthCheck } from "../bullmq/metrics.js";
import { computeLag, kafkaHealthCheck, trackConsumerConnection } from "../kafka/metrics.js";

function call(handler: ReturnType<typeof createHealthHandler>, url: string, method = "GET") {
  const res = {
    status: 0,
    headers: {} as Record<string, string>,
    body: "",
    headersSent: false,
    writeHead(status: number, headers: Record<string, string>) {
      this.status = status;
      this.headers = headers;
      this.headersSent = true;
      return this;
    },
    end(body?: string) {
      this.body = body ?? "";
    },
  };
  return handler({ url, method } as IncomingMessage, res as unknown as ServerResponse).then(
    () => res,
  );
}

const registry = { metrics: async () => "up 1\n", contentType: "text/plain; version=0.0.4" };

describe("worker health server", () => {
  test("200 with the checks when healthy", async () => {
    const handler = createHealthHandler({
      service: "bullmq",
      registry,
      check: async () => ({ ok: true, checks: { redis: true } }),
    });
    const res = await call(handler, "/health");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      status: "ok",
      service: "bullmq",
      checks: { redis: true },
    });
  });

  test("503 when a dependency is down, a check throws, or a check hangs", async () => {
    const down = createHealthHandler({
      service: "kafka",
      registry,
      check: async () => ({ ok: false, checks: { statusConsumer: "disconnected" } }),
    });
    expect((await call(down, "/health")).status).toBe(503);

    const throws = createHealthHandler({
      service: "kafka",
      registry,
      check: async () => {
        throw new Error("boom");
      },
    });
    const res = await call(throws, "/health");
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body).checks.error).toBe("boom");

    const hangs = createHealthHandler({
      service: "kafka",
      registry,
      checkTimeoutMs: 10,
      check: () => new Promise(() => {}),
    });
    expect((await call(hangs, "/health")).status).toBe(503);
  });

  test("serves /metrics from the registry, 404s anything else", async () => {
    const handler = createHealthHandler({
      service: "bullmq",
      registry,
      check: async () => ({ ok: true, checks: {} }),
    });
    const metrics = await call(handler, "/metrics");
    expect(metrics.status).toBe(200);
    expect(metrics.headers["content-type"]).toBe(registry.contentType);
    expect(metrics.body).toBe("up 1\n");

    expect((await call(handler, "/nope")).status).toBe(404);
    expect((await call(handler, "/health", "POST")).status).toBe(405);
  });
});

describe("bullmq health check", () => {
  test("healthy only while Redis answers PONG", async () => {
    const workers = [{ isRunning: () => true }, { isRunning: () => false }];
    await expect(bullmqHealthCheck({ ping: async () => "PONG" }, workers)()).resolves.toEqual({
      ok: true,
      checks: { redis: true, workersRunning: "1/2" },
    });
    const down = await bullmqHealthCheck(
      {
        ping: async () => {
          throw new Error("ECONNREFUSED");
        },
      },
      workers,
    )();
    expect(down).toMatchObject({ ok: false, checks: { redis: "ECONNREFUSED" } });
  });
});

describe("kafka health and lag", () => {
  function fakeConsumer() {
    const handlers = new Map<string, (e: any) => void>();
    const events = {
      CONNECT: "connect",
      GROUP_JOIN: "group_join",
      DISCONNECT: "disconnect",
      STOP: "stop",
      CRASH: "crash",
    };
    return {
      consumer: { events, on: (name: string, fn: (e: any) => void) => handlers.set(name, fn) },
      emit: (name: string, payload: unknown = {}) => handlers.get(name)?.({ payload }),
    };
  }

  test("a retriable crash stays healthy; a fatal one or a disconnect does not", async () => {
    const { consumer, emit } = fakeConsumer();
    const tracker = trackConsumerConnection(consumer as never);
    const check = kafkaHealthCheck([{ name: "status", ...tracker }]);
    expect((await check()).ok).toBe(true);

    emit("crash", { error: new Error("rebalance"), restart: true });
    expect((await check()).ok).toBe(true);

    emit("crash", { error: new Error("fatal"), restart: false });
    expect(await check()).toEqual({ ok: false, checks: { status: "fatal" } });

    emit("group_join");
    expect((await check()).ok).toBe(true);

    emit("disconnect");
    expect((await check()).ok).toBe(false);
  });

  test("lag is high watermark minus committed, skipping never-committed partitions", () => {
    expect(
      computeLag(
        [
          { partition: 0, high: "120" },
          { partition: 1, high: "50" },
          { partition: 2, high: "9" },
        ],
        [
          { partition: 0, offset: "100" },
          { partition: 1, offset: "-1" },
          { partition: 2, offset: "9" },
        ],
      ),
    ).toEqual([
      { partition: 0, lag: 20 },
      { partition: 2, lag: 0 },
    ]);
  });
});
