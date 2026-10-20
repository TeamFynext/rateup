import type { FastifyRequest } from "fastify";

import { rateLimit, type RateLimitOptions } from "../../utils/rateLimit.js";
import { ExternalApiError } from "./errors.js";

const throwOnLimit = (kind: "rate_limited" | "unavailable") =>
  kind === "rate_limited"
    ? new ExternalApiError(429, "rate_limited", "Too many requests")
    : new ExternalApiError(503, "internal_error", "Temporarily unavailable");

/**
 * `rateLimit` in the partner API's envelope, keyed per org unless told otherwise. Use this
 * rather than `rateLimit` directly anywhere under v1: without `throwOnLimit` a 429 goes out
 * in a shape nothing else on this API uses.
 */
export function externalRateLimit<R extends FastifyRequest = FastifyRequest>(
  options: Omit<RateLimitOptions<R>, "throwOnLimit">,
) {
  return rateLimit<R>({ keyFrom: (r) => r.user?.orgId, ...options, throwOnLimit });
}
