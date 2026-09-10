import { FastifyReply, FastifyRequest } from "fastify";
import connection from "./redisConnection.js";
import { log } from "./logger.js";

export interface RateLimitOptions<R extends FastifyRequest = FastifyRequest> {
  /** How many requests one bucket may make inside the window. */
  max: number;
  /** The window, in seconds. */
  windowSeconds: number;
  /** Distinguishes one limiter's counters from another's. */
  key: string;
  /**
   * What a bucket is keyed on. Defaults to the client IP. Return null/undefined to skip
   * this limiter for the request (e.g. a body without the field). Fastify validates the
   * body before preHandlers run, so `request.body` is safe to read here.
   */
  keyFrom?: (request: R) => string | null | undefined;
  /**
   * When Redis is unreachable, refuse (503) instead of letting the request through. Only
   * for routes where an unlimited burst is worse than a short outage — a public signup,
   * say. `RATE_LIMIT_FAIL_CLOSED_DISABLED=true` overrides it in an emergency.
   */
  failClosed?: boolean;
}

/**
 * The client address. Behind a proxy Fastify only trusts `x-forwarded-for` when
 * `trustProxy` is set, so `request.ip` is the right thing to read either way —
 * reading the header directly would let a caller pick their own bucket.
 */
function clientIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

/** Read at call time, not import time, so a test or a hot env change is seen. */
function failClosedDisabled(): boolean {
  return process.env.RATE_LIMIT_FAIL_CLOSED_DISABLED === "true";
}

export function rateLimit<R extends FastifyRequest = FastifyRequest>({
  max,
  windowSeconds,
  key,
  keyFrom,
  failClosed = false,
}: RateLimitOptions<R>) {
  return async function rateLimitPreHandler(request: R, reply: FastifyReply) {
    const discriminator = keyFrom ? keyFrom(request) : clientIp(request);
    if (!discriminator) return;
    const bucket = `ratelimit:${key}:${discriminator}`;

    let count: number;
    try {
      count = await connection.incr(bucket);
      // Only the first request in a window sets the expiry, so the window starts
      // when the window's first request arrives and is not extended by later ones.
      if (count === 1) await connection.expire(bucket, windowSeconds);
    } catch (error) {
      if (failClosed && !failClosedDisabled()) {
        log.error({ err: error, bucket }, "Rate limit check failed; refusing the request");
        return reply.status(503).send({
          success: false,
          message: "Signup temporarily unavailable. Please try again in a few minutes.",
        });
      }
      log.error({ err: error, bucket }, "Rate limit check failed; allowing the request through");
      return;
    }

    if (count > max) {
      log.warn({ bucket, count, max }, "Rate limit exceeded");
      return reply.status(429).send({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }
  };
}
