import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createMiddleware, createStart } from "@tanstack/react-start";

const CANONICAL_HOST = "rateup.app";

/**
 * Canonicalises the URL before anything else runs.
 *
 * Two duplicates were live: `www.rateup.app` served every page with a 200 and no host redirect,
 * and a trailing slash got the router's default **307** (temporary), which does not consolidate
 * link equity the way a 301 does. Both collapse here, in one hop, ahead of Sentry so the
 * redirected request never opens a transaction.
 *
 * Server-function requests are left alone — `/_serverFn` paths are not user-visible URLs and a
 * redirect on them would break the RPC.
 */
const canonicalUrlMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    if (request.method !== "GET" && request.method !== "HEAD") return next();

    const url = new URL(request.url);
    if (url.pathname.startsWith("/_serverFn")) return next();

    // Behind Cloudflare the original host arrives in `x-forwarded-host`; `url.host` is the
    // internal one. The redirect target is a constant, so a spoofed header can only send the
    // spoofer to rateup.app.
    const host = (request.headers.get("x-forwarded-host") ?? url.host).toLowerCase();
    const needsHostFix = host === `www.${CANONICAL_HOST}`;
    const needsSlashFix = url.pathname.length > 1 && url.pathname.endsWith("/");

    if (!needsHostFix && !needsSlashFix) return next();

    const target = new URL(url);
    if (needsHostFix) {
      target.protocol = "https:";
      target.hostname = CANONICAL_HOST;
      // `hostname` leaves any port in place; the canonical origin has none.
      target.port = "";
    }
    if (needsSlashFix) target.pathname = url.pathname.replace(/\/+$/, "");

    return new Response(null, {
      status: 301,
      headers: { Location: target.toString() },
    });
  },
);

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [canonicalUrlMiddleware, sentryGlobalRequestMiddleware],
    functionMiddleware: [sentryGlobalFunctionMiddleware],
  };
});
