/**
 * The one way a WhatsApp/Graph failure is turned into something storable.
 *
 * Meta returns failures as `{ error: {...} }`; anything else (DNS, timeout, a
 * thrown Error) has no Graph payload and is stored as a message instead, so the
 * shape on `WaMessage.logs` is the same either way and readers never branch.
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
  if (error instanceof Error) {
    return { message: error.message, type: error.name };
  }
  return { message: "Network or unknown error" };
}
