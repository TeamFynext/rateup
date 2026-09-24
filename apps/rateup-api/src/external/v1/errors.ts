import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import z from "zod";

import { log } from "../../utils/logger.js";
import { LoyaltyError, type LoyaltyErrorCode } from "../../modules/loyalty/loyalty.errors.js";
import { ApiAuthError } from "../../modules/apiAccessToken/apiAccessToken.auth.js";

/**
 * One error shape for the whole partner API.
 *
 * Before this, three different shapes were in play — `{error}` from the loyalty handlers,
 * `{message, error}` from the token hook, `{message}` from the prefix hook — and, worse,
 * every business failure arrived as a **500 carrying the raw exception text**. "Insufficient
 * points. Required: 500, Available: 320" is a perfectly ordinary thing for a till to be
 * told; answering it with a server error means an integrator cannot tell "you can't do
 * that" from "we broke".
 *
 * So: a machine-readable `code`, an HTTP status that means what it says, and `details`
 * carrying the numbers a caller needs to show the cashier.
 */

export type ExternalErrorCode =
  // 400
  | "validation_failed"
  | "phone_invalid"
  | "card_code_invalid"
  | "member_ref_invalid"
  | "idempotency_key_missing"
  | "idempotency_key_invalid"
  // 401 / 403
  | "unauthorized"
  | "subscription_required"
  | "subscription_expired"
  // 404
  | "org_not_found"
  | "program_not_found"
  | "member_not_found"
  | "reward_not_found"
  | "voucher_not_found"
  | "not_found"
  // …the Meta AI agent's built-in connector, which names things the agent typed
  | "contact_not_found"
  | "label_not_found"
  | "stage_not_found"
  | "team_not_found"
  // 409
  | "member_already_exists"
  | "reward_already_assigned"
  | "reward_already_redeemed"
  | "voucher_already_redeemed"
  | "voucher_not_approved"
  | "reward_in_use"
  | "idempotency_key_reused"
  | "request_in_progress"
  // 422
  | "insufficient_points"
  | "redemption_rules_violated"
  | "reward_out_of_stock"
  | "program_not_active"
  | "member_not_active"
  | "invalid_amount"
  | "no_pipeline"
  | "team_empty"
  // 429 / 5xx
  | "rate_limited"
  | "internal_error";

export class ExternalApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ExternalErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

/** How a domain failure becomes an HTTP answer. */
const LOYALTY_ERROR_MAP: Record<LoyaltyErrorCode, { status: number; code: ExternalErrorCode }> = {
  PROGRAM_NOT_FOUND: { status: 404, code: "program_not_found" },
  PROGRAM_NOT_ACTIVE: { status: 422, code: "program_not_active" },
  MEMBER_NOT_FOUND: { status: 404, code: "member_not_found" },
  MEMBER_EXISTS: { status: 409, code: "member_already_exists" },
  MEMBER_NOT_ACTIVE: { status: 422, code: "member_not_active" },
  REWARD_NOT_FOUND: { status: 404, code: "reward_not_found" },
  // 422, not 400: the request was well-formed and understood, the programme's state
  // refused it. A till retrying the identical call would be told the same thing.
  INSUFFICIENT_POINTS: { status: 422, code: "insufficient_points" },
  REDEMPTION_RULES_VIOLATED: { status: 422, code: "redemption_rules_violated" },
  REWARD_OUT_OF_STOCK: { status: 422, code: "reward_out_of_stock" },
  REWARD_ALREADY_ASSIGNED: { status: 409, code: "reward_already_assigned" },
  REWARD_ALREADY_REDEEMED: { status: 409, code: "reward_already_redeemed" },
  VOUCHER_NOT_FOUND: { status: 404, code: "voucher_not_found" },
  VOUCHER_NOT_APPROVED: { status: 409, code: "voucher_not_approved" },
  VOUCHER_ALREADY_USED: { status: 409, code: "voucher_already_redeemed" },
  REWARD_IN_USE: { status: 409, code: "reward_in_use" },
  INVALID_AMOUNT: { status: 422, code: "invalid_amount" },
};

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

/**
 * Spread into every route's `response` map. Documenting the failures is half of what makes
 * the generated reference usable — an integrator should not have to discover `409
 * voucher_already_redeemed` by causing one in production.
 */
export const externalErrorResponses = {
  400: errorEnvelopeSchema,
  401: errorEnvelopeSchema,
  403: errorEnvelopeSchema,
  404: errorEnvelopeSchema,
  409: errorEnvelopeSchema,
  422: errorEnvelopeSchema,
  429: errorEnvelopeSchema,
  500: errorEnvelopeSchema,
} as const;

function send(
  reply: FastifyReply,
  requestId: string,
  status: number,
  code: ExternalErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  return reply.code(status).send({ error: { code, message, details, requestId } });
}

/**
 * Registered inside the `/api/external/v1` plugin, so it covers every partner module and
 * leaves the root SuperTokens handler in charge everywhere else.
 */
export function externalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id;

  if (hasZodFastifySchemaValidationErrors(error)) {
    return send(reply, requestId, 400, "validation_failed", "Request validation failed", {
      issues: error.validation.map((v) => ({
        path: v.instancePath,
        message: v.message,
      })),
    });
  }

  if (isResponseSerializationError(error)) {
    // A response that does not match its own schema is our bug, and a loud one: it means
    // the contract published in the reference is wrong.
    log.error(
      { err: error, url: request.url, method: request.method },
      "External API response failed its schema",
    );
    return send(reply, requestId, 500, "internal_error", "Something went wrong");
  }

  if (error instanceof ExternalApiError) {
    return send(reply, requestId, error.status, error.code, error.message, error.details);
  }

  if (error instanceof ApiAuthError) {
    const code: ExternalErrorCode =
      error.reason === "org_not_found" ? "org_not_found" : "unauthorized";
    return send(reply, requestId, error.status, code, error.message);
  }

  if (error instanceof LoyaltyError) {
    const mapped = LOYALTY_ERROR_MAP[error.code];
    return send(reply, requestId, mapped.status, mapped.code, error.message, error.details);
  }

  const prismaCode = (error as { code?: string }).code;
  if (prismaCode === "P2002") {
    return send(reply, requestId, 409, "member_already_exists", "That record already exists");
  }
  if (prismaCode === "P2025") {
    return send(reply, requestId, 404, "not_found", "Not found");
  }

  if (error.statusCode === 429) {
    return send(reply, requestId, 429, "rate_limited", "Too many requests");
  }

  // Everything else is ours. The real message goes to the log and a fixed one goes out:
  // an untyped error escaping must be a visible 500 rather than quietly leaking internals,
  // which is what forces the LoyaltyError conversion to stay complete. Deliberately no
  // fallback that sniffs `error.message` for a business failure.
  log.error(
    { err: error, url: request.url, method: request.method, requestId },
    "Unhandled error on the external API",
  );
  return send(reply, requestId, 500, "internal_error", "Something went wrong");
}
