import type { FastifyInstance, FastifyRequest } from "fastify";

import { apiUsageOnResponse, flushApiUsage } from "../../modules/apiAccessToken/apiUsage.js";
import { isOrgSuspended, ORG_SUSPENDED_MESSAGE } from "../../modules/org/orgSuspension.js";
import { ExternalApiError, externalErrorHandler } from "./errors.js";
import {
  documentIdempotencyHeader,
  idempotencyOnSend,
  idempotencyPreHandler,
} from "./idempotency.js";
import { externalRateLimit } from "./rateLimit.js";
import { refuseTestKeyOnPaidRoute, requireScope } from "./scopes.js";

/**
 * What every partner API version runs around its own key check, so v1 and v2 differ only in
 * how a request names its org and key. Call it at the top of the version's root plugin, with
 * `authenticate` verifying the key and returning the org's suspension flag when it already
 * knows it (null asks `isOrgSuspended`).
 */
export function registerPartnerHooks(
  server: FastifyInstance,
  {
    prefix,
    authenticate,
  }: {
    /** Where the plugin is mounted; stripped from logged route patterns. */
    prefix: string;
    authenticate: (request: FastifyRequest) => Promise<{ suspended: boolean | null }>;
  },
) {
  // Fastify error handlers are per-encapsulation-context, so this one registration covers
  // every module of the version and leaves the root SuperTokens handler in charge elsewhere.
  server.setErrorHandler(externalErrorHandler);

  // Every write lists the optional Idempotency-Key in the reference.
  server.addHook("onRoute", documentIdempotencyHeader);

  /**
   * Ahead of the key check on purpose. A legacy (pre-SHA-256) v1 key is still verified with
   * a bcrypt compare until its first use re-hashes it, and every miss costs a database read;
   * an unauthenticated caller could otherwise spend both at will by guessing keys.
   */
  server.addHook(
    "preHandler",
    externalRateLimit({
      max: 300,
      windowSeconds: 60,
      key: "externalIp",
      keyFrom: (r) => r.ip || "unknown",
    }),
  );

  server.addHook("preHandler", async (request) => {
    const { suspended } = await authenticate(request);
    const orgId = request.user.orgId;

    // A suspended account's API key stops working too; otherwise an integration would keep
    // running everything the console just switched off.
    if (suspended ?? (await isOrgSuspended(orgId))) {
      throw new ExternalApiError(403, "org_suspended", ORG_SUSPENDED_MESSAGE);
    }

    requireScope(request);
    refuseTestKeyOnPaidRoute(request);
  });

  // One ceiling per org across every module (and both versions); modules hold their
  // expensive routes tighter.
  server.addHook(
    "preHandler",
    externalRateLimit({ max: 1200, windowSeconds: 60, key: "externalOrg" }),
  );

  // After the key and its scopes: a replay must never answer a caller who could not have
  // made the original request.
  server.addHook("preHandler", idempotencyPreHandler);
  server.addHook("onSend", idempotencyOnSend);

  // The per-key usage log, written in batches off the request path.
  server.addHook("onResponse", apiUsageOnResponse(prefix));
  server.addHook("onClose", flushApiUsage);
}
