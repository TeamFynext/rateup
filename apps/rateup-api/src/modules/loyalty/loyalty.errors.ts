/**
 * Business failures the loyalty services raise, with a code a caller can branch on.
 *
 * These are ordinary `Error` subclasses carrying the same `.message` the plain `throw new
 * Error(...)` used to, so every internal controller that only ever showed `e.message` keeps
 * working untouched. What is new is `code`: the partner API maps it to a real HTTP status
 * instead of turning "Insufficient points" into a 500, and clients can key on a stable
 * string rather than matching English prose. The mobile cashier's outbox currently does the
 * latter — `ALREADY_DONE` in `cashier/logic/outbox.ts` is a regex over error text, described
 * there as "fragile on purpose rather than by accident".
 *
 * `retryable` answers a different question from the HTTP status: whether sending the same
 * request again could ever succeed. The Shopify worker uses it to decide between burning
 * its five BullMQ attempts and stopping immediately.
 */

export type LoyaltyErrorCode =
  /** No loyalty programme for this org. */
  | "PROGRAM_NOT_FOUND"
  /** The programme exists but is not `active`. */
  | "PROGRAM_NOT_ACTIVE"
  | "MEMBER_NOT_FOUND"
  /** Enrolling someone who is already an active member. */
  | "MEMBER_EXISTS"
  /** The account exists but is suspended/closed, so it may not earn or spend. */
  | "MEMBER_NOT_ACTIVE"
  | "REWARD_NOT_FOUND"
  /** Points cost more than the member holds. `details` carries required/available. */
  | "INSUFFICIENT_POINTS"
  /** The reward's own rules (tier, frequency, location, stock) refused this redemption. */
  | "REDEMPTION_RULES_VIOLATED"
  | "REWARD_OUT_OF_STOCK"
  /** A gift already sitting in this member's wallet. */
  | "REWARD_ALREADY_ASSIGNED"
  | "REWARD_ALREADY_REDEEMED"
  | "VOUCHER_NOT_FOUND"
  /** Redeemed but still waiting on staff approval, so it cannot be handed over yet. */
  | "VOUCHER_NOT_APPROVED"
  | "VOUCHER_ALREADY_USED"
  /** A reward still referenced by live redemptions cannot be deleted. */
  | "REWARD_IN_USE"
  | "INVALID_AMOUNT";

/** Codes where sending the identical request again might succeed. Everything else is terminal. */
const RETRYABLE: ReadonlySet<LoyaltyErrorCode> = new Set<LoyaltyErrorCode>([]);

export class LoyaltyError extends Error {
  readonly code: LoyaltyErrorCode;
  /** Safe to surface to an API caller — never contains ids or internal state. */
  readonly details?: Record<string, unknown>;

  constructor(code: LoyaltyErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "LoyaltyError";
    this.code = code;
    this.details = details;
  }

  /**
   * Whether a retry could ever help. Every current code is a settled fact about the world —
   * a member who does not exist, points that are not there — so none is retryable. The flag
   * exists so callers branch on intent rather than on an ever-growing code list, and so a
   * future transient code is honoured without touching them.
   */
  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }
}

export function isLoyaltyError(e: unknown): e is LoyaltyError {
  return e instanceof LoyaltyError;
}
