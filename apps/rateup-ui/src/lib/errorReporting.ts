type Sentry = typeof import("./sentryBrowser.ts");

const DSN =
  "https://45e833b32b687745181d312ce71aaa60@o4508794356432896.ingest.de.sentry.io/4511626235347024";

let sdk: Promise<Sentry> | undefined;
const early: unknown[] = [];

const bufferError = (event: ErrorEvent) => early.push(event.error ?? event.message);
const bufferRejection = (event: PromiseRejectionEvent) => early.push(event.reason);

function loadSentry() {
  sdk ??= import("./sentryBrowser.ts").then((Sentry) => {
    // Hand over to the SDK's own global handlers before replaying, or an error thrown in
    // between would be reported twice.
    removeEventListener("error", bufferError);
    removeEventListener("unhandledrejection", bufferRejection);
    Sentry.init({ dsn: DSN, dataCollection: {} });
    for (const error of early.splice(0)) Sentry.captureException(error);
    return Sentry;
  });
  return sdk;
}

/**
 * Starts error reporting without putting the SDK on the critical path: uncaught
 * errors are queued from the first line of the client, and Sentry loads once the page has
 * finished loading and the browser is idle, then reports the queue.
 */
export function startErrorReporting() {
  addEventListener("error", bufferError);
  addEventListener("unhandledrejection", bufferRejection);

  const whenIdle = () =>
    "requestIdleCallback" in globalThis
      ? requestIdleCallback(() => void loadSentry(), { timeout: 4000 })
      : setTimeout(() => void loadSentry(), 1500);

  if (document.readyState === "complete") whenIdle();
  else addEventListener("load", whenIdle, { once: true });
}

/** `captureException` for browser code that runs before or after the SDK has loaded. The server
    reports through its own instrumentation (`instrument.server.mjs`). */
export function reportError(error: unknown, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void loadSentry().then((Sentry) => Sentry.captureException(error, extra ? { extra } : undefined));
}
