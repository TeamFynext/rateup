/**
 * Narrowing helpers for the untyped errors that reach us from axios and
 * react-query. Callers hand these `unknown` (a caught exception, a react-query
 * `error`, an axios rejection) and get back a safely-typed view.
 */

/**
 * Why the API refused a request, when it refused with 403.
 *
 * A plan gate and a permission gate are both 403s but they are opposite problems, and
 * telling someone on the Free plan to "contact your super admin" helps nobody. The API
 * sends this so the UI does not have to guess from the status code.
 */
export type AccessDenialReason = "subscription" | "subscription_expired" | "team" | "unknown";

/** Error body shape the API returns on a failed request. */
export interface ApiErrorData {
  message?: string;
  error?: string;
  displayMessageInClient?: boolean;
  /** A machine-readable refusal, e.g. "ORG_SUSPENDED" when RateUp staff suspended the org. */
  code?: string;
  reason?: AccessDenialReason;
  /** The subscription gates that were closed, for a "subscription" denial. */
  missingFeatures?: string[];
}

/** Axios-shaped rejection, as much of it as this app actually reads. */
export interface ApiError {
  message?: string;
  request?: unknown;
  response?: {
    status?: number;
    data?: ApiErrorData | string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Views an unknown rejection as an axios-shaped error. */
export function asApiError(error: unknown): ApiError {
  return isRecord(error) ? (error as ApiError) : {};
}

/**
 * The parsed `response.data` of a failed request, or `undefined` when the body
 * was absent or a bare string.
 */
export function getApiErrorData(error: unknown): ApiErrorData | undefined {
  const data = asApiError(error).response?.data;
  return isRecord(data) ? (data as ApiErrorData) : undefined;
}

/** Best available human-readable message for an unknown rejection. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const apiError = asApiError(error);
  const data = apiError.response?.data;

  if (typeof data === "string") return data;
  if (isRecord(data)) {
    const body = data as ApiErrorData;
    if (body.message) return body.message;
    if (body.error) return body.error;
  }

  return apiError.message || fallback;
}

/**
 * Why a request was refused, or null when it was not an access refusal.
 *
 * Prefers the API's own `reason`. The message fallback is there for API builds that
 * predate it, and for the handful of 403s written by hand in individual controllers —
 * without it those would all read as permission problems again.
 */
export function getAccessDenialReason(error: unknown): AccessDenialReason | null {
  if (asApiError(error).response?.status !== 403) return null;

  const data = getApiErrorData(error);
  if (data?.reason) return data.reason;

  const message = getApiErrorMessage(error, "").toLowerCase();
  if (message.includes("subscription expired")) return "subscription_expired";
  if (message.includes("subscription")) return "subscription";
  if (message.includes("not enabled for your team")) return "team";
  return "unknown";
}

/** True when the refusal is about what the org is paying for, not who the user is. */
export function isPlanDenial(error: unknown): boolean {
  const reason = getAccessDenialReason(error);
  return reason === "subscription" || reason === "subscription_expired";
}
