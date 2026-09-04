import { createFileRoute } from "@tanstack/react-router";

import ShopifyIntegrationPage, { SHOPIFY_FAQS } from "@/components/products/landing/ShopifyPage";
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
      "RateUp's Shopify integration syncs orders and customers, awards WhatsApp loyalty points on every order, recovers abandoned carts, confirms cash-on-delivery orders and collects post-purchase feedback on WhatsApp.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Ecommerce Marketing Integration",
    operatingSystem: "Web",
    installUrl: "https://apps.shopify.com/rateup",
    featureList: [
      "One-click install from the Shopify App Store",
      "Two-way order and customer sync",
      "Loyalty points awarded on paid orders",
      "Abandoned-cart recovery over WhatsApp",
      "Cash-on-delivery order confirmation",
      "Delivery-triggered post-purchase feedback",
      "Shared inbox with Shopify order history in context",
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
    "Shopify WhatsApp Integration: Loyalty, Feedback & Broadcasts",
    "Install RateUp from the Shopify App Store to sync orders and customers, award loyalty points, recover abandoned carts, confirm COD orders and collect feedback on WhatsApp.",
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
