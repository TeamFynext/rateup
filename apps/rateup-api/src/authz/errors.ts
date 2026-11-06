import type { Permission } from "./permissions.js";

/** Why an authz refusal happened; the client picks its message from this. */
export type AuthzDenialReason = "permission" | "scope";

/**
 * Thrown from services and guards. Fastify maps `statusCode` to the reply; the body
 * carries `reason` so the client can tell "ask your admin" from a plan or scope problem.
 */
export class ForbiddenError extends Error {
  statusCode = 403;
  reason: AuthzDenialReason;
  permission?: Permission;

  constructor(message: string, options: { reason: AuthzDenialReason; permission?: Permission }) {
    super(message);
    this.name = "ForbiddenError";
    this.reason = options.reason;
    this.permission = options.permission;
  }

  toBody() {
    return {
      error: "Permissions failed.",
      message: this.message,
      reason: this.reason,
      ...(this.permission ? { permission: this.permission } : {}),
    };
  }
}
