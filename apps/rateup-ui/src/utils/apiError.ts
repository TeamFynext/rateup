/**
 * Narrowing helpers for the untyped errors that reach us from axios and
 * react-query. Callers hand these `unknown` (a caught exception, a react-query
 * `error`, an axios rejection) and get back a safely-typed view.
 */

/** Error body shape the API returns on a failed request. */
export interface ApiErrorData {
  message?: string;
  error?: string;
  displayMessageInClient?: boolean;
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
