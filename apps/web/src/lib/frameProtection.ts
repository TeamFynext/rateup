/**
 * Clickjacking protection (audit FE-2). Every page refuses to be framed except the public
 * routes customers are told to embed: the survey iframe snippet (`IFrameModal`, pointing at the
 * `/ws/:shortId` short link or `/public/survey/:id`) and the testimonial wall snippet
 * (`TestimonialShare`, `/public/testimonial/:collectionId`). Those pages hold no session-bound
 * actions, so framing them by a third party is the intended use.
 */
const EMBEDDABLE_PREFIXES = ["/ws", "/public/survey", "/public/testimonial"] as const;

export function isEmbeddablePath(pathname: string): boolean {
  return EMBEDDABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const FRAME_DENY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

/** Returns `response` with the anti-framing headers, copying it if its headers are immutable. */
export function withFrameDenyHeaders(response: Response): Response {
  // Never clobber a policy a route set deliberately.
  if (response.headers.has("Content-Security-Policy")) return response;
  try {
    for (const [name, value] of Object.entries(FRAME_DENY_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  } catch {
    // Headers of e.g. `Response.redirect()` or a proxied fetch are immutable.
    const copy = new Response(response.body, response);
    for (const [name, value] of Object.entries(FRAME_DENY_HEADERS)) {
      copy.headers.set(name, value);
    }
    return copy;
  }
}
