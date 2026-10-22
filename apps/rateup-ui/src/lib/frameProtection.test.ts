import { describe, expect, test } from "vitest";

import { isEmbeddablePath, withFrameDenyHeaders } from "./frameProtection.ts";

describe("isEmbeddablePath", () => {
  test("the embed snippets' targets may be framed", () => {
    expect(isEmbeddablePath("/ws/abc123")).toBe(true);
    expect(isEmbeddablePath("/ws/abc123/end")).toBe(true);
    expect(isEmbeddablePath("/public/survey/xyz")).toBe(true);
    expect(isEmbeddablePath("/public/testimonial/col1")).toBe(true);
  });

  test("everything else is frame-protected", () => {
    expect(isEmbeddablePath("/")).toBe(false);
    expect(isEmbeddablePath("/dashboard")).toBe(false);
    expect(isEmbeddablePath("/admin/orgs")).toBe(false);
    expect(isEmbeddablePath("/cashier")).toBe(false);
    expect(isEmbeddablePath("/wsx")).toBe(false);
    expect(isEmbeddablePath("/public/surveys-admin")).toBe(false);
    expect(isEmbeddablePath("/public/wa/1/redirect")).toBe(false);
  });
});

describe("withFrameDenyHeaders", () => {
  test("sets both headers in place on a mutable response", () => {
    const response = new Response("ok");
    const out = withFrameDenyHeaders(response);
    expect(out).toBe(response);
    expect(out.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(out.headers.get("X-Frame-Options")).toBe("DENY");
  });

  test("copies an immutable response", async () => {
    const response = Response.redirect("https://rateup.app/x", 302);
    const out = withFrameDenyHeaders(response);
    expect(out.status).toBe(302);
    expect(out.headers.get("Location")).toBe("https://rateup.app/x");
    expect(out.headers.get("X-Frame-Options")).toBe("DENY");
  });

  test("leaves a route's own CSP alone", () => {
    const response = new Response("ok", {
      headers: { "Content-Security-Policy": "default-src 'self'" },
    });
    expect(withFrameDenyHeaders(response).headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'",
    );
  });
});
