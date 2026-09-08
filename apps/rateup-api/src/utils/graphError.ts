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
  if (error !== null && typeof error === "object" && "error" in error) {
    const detail = (error as { error?: WaGraphApiErrorDetail }).error;
    if (detail) return detail;
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
