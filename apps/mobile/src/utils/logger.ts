/**
 * The app's only route to `console`.
 *
 * Release builds write nothing: anything sent to `console` on Android lands in logcat,
 * which other tooling on the device (and `adb`) can read, and this app handles session
 * tokens, OAuth tokens and customer messages. Development builds log as before.
 *
 * Errors are reduced to name, code, status and message even in development. An axios
 * error serialises its whole request config, body included, so logging one as-is wrote
 * Google's `access_token`/`id_token` from the sign-in POST straight into the log.
 *
 * Enforced by oxlint's `no-console`, which is switched off for this file only.
 */

type LogArgs = unknown[];

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

/** A one-line summary of an error that carries nothing from the request or response body. */
export function describeError(error: unknown): string {
  if (error === null || typeof error !== "object") return String(error);
  const e = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };
  const name = typeof e.name === "string" ? e.name : "Error";
  const message = typeof e.message === "string" ? e.message : "";
  const details = [
    typeof e.code === "string" || typeof e.code === "number" ? `code=${e.code}` : null,
    typeof e.response?.status === "number" ? `status=${e.response.status}` : null,
  ].filter(Boolean);
  return `${name}: ${message}${details.length ? ` (${details.join(", ")})` : ""}`;
}

const isErrorLike = (value: unknown) =>
  value instanceof Error ||
  (typeof value === "object" &&
    value !== null &&
    ("isAxiosError" in value || ("message" in value && ("code" in value || "stack" in value))));

const sanitize = (args: LogArgs) =>
  args.map((arg) => (isErrorLike(arg) ? describeError(arg) : arg));

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...sanitize(args));
  },
  log: (...args: LogArgs) => {
    if (isDev) console.log(...sanitize(args));
  },
  info: (...args: LogArgs) => {
    if (isDev) console.info(...sanitize(args));
  },
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...sanitize(args));
  },
  error: (...args: LogArgs) => {
    if (isDev) console.error(...sanitize(args));
  },
};
