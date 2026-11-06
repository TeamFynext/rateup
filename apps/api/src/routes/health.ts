import { timingSafeEqual } from "node:crypto";

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { checkKafkaHealth } from "@rateup/server/plugins/kafka.js";
import { metricsRegistry } from "@rateup/server/utils/metrics.js";

/** Constant-time compare, so the token cannot be guessed a byte at a time. */
function tokenMatches(header: string | undefined, token: string): boolean {
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export default async function healthRoutes(server: FastifyInstance) {
  // Liveness, and the path Railway's deploy healthcheck uses (railway.api.json).
  // Deliberately checks nothing beyond "the process answers": Railway only
  // probes it while a deploy goes live, and tying it to Kafka would fail every
  // deploy made during a broker blip while serving HTTP was perfectly possible.
  server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: "pong" });
  });

  // Readiness: whether this replica can do everything it is asked to. Kafka is
  // what WhatsApp status webhooks are published to, so without it receipts are
  // being dropped even though the API looks up. 503 so an uptime monitor pages.
  server.get("/ready", async (request: FastifyRequest, reply: FastifyReply) => {
    const kafka = await checkKafkaHealth();
    return reply
      .status(kafka.ok ? 200 : 503)
      .send({ status: kafka.ok ? "ok" : "unavailable", checks: { kafka } });
  });

  // Prometheus scrape for this API replica. `/api/health/*` is public by prefix
  // and the API has a public domain, so it is off unless METRICS_TOKEN is set
  // and then wants `Authorization: Bearer <token>`. The worker services expose
  // theirs on their own private port instead (workers/shared/healthServer.ts).
  server.get("/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = process.env.METRICS_TOKEN;
    if (!token) return reply.status(404).send({ message: "Not found" });
    if (!tokenMatches(request.headers.authorization, token)) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    const body = await metricsRegistry.metrics();
    return reply.header("content-type", metricsRegistry.contentType).send(body);
  });
}
