import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * Staff-console headers on every response: no framing (clickjacking), no indexing. The console
 * used to be served as static files with neither.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

function withSecurityHeaders(response: Response): Response {
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    return response;
  } catch {
    // Some responses carry immutable headers; copy those into a fresh response instead.
    const copy = new Response(response.body, response);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) copy.headers.set(name, value);
    return copy;
  }
}

const securityHeadersMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
  const result = await next();
  const response = withSecurityHeaders(result.response);
  return response === result.response ? result : { ...result, response };
});

export const startInstance = createStart(() => ({
  /**
   * Routes render in the browser only; the server sends just the `<html>` shell. The staff
   * session cookie belongs to the API's origin (api.rateup.app), so this server never sees it:
   * the `_app` guard's `/auth/me` would fail on every server render and bounce to /login.
   */
  defaultSsr: false,
  requestMiddleware: [securityHeadersMiddleware],
}));
