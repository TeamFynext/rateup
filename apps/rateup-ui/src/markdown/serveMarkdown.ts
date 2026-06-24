// src/markdown/serveMarkdown.ts

import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

type MarkdownSource =
  | string
  | Response
  | ((context: { request: Request }) => string | Response | Promise<string | Response>);

/**
 * Returns TanStack Start middleware that serves markdown when requested.
 * Accepts either a static markdown string or a function that builds markdown dynamically.
 */
export function createMarkdownMiddleware(markdownSource: MarkdownSource) {
  return createMiddleware().server(async ({ next, request }) => {
    const accept = getRequestHeaders().get("accept") ?? "";
    const acceptsMarkdown = /text\/markdown/.test(accept);

    if (!acceptsMarkdown) {
      return next();
    }

    const markdown =
      typeof markdownSource === "function" ? await markdownSource({ request }) : markdownSource;

    if (markdown instanceof Response) {
      return markdown;
    }

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  });
}

// Backward-compatible alias for older imports.
