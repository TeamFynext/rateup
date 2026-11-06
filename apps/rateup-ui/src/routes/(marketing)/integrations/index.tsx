import { createFileRoute } from "@tanstack/react-router";

import IntegrationsPage from "@/components/products/landing/IntegrationsPage";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { INTEGRATIONS, integrationPath } from "@/config/integrations.ts";
import { breadcrumbList, graph, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { integrationsMarkdown } from "@/markdown/integrations";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/integrations";

const jsonLd = graph(
  {
    "@type": "ItemList",
    "@id": `${BASE_URL}${PATH}#integrations`,
    name: "RateUp integrations",
    numberOfItems: INTEGRATIONS.length,
    itemListElement: INTEGRATIONS.map((integration, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${integration.name} WhatsApp integration`,
      description: integration.description,
      // Only the entries with a page get a URL; the rest are named but not linked, which is
      // what the page itself renders.
      url: integration.page ? `${BASE_URL}${integrationPath(integration.slug)}` : undefined,
    })),
  },
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Integrations", path: PATH },
  ]),
  webPage(
    PATH,
    "RateUp Integrations — Shopify, WooCommerce, POS, CRM & Zapier",
    "Connect RateUp to Shopify, WooCommerce, Petpooja, Zoho and 3,000+ apps via Zapier, plus a REST API and outbound webhooks.",
  ),
);

export const Route = createFileRoute("/(marketing)/integrations/")({
  server: {
    middleware: [createMarkdownMiddleware(integrationsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <IntegrationsPage />
    </Layout>
  );
}
