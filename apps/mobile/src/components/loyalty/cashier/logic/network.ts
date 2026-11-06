/**
 * Whether the request never reached the server.
 *
 * This is the only test that decides between queueing and reporting a failure, so it is
 * deliberately narrow: **no response at all**. A 5xx is excluded because the request did
 * arrive and may well have committed — queueing that would risk a double award, which is
 * the outbox's job to prevent rather than to cause. (The drain treats a 5xx on an award as
 * unresolved for the same reason; see `classifyOutcome`.)
 */
export function isUnreachable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const response = (error as { response?: unknown }).response;
  if (response) return false;
  const code = (error as { code?: unknown }).code;
  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    Boolean((error as { request?: unknown }).request)
  );
}

/** The HTTP status a rejected request came back with, if it came back at all. */
export function responseStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === "number" ? status : null;
}
