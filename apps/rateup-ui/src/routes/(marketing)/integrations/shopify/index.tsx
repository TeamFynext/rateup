import { createFileRoute } from "@tanstack/react-router";

import ShopifyIntegrationPage from "@/components/products/landing/shopify";
import { SHOPIFY_FAQS } from "@/components/products/landing/shopify/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { integrationsMarkdown } from "@/markdown/integrations";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/integrations/shopify";

const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp for Shopify",
    url: `${BASE_URL}${PATH}`,
    description:
      "RateUp's Shopify integration turns store webhooks into WhatsApp messages: order updates, abandoned-checkout recovery with the checkout link, loyalty points on paid orders, and a post-delivery feedback Flow.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Ecommerce Marketing Integration",
    operatingSystem: "Web",
    installUrl: "https://apps.shopify.com/rateup",
    featureList: [
      "One-click install from the Shopify App Store",
      "Store webhooks registered automatically, including the mandatory GDPR webhooks",
      "Eight store events, each with a per-event template and delay",
      "Twenty Shopify fields mappable into approved template variables",
      "Abandoned-checkout recovery with the Checkout Recovery Link variable",
      "Loyalty points awarded on paid orders and revoked on cancellation",
      "Post-delivery rating Flow with Google review routing",
      "Cash-on-delivery confirmation with quick-reply templates",
      "WhatsApp catalog carts via Shopify checkout link or native payment",
    ],
    publisher,
  },
  faqPage(SHOPIFY_FAQS),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: "Shopify", path: PATH },
  ]),
  webPage(
    PATH,
    "Shopify WhatsApp Integration: Orders, Loyalty & Feedback",
    "Connect Shopify to WhatsApp in one click: order updates, abandoned checkout recovery, post-purchase feedback and loyalty points on every paid order.",
  ),
);

export const Route = createFileRoute("/(marketing)/integrations/shopify/")({
  server: {
    middleware: [createMarkdownMiddleware(integrationsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <ShopifyIntegrationPage />
    </Layout>
  );
}
