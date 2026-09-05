import { createFileRoute } from "@tanstack/react-router";

import { TOOLS, toolPath } from "@/config/tools.ts";
import { sitemapEntries } from "@/lib/metadata.ts";

/**
 * `/llms.txt` — the convention for telling an LLM crawler what a site is and where its
 * machine-readable content lives, in the same spirit as robots.txt.
 *
 * It is worth having here specifically because the marketing pages already do content
 * negotiation: `createMarkdownMiddleware` returns clean markdown for `Accept: text/markdown`, so
 * every URL below has a text version an agent can read without parsing our HTML. Generated from
 * the same `pageMetadata` registry as `/sitemap.xml` rather than a second hand-written list.
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
        const entries = sitemapEntries();

        const section = (title: string, paths: { path: string; label?: string }[]) =>
          paths.length
            ? `\n## ${title}\n\n${paths
                .map(({ path, label }) => `- [${label ?? path}](${baseUrl}${path})`)
                .join("\n")}\n`
            : "";

        const products = entries
          .filter(({ path }) => path.startsWith("/products/"))
          .map(({ path }) => ({ path }));
        const integrations = entries
          .filter(({ path }) => path.startsWith("/integrations"))
          .map(({ path }) => ({ path }));
        const company = entries
          .filter(
            ({ path }) =>
              !path.startsWith("/products/") && !path.startsWith("/integrations") && path !== "/",
          )
          .map(({ path }) => ({ path }));

        const body = `# RateUp

> RateUp is an AI-powered omnichannel customer engagement platform built on the official WhatsApp
> Business API. It combines a shared inbox, broadcast campaigns, chat automation, feedback and
> survey collection, and a WhatsApp-native loyalty program — so businesses can turn conversations
> into repeat sales without asking customers to install anything.

Every page listed here also serves clean Markdown: request it with \`Accept: text/markdown\`.
${section("Products", products)}${section("Integrations", integrations)}${section(
          "Free tools (no signup)",
          [
            { path: "/tools", label: "/tools — index" },
            ...TOOLS.map((tool) => ({ path: toolPath(tool.slug), label: toolPath(tool.slug) })),
          ],
        )}${section("Company", company)}
## Elsewhere

- [Blog](${baseUrl}/blog)
- [API documentation](https://docs.rateup.app)
- [API catalog](${baseUrl}/.well-known/api-catalog)
- [Sitemap index](${baseUrl}/sitemap_index.xml)
`;

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600",
          },
        });
      },
    },
  },
});
