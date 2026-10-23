import { WA_TRANSPORT_ERROR_CODE } from "./waRetryableErrors.js";

/**
 * Node/undici socket-level failures. An axios error carrying one of these never
 * got an HTTP response, so there is no Graph payload to read and no verdict from
 * Meta at all — the send simply did not happen.
 */
const TRANSPORT_ERROR_CODES: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EPROTO",
  "ETIMEDOUT",
  "ERR_CANCELED",
  "ERR_NETWORK",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

/** Whether a thrown value is a transport failure rather than a Meta rejection. */
function isTransportError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  // Duck-typed rather than `axios.isAxiosError`, to keep this module importable
  // from `workers/shared/`, which has no axios of its own.
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && TRANSPORT_ERROR_CODES.has(code);
}

/**
 * Transport failures after which nobody knows whether Meta acted on the
 * request: the client stopped waiting (a timeout) or gave up (an abort), not
 * the network refusing to connect. Retrying one of these is how a recipient
 * gets the same message twice.
 */
const OUTCOME_UNKNOWN_TRANSPORT_CODES: ReadonlySet<string> = new Set([
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_CANCELED",
]);

/** Whether a failed send may in fact have been delivered. */
export function isSendOutcomeUnknown(detail: WaGraphApiErrorDetail | undefined): boolean {
  const code = detail?.transportCode;
  return typeof code === "string" && OUTCOME_UNKNOWN_TRANSPORT_CODES.has(code);
}

/**
 * The HTTP status a thrown Graph failure carried, when it got that far. Set by
 * `callMetaApi` on both `GraphApiError` and `MetaHttpError`; duck-typed for the
 * same reason as `isTransportError`.
 */
function httpStatusOf(error: unknown): number | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/**
 * The one way a WhatsApp/Graph failure is turned into something storable.
 *
 * Meta returns failures as `{ error: {...} }`; anything else (DNS, timeout, a
 * thrown Error) has no Graph payload and is stored as a message instead, so the
 * shape on `WaMessage.logs` is the same either way and readers never branch.
 *
 * A transport failure is given `WA_TRANSPORT_ERROR_CODE` so it is classified
 * rather than filed as "reason not recorded". Without a code it read as UNKNOWN,
 * which is never retried — so a campaign that could not reach Meta at all marked
 * every recipient permanently failed and completed.
 *
 * There is no second home for this: the WaLogs table that used to hold a
 * parallel copy is gone, and `WaMessage.logs` / `WaMessage.errorMessage` are
 * where every reader looks.
 */
export function graphApiErrorDetail(error: unknown): WaGraphApiErrorDetail {
  const httpStatus = httpStatusOf(error);
  if (error !== null && typeof error === "object" && "error" in error) {
    const detail = (error as { error?: WaGraphApiErrorDetail }).error;
    if (detail) return httpStatus === undefined ? detail : { ...detail, httpStatus };
  }
  // A response with no Graph body — an HTML 502, an empty 429. The status is
  // all there is to classify it by; without it this read as UNKNOWN, which is
  // permanent.
  if (httpStatus !== undefined && error instanceof Error) {
    return { message: error.message, type: error.name, httpStatus };
  }
  if (isTransportError(error)) {
    const { message, name, code } = error as { message?: string; name?: string; code?: string };
    return {
      message: message ?? "Could not reach WhatsApp",
      type: name ?? "TransportError",
      code: WA_TRANSPORT_ERROR_CODE,
      transportCode: code,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, type: error.name };
  }
  return { message: "Network or unknown error" };
}
