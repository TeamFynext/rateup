import { FastifyReply, FastifyRequest } from "fastify";
import connection from "./redisConnection.js";
import { log } from "./logger.js";

export interface RateLimitOptions {
  /** How many requests one IP may make inside the window. */
  max: number;
  /** The window, in seconds. */
  windowSeconds: number;
  /** Distinguishes one limiter's counters from another's. */
  key: string;
}

/**
 * The client address. Behind a proxy Fastify only trusts `x-forwarded-for` when
 * `trustProxy` is set, so `request.ip` is the right thing to read either way —
 * reading the header directly would let a caller pick their own bucket.
 */
function clientIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

export function rateLimit({ max, windowSeconds, key }: RateLimitOptions) {
  return async function rateLimitPreHandler(request: FastifyRequest, reply: FastifyReply) {
    const bucket = `ratelimit:${key}:${clientIp(request)}`;

    let count: number;
    try {
      count = await connection.incr(bucket);
      // Only the first request in a window sets the expiry, so the window starts
      // when the window's first request arrives and is not extended by later ones.
      if (count === 1) await connection.expire(bucket, windowSeconds);
    } catch (error) {
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
